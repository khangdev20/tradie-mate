import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import api from '../../services/apiService'

interface TradeDocument {
  id: string
  docType: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'EXPIRING_SOON' | 'EXPIRED' | 'REJECTED'
  expiresAt?: string
  verifiedAt?: string
  storageUrl?: string
  createdAt: string
}

const DOC_TYPE_LABELS: Record<string, string> = {
  TRADE_LICENCE: 'Trade Licence',
  PUBLIC_LIABILITY_INSURANCE: 'Public Liability Insurance',
  WHITE_CARD: 'White Card (Construction)',
  POLICE_CHECK: 'Police Check',
  WORKERS_COMPENSATION: 'Workers Compensation',
  OTHER: 'Other Document',
}

const DOC_TYPE_ICONS: Record<string, string> = {
  TRADE_LICENCE: 'card-account-details-outline',
  PUBLIC_LIABILITY_INSURANCE: 'shield-check-outline',
  WHITE_CARD: 'card-bulleted-outline',
  POLICE_CHECK: 'police-badge-outline',
  WORKERS_COMPENSATION: 'briefcase-check-outline',
  OTHER: 'file-outline',
}

const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  PENDING:        { icon: 'clock-outline', color: Colors.warning, label: 'Pending Review' },
  UNDER_REVIEW:   { icon: 'magnify', color: Colors.info, label: 'Under Review' },
  VERIFIED:       { icon: 'check-circle', color: Colors.success, label: 'Verified' },
  EXPIRING_SOON:  { icon: 'alert-circle', color: Colors.warning, label: 'Expiring Soon' },
  EXPIRED:        { icon: 'close-circle', color: Colors.danger, label: 'Expired' },
  REJECTED:       { icon: 'cancel', color: Colors.danger, label: 'Rejected' },
}

const REQUIRED_DOC_TYPES = [
  'TRADE_LICENCE',
  'PUBLIC_LIABILITY_INSURANCE',
  'WHITE_CARD',
  'POLICE_CHECK',
] as const

export function DocumentsScreen() {
  const [documents, setDocuments] = useState<TradeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data?.data?.documents ?? [])
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to load documents.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = useCallback(async (docType: string) => {
    // In production: use react-native-document-picker or react-native-vision-camera
    // For now, show an informational alert
    Alert.alert(
      `Upload ${DOC_TYPE_LABELS[docType]}`,
      'Take a photo or select a PDF of your document from your files.\n\nDocument scanning requires camera permission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File',
          onPress: async () => {
            Alert.alert(
              'Coming Soon',
              'Document upload via camera or file picker will be available in the next release.',
            )
          },
        },
      ]
    )
  }, [])

  const getDocumentForType = (docType: string) =>
    documents.find((d) => d.docType === docType)

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.cta} />
      </View>
    )
  }

  const verifiedCount = documents.filter((d) => d.status === 'VERIFIED').length
  const progressPercent = Math.round((verifiedCount / REQUIRED_DOC_TYPES.length) * 100)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cta} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <Text style={styles.headerSubtitle}>Verify your credentials to unlock all features.</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Verification Progress</Text>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
        </View>
        <Text style={styles.progressSubtext}>
          {verifiedCount} of {REQUIRED_DOC_TYPES.length} required documents verified
        </Text>
      </View>

      {/* Document Cards */}
      <View style={styles.documentsSection}>
        {REQUIRED_DOC_TYPES.map((docType) => {
          const doc = getDocumentForType(docType)
          const statusConfig = doc ? STATUS_CONFIG[doc.status] : null
          const icon = DOC_TYPE_ICONS[docType]
          const label = DOC_TYPE_LABELS[docType]

          return (
            <View key={docType} style={styles.documentCard}>
              <View style={styles.documentLeft}>
                <View style={styles.docIconWrapper}>
                  <MaterialCommunityIcons name={icon} size={24} color={Colors.cta} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docLabel}>{label}</Text>
                  {doc ? (
                    <View style={styles.statusRow}>
                      <MaterialCommunityIcons
                        name={statusConfig!.icon}
                        size={14}
                        color={statusConfig!.color}
                      />
                      <Text style={[styles.statusText, { color: statusConfig!.color }]}>
                        {statusConfig!.label}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.docMissing}>Not uploaded</Text>
                  )}
                  {doc?.expiresAt && (
                    <Text style={styles.expiryText}>
                      Expires {new Date(doc.expiresAt).toLocaleDateString('en-AU')}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleUpload(docType)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={doc ? 'refresh' : 'upload-outline'}
                  size={18}
                  color={Colors.cta}
                />
                <Text style={styles.uploadButtonText}>{doc ? 'Replace' : 'Upload'}</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>

      {/* Additional info */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information-outline" size={18} color={Colors.info} />
        <Text style={styles.infoText}>
          Documents are reviewed within 1-2 business days. Verified credentials unlock
          enterprise dispatch and marketplace bookings.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.elevated,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  progressCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cta,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.cta,
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  documentsSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 14,
  },
  documentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.ctaPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
    gap: 3,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  docMissing: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  expiryText: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.cta,
    minHeight: 44,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.cta,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    padding: 14,
    backgroundColor: Colors.infoPale,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.infoLight,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.info,
    lineHeight: 18,
  },
})
