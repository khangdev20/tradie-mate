import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { formatAUD } from '../../utils/gst'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import api from '../../services/apiService'
import { useHaptics } from '../../hooks/useHaptics'
import { useNetworkState } from '../../hooks/useNetworkState'
import { useEntitlements } from '../../hooks/useEntitlements'

export function PaymentScreen({ route, navigation }: any) {
  const { invoiceId, amountCents = 15840 } = route.params || {}
  const { triggerMedium, triggerSuccess } = useHaptics()
  const { isConnected } = useNetworkState()
  const { hasEntitlement } = useEntitlements()

  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('Initialize Terminal...')
  const [step, setStep] = useState<'IDLE' | 'CONNECTING' | 'TAP_PROMPT' | 'PROCESSING' | 'SUCCESS'>('IDLE')
  
  // Animation states
  const pulseAnim = React.useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (step === 'TAP_PROMPT') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [step])

  const handleTapToPay = async () => {
    triggerMedium()

    if (!hasEntitlement('tapToPayEnabled')) {
      Alert.alert(
        'Tap to Pay is locked',
        'Upgrade to a plan with Tap to Pay to collect card payments on site.',
        [{ text: 'OK' }]
      )
      return
    }
    
    // Offline mode warning
    if (!isConnected) {
      Alert.alert(
        'Offline Mode Warning',
        'Stripe Terminal Tap to Pay requires internet access. Would you like to record a cash/check payment offline?',
        [
          { 
            text: 'Yes, Record Offline', 
            onPress: () => {
              triggerSuccess()
              setStep('SUCCESS')
              setStatusText('Payment recorded offline!')
            } 
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
      return
    }

    try {
      setStep('CONNECTING')
      setStatusText('Connecting to NFC Reader...')
      
      // 1. Fetch Terminal Connection Token
      const tokenRes = await api.post('/payments/connection-token') as any
      if (!tokenRes || !tokenRes.success) {
        throw new Error('Failed to retrieve terminal connection token')
      }

      // 2. Fetch card_present PaymentIntent clientSecret
      setStatusText('Creating PaymentIntent...')
      const intentRes = await api.post('/payments/tap-to-pay', { invoiceId }) as any
      if (!intentRes || !intentRes.success) {
        throw new Error('Failed to create PaymentIntent')
      }

      // 3. Prompt user to tap card
      setStep('TAP_PROMPT')
      setStatusText('Hold card or phone near the back of the device')
      
    } catch (err: any) {
      Alert.alert('Terminal Connection Failed', err.message || 'Unable to start card reader.')
      setStep('IDLE')
    }
  }

  // Simulate tapping credit card
  const simulateCardTap = () => {
    if (step !== 'TAP_PROMPT') return
    
    triggerMedium()
    setStep('PROCESSING')
    setStatusText('Authorizing charge with Stripe...')
    
    setTimeout(() => {
      triggerSuccess()
      setStep('SUCCESS')
      setStatusText('Payment collected successfully!')
    }, 2000)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collect Payment</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total to Collect</Text>
          <Text style={styles.amountValue}>{formatAUD(amountCents)}</Text>
        </View>

        {step === 'IDLE' && (
          <View style={styles.illustrationContainer}>
            <MaterialCommunityIcons name="cellphone-nfc" size={80} color={Colors.textSubtle} />
            <Text style={styles.instructions}>
              Tap to Pay turns your mobile phone into an on-site card terminal.
            </Text>
            <Text style={styles.feeDisclosure}>
              Card processing fees apply and are shown in your Stripe dashboard before payout.
            </Text>
          </View>
        )}

        {(step === 'CONNECTING' || step === 'PROCESSING') && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.cta} />
            <Text style={styles.loaderText}>{statusText}</Text>
          </View>
        )}

        {step === 'TAP_PROMPT' && (
          <TouchableOpacity 
            style={styles.nfcTouchZone} 
            activeOpacity={0.8}
            onPress={simulateCardTap}
          >
            <Animated.View style={[styles.nfcPulse, { transform: [{ scale: pulseAnim }] }]}>
              <MaterialCommunityIcons name="nfc" size={64} color={Colors.cta} />
            </Animated.View>
            <Text style={styles.nfcInstructions}>{statusText}</Text>
            <Text style={styles.simTip}>(Tap NFC icon above to simulate credit card scan)</Text>
          </TouchableOpacity>
        )}

        {step === 'SUCCESS' && (
          <View style={styles.successContainer}>
            <View style={styles.successCircle}>
              <MaterialCommunityIcons name="check-bold" size={48} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Transaction Approved</Text>
            <Text style={styles.successMessage}>
              Invoice {invoiceId.startsWith('offline') ? 'queued' : 'updated'} as PAID. Invoice receipt sent.
            </Text>
          </View>
        )}

        <View style={styles.acceptedRow}>
           <MaterialCommunityIcons name="visa" size={32} color={Colors.textDisabled} />
           <MaterialCommunityIcons name="credit-card" size={32} color={Colors.textDisabled} />
           <MaterialCommunityIcons name="apple-pay" size={32} color={Colors.textDisabled} />
           <MaterialCommunityIcons name="google-pay" size={32} color={Colors.textDisabled} />
        </View>

        {step === 'IDLE' && (
          <TouchableOpacity style={styles.payButton} onPress={handleTapToPay}>
            <Text style={styles.payButtonText}>Start Tap to Pay</Text>
          </TouchableOpacity>
        )}

        {step === 'SUCCESS' && (
          <TouchableOpacity 
            style={[styles.payButton, { backgroundColor: Colors.cta }]} 
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.payButtonText}>Done</Text>
          </TouchableOpacity>
        )}
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
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderColor: Colors.border,
  },
  headerTitle: {
    marginLeft: Spacing.md,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  amountLabel: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  illustrationContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  instructions: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.md,
  },
  feeDisclosure: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  loaderText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  nfcTouchZone: {
    alignItems: 'center',
    width: '100%',
  },
  nfcPulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.ctaPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.ctaLight,
  },
  nfcInstructions: {
    fontSize: Typography.sizes.heading,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  simTip: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successPale,
    borderWidth: 0.5,
    borderColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  successMessage: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  acceptedRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
  },
  payButton: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.cta,
    borderRadius: Radius.element,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
  },
})
