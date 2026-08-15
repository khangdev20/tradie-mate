import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius, TouchTarget } from '../../constants/spacing'
import { SyncIndicator } from '../../components/shared/SyncIndicator'
import { StatusBadge } from '../../components/ui/StatusBadge'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { format } from 'date-fns'
import api from '../../services/apiService'
import { useNetworkState } from '../../hooks/useNetworkState'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'

interface DashboardStats {
  jobs_today: number
  pending_invoices: number
  estimated_revenue_today_cents: number
  next_job: {
    id: string
    title: string
    address: string
    status: string
    scheduledAt: string
    customerPhone?: string
    customerName?: string
  } | null
}

export function DashboardScreen({ navigation }: any) {
  const today = new Date()
  const { status: networkStatus } = useNetworkState()
  const { queue } = useOfflineQueue()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    jobs_today: 0,
    pending_invoices: 0,
    estimated_revenue_today_cents: 0,
    next_job: null,
  })
  const [laterJobs, setLaterJobs] = useState<any[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch stats
      const statsRes = await api.get('/tradies/dashboard') as any
      if (statsRes && statsRes.success) {
        setStats(statsRes.data)
      }

      // Fetch jobs for today
      const jobsRes = await api.get('/jobs', { params: { limit: 10 } }) as any
      if (jobsRes && jobsRes.success) {
        const allJobs = jobsRes.data.jobs || []
        // Filter next job from list if present, list others as later jobs
        const nextJobId = statsRes.data?.next_job?.id
        const filtered = allJobs.filter((job: any) => job.id !== nextJobId)
        setLaterJobs(filtered)
      }
    } catch (error) {
      console.warn('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const formatCentsToAUD = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline Alert Banner */}
      {networkStatus === 'offline' && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color={Colors.white} />
          <Text style={styles.offlineText}>Working Offline — Changes will sync when signal returns</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.date}>{format(today, 'EEEE, d MMMM')}</Text>
          </View>
          <SyncIndicator
            status={networkStatus}
            queuedCount={queue.length}
            onPress={() => navigation.navigate('Profile', { screen: 'SyncHealth' })}
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.cta} />
          </View>
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.jobs_today}</Text>
                <Text style={styles.statLabel}>Jobs Today</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.pending_invoices}</Text>
                <Text style={styles.statLabel}>Pending Invoices</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {formatCentsToAUD(stats.estimated_revenue_today_cents)}
                </Text>
                <Text style={styles.statLabel}>Est. Revenue</Text>
              </View>
            </View>

            {/* Next Job Card */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Next Up</Text>
            </View>
            
            {stats.next_job ? (
              <TouchableOpacity 
                style={styles.nextJobCard}
                onPress={() => navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: stats.next_job?.id } })}
              >
                <View style={styles.accentBar} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.microLabel}>
                      {format(new Date(stats.next_job.scheduledAt), 'HH:mm')}
                    </Text>
                    <StatusBadge label={stats.next_job.status} variant={getStatusVariant(stats.next_job.status)} showDot={false} />
                  </View>
                  <Text style={styles.jobTitle}>{stats.next_job.title}</Text>
                  <Text style={styles.customerName}>
                    {stats.next_job.customerName || 'Customer'} · {stats.next_job.address}
                  </Text>
                  
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.outlineButton]}
                      onPress={() => {
                        if (stats.next_job?.customerPhone) {
                          Linking.openURL(`tel:${stats.next_job.customerPhone}`)
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="phone" size={20} color={Colors.cta} />
                      <Text style={styles.outlineButtonText}>Call</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.filledButton]}
                      onPress={() => {
                        if (stats.next_job?.address) {
                          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stats.next_job.address)}`)
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="navigation" size={20} color={Colors.white} />
                      <Text style={styles.filledButtonText}>Navigate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.noJobCard}>
                <Text style={styles.noJobText}>Add today's first job</Text>
                <TouchableOpacity
                  style={styles.quickJobLink}
                  onPress={() => navigation.navigate('Jobs', { screen: 'QuickJob' })}
                >
                  <Text style={styles.quickJobLinkText}>Quick Job →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Later Jobs */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Later Today</Text>
            </View>
            
            {laterJobs.length > 0 ? (
              laterJobs.map((job) => (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.laterJobItem}
                  onPress={() => navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: job.id } })}
                >
                  <View style={styles.laterJobTime}>
                    <Text style={styles.timeText}>
                      {format(new Date(job.scheduledAt), 'HH:mm')}
                    </Text>
                  </View>
                  <View style={styles.laterJobDetails}>
                    <Text style={styles.laterJobTitle}>{job.title}</Text>
                    <Text style={styles.laterJobSubtitle}>
                      {job.customerName || 'Customer'} · {job.address}
                    </Text>
                  </View>
                  <StatusBadge label={job.status} variant={getStatusVariant(job.status)} showDot={true} />
                  <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textDisabled} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noJobCard}>
                <Text style={styles.noJobText}>No other jobs scheduled for today</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB Row */}
      <View style={styles.fabRow}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('Jobs', { screen: 'QuickJob' })}
        >
          <MaterialCommunityIcons name="lightning-bolt" size={24} color={Colors.white} />
          <Text style={styles.fabText}>Quick Job</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate('Jobs', { screen: 'NewJob' })}
        >
          <MaterialCommunityIcons name="plus" size={24} color={Colors.cta} />
          <Text style={[styles.fabText, styles.fabTextSecondary]}>New Job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fabRowSecondary}>
        <TouchableOpacity
          style={styles.fabTertiary}
          onPress={() => navigation.navigate('Profile', { screen: 'Documents' })}
        >
          <MaterialCommunityIcons name="camera-document" size={20} color={Colors.cta} />
          <Text style={styles.fabTertiaryText}>Scan Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabTertiary}
          onPress={() => navigation.navigate('Profile', { screen: 'SyncHealth' })}
        >
          <MaterialCommunityIcons name="cloud-sync" size={20} color={Colors.cta} />
          <Text style={styles.fabTertiaryText}>Offline Mode</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  offlineBanner: {
    backgroundColor: Colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  offlineText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
    marginLeft: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  date: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.card,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  nextJobCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  accentBar: {
    width: 4,
    backgroundColor: Colors.cta,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  microLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.cta,
  },
  jobTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerName: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    height: TouchTarget.min,
    borderRadius: Radius.element,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
    borderWidth: 0.5,
    borderColor: Colors.cta,
  },
  filledButton: {
    backgroundColor: Colors.cta,
  },
  outlineButtonText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  filledButtonText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  noJobCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  noJobText: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
  },
  quickJobLink: {
    marginTop: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  quickJobLinkText: {
    fontSize: Typography.sizes.body,
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
  },
  laterJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  laterJobTime: {
    width: 60,
  },
  timeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  laterJobDetails: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  laterJobTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  laterJobSubtitle: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fabRow: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fab: {
    flex: 0.48,
    height: 56,
    backgroundColor: Colors.cta,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.cta,
  },
  fabSecondary: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  fabText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  fabTextSecondary: {
    color: Colors.cta,
  },
  fabRowSecondary: {
    position: 'absolute',
    bottom: 88,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fabTertiary: {
    flex: 0.48,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  fabTertiaryText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
    fontSize: 12,
  },
})
