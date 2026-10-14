import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native'
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { StatusBadge, BadgeVariant } from '../../components/ui/StatusBadge'
import { useAuthStore } from '../../store/auth.store'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function DocumentUploadScreen() {
  const {
    uploadedDocuments,
    requiredDocuments,
    uploadOnboardingDocument,
    fetchOnboardingStatus,
    logout,
    isLoading: isStoreLoading,
  } = useAuthStore()

  const [activeUploadDoc, setActiveUploadDoc] = useState<string | null>(null)
  const [cameraModalVisible, setCameraModalVisible] = useState(false)
  const [ocrAnalyzing, setOcrAnalyzing] = useState(false)

  // Camera permissions
  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice('back')
  const cameraRef = useRef<Camera>(null)

  useEffect(() => {
    // Initial fetch of status
    fetchOnboardingStatus()
  }, [fetchOnboardingStatus])

  const handleUploadClick = async (docType: string) => {
    setActiveUploadDoc(docType)
    
    // Check permission
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'TradieMate needs camera access to scan your documents. You can also choose a photo or PDF from your device.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Choose File', onPress: () => pickFromDevice(docType) }
          ]
        )
        return
      }
    }

    if (!device) {
      Alert.alert(
        'No Camera Device',
        'No back camera detected on this device. Choose a photo or PDF from your device instead.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Choose File', onPress: () => pickFromDevice(docType) }
        ]
      )
      return
    }

    setCameraModalVisible(true)
  }

  const pickFromDevice = async (docType: string) => {
    try {
      const DocumentPicker = require('react-native-document-picker').default
      const pick = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
        copyTo: 'cachesDirectory',
      })
      const file = Array.isArray(pick) ? pick[0] : pick

      setOcrAnalyzing(true)
      await uploadOnboardingDocument(docType, {
        uri: file.fileCopyUri || file.uri,
        name: file.name || `${docType.toLowerCase()}`,
        type: file.type || 'application/octet-stream',
      })
      Alert.alert('Upload Complete', `Your ${docType.replace('_', ' ')} was submitted for verification.`)
    } catch (err: any) {
      if (err?.code === 'DOCUMENT_PICKER_CANCELED') return
      Alert.alert('Upload Failed', err?.message || 'Could not upload the document. Please try again.')
    } finally {
      setOcrAnalyzing(false)
      setActiveUploadDoc(null)
    }
  }

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return
    setOcrAnalyzing(true)
    setCameraModalVisible(false)

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      })

      // Prepare file path for React Native FormData upload
      const photoUri = `file://${photo.path}`
      const filePayload = {
        uri: photoUri,
        name: `${activeUploadDoc?.toLowerCase()}.jpg`,
        type: 'image/jpeg',
      }

      await uploadOnboardingDocument(activeUploadDoc!, filePayload)
      Alert.alert('Scan Complete', `Successfully uploaded and scanned your ${activeUploadDoc?.replace('_', ' ')}.`)
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message || 'Could not scan the document. Please try again.')
    } finally {
      setOcrAnalyzing(false)
      setActiveUploadDoc(null)
    }
  }

  // Calculate percentage
  const totalRequired = requiredDocuments.length || 2
  const uploadedCount = requiredDocuments.filter(docType => {
    const doc = uploadedDocuments.find(d => d.doc_type === docType)
    return doc && doc.status !== 'MISSING'
  }).length
  const progressPercent = totalRequired > 0 ? (uploadedCount / totalRequired) * 100 : 0
  const allUploaded = uploadedCount === totalRequired

  const getDocStatus = (docType: string) => {
    const doc = uploadedDocuments.find(d => d.doc_type === docType)
    return doc ? doc.status : 'MISSING'
  }

  const getBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'VERIFIED': return 'success'
      case 'PENDING': return 'warning'
      case 'EXPIRED': return 'danger'
      default: return 'stone'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 8px Progress stepper */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{uploadedCount} of {totalRequired} documents uploaded</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {allUploaded ? (
          <View style={styles.reviewContainer}>
            <View style={styles.successIconWrapper}>
              <MaterialCommunityIcons name="clock-check-outline" size={64} color={Colors.warning} />
            </View>
            <Text style={styles.reviewTitle}>Application Under Review</Text>
            <Text style={styles.reviewSubtitle}>
              Our compliance team is verifying your trade licence and public liability insurance. 
              We'll notify you as soon as your profile is active.
            </Text>

            <AppCard style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>Submitted Documents</Text>
              {requiredDocuments.map(docType => {
                const status = getDocStatus(docType)
                return (
                  <View key={docType} style={styles.checklistItem}>
                    <Text style={styles.docName}>{docType.replace('_', ' ')}</Text>
                    <StatusBadge label={status} variant={getBadgeVariant(status)} />
                  </View>
                )
              })}
            </AppCard>

            <AppButton
              title="Check Status"
              onPress={fetchOnboardingStatus}
              variant="primary"
              size="large"
              loading={isStoreLoading}
              style={styles.actionButton}
            />

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Document Verification</Text>
              <Text style={styles.subtitle}>
                Upload copies of your legal credentials to enable job dispatch and invoice payments.
              </Text>
            </View>

            {requiredDocuments.map(docType => {
              const status = getDocStatus(docType)
              const isMissing = status === 'MISSING'
              
              return (
                <AppCard key={docType} style={styles.docCard}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>{docType.replace('_', ' ')}</Text>
                    <StatusBadge label={status} variant={getBadgeVariant(status)} />
                  </View>
                  <Text style={styles.docDescription}>
                    {docType === 'TRADE_LICENCE' 
                      ? 'Australian contractor licence or certificate showing name and category.' 
                      : 'Public Liability Certificate of Currency showing minimum $5M coverage.'}
                  </Text>
                  
                  <AppButton
                    title={isMissing ? "Scan Document" : "Re-upload"}
                    onPress={() => handleUploadClick(docType)}
                    variant={isMissing ? "primary" : "outline"}
                    size="medium"
                    icon={<MaterialCommunityIcons name="camera" size={18} color={isMissing ? Colors.white : Colors.cta} />}
                    style={styles.uploadButton}
                  />
                </AppCard>
              )
            })}

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Camera Scanning Modal */}
      <Modal visible={cameraModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.cameraContainer}>
          {device && (
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={cameraModalVisible}
              photo={true}
            />
          )}

          {/* Guidelines forest green rectangular overlay */}
          <View style={styles.maskContainer}>
            <View style={styles.maskFrame}>
              <View style={styles.guidelineBox} />
            </View>
            <Text style={styles.maskText}>Align your document within the frame</Text>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCameraModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.chooseFileBtn} onPress={() => {
              setCameraModalVisible(false)
              pickFromDevice(activeUploadDoc!)
            }}>
              <Text style={styles.chooseFileText}>Choose File</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* OCR Shimmer Fullscreen Overlay */}
      {ocrAnalyzing && (
        <View style={styles.shimmerOverlay}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={styles.shimmerText}>Analyzing license details... please wait.</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.elevated,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: Radius.element,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.success,
  },
  progressText: {
    marginTop: Spacing.xs,
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  uploadContainer: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.xs,
  },
  docCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  docTitle: {
    fontSize: Typography.sizes.label,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  docDescription: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  uploadButton: {
    alignSelf: 'flex-start',
  },
  logoutButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: Typography.sizes.body,
    color: Colors.danger,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
  },
  reviewContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.warningPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  reviewTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xl,
  },
  checklistCard: {
    width: '100%',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  checklistTitle: {
    fontSize: Typography.sizes.label,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  docName: {
    fontSize: Typography.sizes.label,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  actionButton: {
    width: '100%',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  maskContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  maskFrame: {
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelineBox: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85 * 0.63, // ID-1 card aspect ratio (0.63)
    borderWidth: 1.5,
    borderColor: Colors.cta,
    borderRadius: Radius.element,
    backgroundColor: 'transparent',
  },
  maskText: {
    color: Colors.white,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.element,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 3,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },
  cancelBtn: {
    padding: Spacing.md,
  },
  cancelText: {
    color: Colors.white,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
  },
  chooseFileBtn: {
    padding: Spacing.md,
  },
  chooseFileText: {
    color: Colors.ctaLight,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  shimmerText: {
    color: Colors.white,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.md,
  },
})
