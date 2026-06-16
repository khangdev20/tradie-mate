import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SlideToConfirm } from '../../components/ui/SlideToConfirm'
import { TradieMapView } from '../../components/maps/TradieMapView'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import api from '../../services/apiService'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { useNetworkState } from '../../hooks/useNetworkState'
import { startTracking, stopTracking, getCurrentPosition } from '../../services/location'
import { useHaptics } from '../../hooks/useHaptics'
import { trackEvent } from '../../services/analytics'

export function JobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params
  const { isConnected } = useNetworkState()
  const { addToQueue, queue } = useOfflineQueue()
  const { triggerLight, triggerSuccess } = useHaptics()

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  
  // Map Routing parameters
  const [tradieCoords, setTradieCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [routePolyline, setRoutePolyline] = useState<string | null>(null)
  const [etaMins, setEtaMins] = useState<number | null>(null)
  const [etaStatus, setEtaStatus] = useState<'LIVE' | 'STALE' | 'NO SIGNAL' | 'ROUTE UNAVAILABLE'>('LIVE')

  const loadJob = async () => {
    try {
      setLoading(true)
      // Check if job exists in offline queue
      const offlineJob = queue.find(item => item.action === 'CREATE_JOB' && item.payload.id === jobId)
      if (offlineJob) {
        setJob(offlineJob.payload)
        setNotes(offlineJob.payload.notes || '')
        return
      }

      const res = await api.get(`/jobs/${jobId}`) as any
      if (res && res.success) {
        setJob(res.data)
        setNotes(res.data.notes || '')
        
        // Set fallback coordinates until GPS resolves
        const destLat = parseFloat(res.data.lat) || -27.4698
        const destLng = parseFloat(res.data.lng) || 153.0251
        setTradieCoords((prev) => prev ?? { latitude: destLat + 0.015, longitude: destLng - 0.015 })
      }
    } catch (error) {
      console.warn('Failed to load job details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJob()
    trackEvent('job_detail_opened', { jobId })
    return () => {
      stopTracking()
    }
  }, [jobId])

  useEffect(() => {
    getCurrentPosition()
      .then((coords) => {
        setTradieCoords({ latitude: coords.latitude, longitude: coords.longitude })
        setEtaStatus('LIVE')
      })
      .catch(() => {
        setEtaStatus('STALE')
        api.post('/maps/location-event', {
          jobId,
          eventType: 'STALE_LOCATION',
        }).catch(() => {})
      })
  }, [jobId])

  // Map directions lookup
  useEffect(() => {
    if (!job || !tradieCoords) return

    const fetchRoute = async () => {
      try {
        const destLat = parseFloat(job.lat) || -33.8915
        const destLng = parseFloat(job.lng) || 151.2503
        
        const res = await api.post('/maps/route', {
          origin: { latitude: tradieCoords.latitude, longitude: tradieCoords.longitude },
          destination: { latitude: destLat, longitude: destLng },
        }) as any
        
        if (res && res.success) {
          setRoutePolyline(res.data.polyline)
          setEtaMins(Math.round((res.data.trafficDurationSeconds || res.data.durationSeconds) / 60))
          setEtaStatus('LIVE')
        }
      } catch (err) {
        console.warn('Route retrieval failed:', err)
        setEtaStatus('ROUTE UNAVAILABLE')
      }
    }

    if (isConnected) {
      fetchRoute()
    } else {
      setEtaStatus('NO SIGNAL')
    }
  }, [job, tradieCoords, isConnected])

  const handleStatusTransition = async (newStatus: string) => {
    // Standard workflows checks
    if (!job) return

    triggerLight()

    // Offline Queue
    if (!isConnected) {
      addToQueue('UPDATE_STATUS', { jobId, status: newStatus })
      setJob({ ...job, status: newStatus })
      Alert.alert('Offline status updated', `Transition queued to: ${newStatus}`)
      return
    }

    try {
      const res = await api.patch(`/jobs/${jobId}/status`, { status: newStatus }) as any
      if (res && res.success) {
        triggerSuccess()
        trackEvent('job_status_changed', { jobId, status: newStatus })
        setJob({ ...job, ...res.data })
        
        // Start background locations if Commuting
        if (newStatus === 'COMMUTING') {
          startTracking(jobId)
        } else {
          stopTracking()
        }

        // Auto prompt to create invoice on completion
        if (newStatus === 'COMPLETED') {
          Alert.alert(
            'Job Completed',
            'Would you like to generate the invoice for this job now?',
            [
              { text: 'Create Invoice', onPress: () => navigation.navigate('Invoice', { jobId: job.id }) },
              { text: 'Later', style: 'cancel' }
            ]
          )
        }
      }
    } catch (err: any) {
      Alert.alert('Transition Error', err.message || 'Status transition blocked.')
      // Reload job details to reset state
      loadJob()
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success'
      case 'COMMUTING': return 'info'
      case 'IN_PROGRESS': return 'cta'
      case 'PENDING': return 'warning'
      case 'CANCELLED': return 'danger'
      default: return 'stone'
    }
  }

  const getSlideTextAndAction = () => {
    if (!job) return { text: '', action: () => {} }
    switch (job.status) {
      case 'UPCOMING':
      case 'PENDING':
        return { text: 'Slide to Start Commute', action: () => handleStatusTransition('COMMUTING') }
      case 'COMMUTING':
        return { text: 'Slide to Arrive & Start Job', action: () => handleStatusTransition('IN_PROGRESS') }
      case 'IN_PROGRESS':
        return { text: 'Slide to Complete Job', action: () => handleStatusTransition('COMPLETED') }
      default:
        return { text: '', action: () => {} }
    }
  }

  const saveNotes = async () => {
    if (!job || notes === (job.notes || '')) return
    if (!isConnected) return

    try {
      await api.patch(`/jobs/${jobId}`, { notes })
      setJob({ ...job, notes })
    } catch (err) {
      console.warn('Failed to save notes:', err)
    }
  }

  const { text: slideText, action: slideAction } = getSlideTextAndAction()

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </SafeAreaView>
    )
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Unable to load job details.</Text>
      </SafeAreaView>
    )
  }

  const hasUnsyncedStatus = queue.some(item => item.action === 'UPDATE_STATUS' && item.payload.jobId === jobId)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.badgeRow}>
          {hasUnsyncedStatus && (
            <MaterialCommunityIcons name="wifi-off" size={16} color={Colors.warning} style={{ marginRight: 8 }} />
          )}
          <StatusBadge label={job.status} variant={getStatusVariant(job.status)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Client details card */}
        <View style={styles.clientCard}>
          <Text style={styles.clientLabel}>CUSTOMER</Text>
          <Text style={styles.clientName}>{job.customerName || 'No customer name'}</Text>
          <Text style={styles.clientPhone}>{job.customerPhone || 'No contact phone'}</Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={[styles.contactButton, styles.callButton]}
              onPress={() => {
                if (job.customerPhone) Linking.openURL(`tel:${job.customerPhone}`)
              }}
            >
              <MaterialCommunityIcons name="phone" size={18} color={Colors.white} />
              <Text style={styles.callButtonText}>Call Client</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.contactButton, styles.smsButton]}
              onPress={() => {
                if (job.customerPhone) Linking.openURL(`sms:${job.customerPhone}`)
              }}
            >
              <MaterialCommunityIcons name="message-text" size={18} color={Colors.cta} />
              <Text style={styles.smsButtonText}>SMS Client</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Maps panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Location</Text>
          <Text style={styles.addressText}>{job.address}</Text>
          <TradieMapView
            tradieCoords={tradieCoords}
            destinationCoords={{ latitude: parseFloat(job.lat) || -33.8915, longitude: parseFloat(job.lng) || 151.2503 }}
            polyline={routePolyline}
            etaMins={etaMins}
            etaStatus={etaStatus}
          />
        </View>

        {/* Job Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Add specific job issues, requirements, or list materials used..."
            value={notes}
            onChangeText={setNotes}
            onEndEditing={saveNotes}
            placeholderTextColor={Colors.textSubtle}
          />
        </View>

        {/* Photos grid */}
        <View style={styles.section}>
          <View style={styles.photoHeaderRow}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity style={styles.addPhotoBtn}>
              <MaterialCommunityIcons name="camera" size={16} color={Colors.cta} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.photoGrid}>
            {photos.length === 0 ? (
              <View style={styles.noPhotosBox}>
                <Text style={styles.noPhotosText}>No photos attached to job yet</Text>
              </View>
            ) : (
              photos.map((uri, idx) => (
                <View key={idx} style={styles.photoItem} />
              ))
            )}
          </View>
        </View>

        {/* Slide Action Confirmation footer */}
        {slideText ? (
          <View style={styles.sliderContainer}>
            <SlideToConfirm text={slideText} onComplete={slideAction} />
          </View>
        ) : job.status === 'COMPLETED' ? (
          <View style={styles.completedBox}>
            <MaterialCommunityIcons name="check-circle" size={32} color={Colors.success} />
            <Text style={styles.completedText}>Job Finished & Completed</Text>
            <TouchableOpacity 
              style={styles.invoiceButton}
              onPress={() => navigation.navigate('Invoice', { jobId: job.id })}
            >
              <Text style={styles.invoiceButtonText}>Generate Invoice</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  clientCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  clientLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  clientName: {
    fontSize: 18,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  clientPhone: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flex: 0.48,
    height: 44,
    borderRadius: Radius.element,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: Colors.cta,
  },
  smsButton: {
    borderWidth: 0.5,
    borderColor: Colors.cta,
    backgroundColor: Colors.white,
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: 6,
  },
  smsButtonText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: 6,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  addressText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.element,
    padding: Spacing.md,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPhotoText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    fontSize: 13,
    marginLeft: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noPhotosBox: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.element,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotosText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: Radius.element,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  sliderContainer: {
    marginVertical: Spacing.lg,
  },
  completedBox: {
    backgroundColor: Colors.successPale,
    borderWidth: 0.5,
    borderColor: Colors.successLight,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  completedText: {
    fontSize: 16,
    fontWeight: Typography.weights.medium,
    color: Colors.success,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  invoiceButton: {
    height: 48,
    backgroundColor: Colors.cta,
    borderRadius: Radius.element,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  invoiceButtonText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
  },
})
