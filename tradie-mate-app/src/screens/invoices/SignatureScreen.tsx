import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import SignatureCanvas from 'react-native-signature-canvas'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import api from '../../services/apiService'
import { useNetworkState } from '../../hooks/useNetworkState'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'

export function SignatureScreen({ route, navigation }: any) {
  const { invoiceId, amountCents = 15840 } = route.params
  const { isConnected } = useNetworkState()
  const { addToQueue } = useOfflineQueue()
  
  const canvasRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  const handleEnd = () => {
    setHasSigned(true)
  }

  const handleClear = () => {
    canvasRef.current?.clearSignature()
    setHasSigned(false)
  }

  const handleConfirm = () => {
    // We request the base64 data from the signature canvas component
    canvasRef.current?.readSignature()
  }

  const handleOK = async (signature: string) => {
    if (!hasSigned) {
      Alert.alert('Details Required', 'Please draw a signature first.')
      return
    }

    const payload = {
      invoiceId,
      signatureData: signature,
      timestamp: new Date().toISOString()
    }

    // Offline Queue
    if (!isConnected) {
      addToQueue('PAY_INVOICE', payload)
      Alert.alert(
        'Offline Signature',
        'Signature saved locally and queued. Proceeding to payment confirmation.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Payment', { invoiceId, amountCents }) 
          }
        ]
      )
      return
    }

    try {
      setLoading(true)
      const res = await api.patch(`/invoices/${invoiceId}/paid`, payload) as any
      if (res && res.success) {
        navigation.navigate('Payment', { invoiceId, amountCents })
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Unable to update signature.')
    } finally {
      setLoading(false)
    }
  }

  // Signature canvas styling
  const style = `
    .m-signature-pad { border: none; box-shadow: none; margin: 0; background-color: #FAFAF8; }
    .m-signature-pad--body { border: 1px dashed #E8E6E0; border-radius: 8px; }
    .m-signature-pad--footer { display: none; }
  `

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Signature</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instructions}>
          Please have the customer sign inside the box below to authorize payment.
        </Text>

        <View style={styles.canvasContainer}>
          <SignatureCanvas
            ref={canvasRef}
            onOK={handleOK}
            onEnd={handleEnd}
            descriptionText="Customer Sign Off"
            clearText="Clear"
            confirmText="Save"
            webStyle={style}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.btn, styles.clearBtn]}
            onPress={handleClear}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.textPrimary} />
            <Text style={styles.clearBtnText}>Clear Pad</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btn, styles.confirmBtn, !hasSigned && styles.disabledBtn]}
            onPress={handleConfirm}
            disabled={!hasSigned || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
                <Text style={styles.confirmBtnText}>Save & Proceed</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
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
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  instructions: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  canvasContainer: {
    flex: 1,
    height: 300,
    borderRadius: Radius.element,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  btn: {
    flex: 0.48,
    height: 48,
    borderRadius: Radius.element,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  confirmBtn: {
    backgroundColor: Colors.cta,
  },
  disabledBtn: {
    opacity: 0.5,
    backgroundColor: Colors.surface,
  },
  clearBtnText: {
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
    marginLeft: 6,
  },
  confirmBtnText: {
    color: Colors.white,
    fontWeight: Typography.weights.medium,
    marginLeft: 6,
  },
})
