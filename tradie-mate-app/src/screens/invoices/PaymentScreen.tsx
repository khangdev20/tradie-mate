import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { formatAUD } from '../../utils/gst'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
// import { useStripe } from '@stripe/stripe-react-native'

export function PaymentScreen({ route }: any) {
  const { amountCents = 15840 } = route.params || {}
  // const { collectPayment } = useStripe()

  const handleTapToPay = async () => {
     console.log('Starting Tap to Pay for', amountCents)
     // 1. Create PaymentIntent on backend
     // 2. Present Tap to Pay sheet
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total to Collect</Text>
          <Text style={styles.amountValue}>{formatAUD(amountCents)}</Text>
        </View>

        <View style={styles.nfcContainer}>
          <View style={styles.nfcPulse}>
            <MaterialCommunityIcons name="nfc" size={64} color={Colors.cta} />
          </View>
          <Text style={styles.nfcInstructions}>Hold customer card or phone here</Text>
        </View>

        <View style={styles.acceptedRow}>
           <MaterialCommunityIcons name="visa" size={32} color={Colors.textMuted} />
           <MaterialCommunityIcons name="credit-card" size={32} color={Colors.textMuted} />
           <MaterialCommunityIcons name="apple-pay" size={32} color={Colors.textMuted} />
           <MaterialCommunityIcons name="google-pay" size={32} color={Colors.textMuted} />
        </View>

        <TouchableOpacity style={styles.payButton} onPress={handleTapToPay}>
          <Text style={styles.payButtonText}>Tap to Pay</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
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
    marginTop: Spacing.xxl,
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
  nfcContainer: {
    alignItems: 'center',
  },
  nfcPulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.ctaPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  nfcInstructions: {
    fontSize: Typography.sizes.heading,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
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
