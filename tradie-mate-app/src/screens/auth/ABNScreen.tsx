import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { AppButton } from '../../components/ui/AppButton'
import { FormField } from '../../components/ui/FormField'
import { validateABN } from '../../utils/abn'
import { useAuthStore } from '../../store/auth.store'

export function ABNScreen({ route, navigation }: any) {
  const { tradeType } = route.params || { tradeType: 'OTHER' }
  const { register, isLoading } = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [abn, setAbn] = useState('')
  const [abnError, setAbnError] = useState<string | undefined>(undefined)

  const handleABNChange = (text: string) => {
    // Keep only numbers
    const numbersOnly = text.replace(/\D/g, '')
    
    // Group format: XX XXX XXX XXX
    let formatted = ''
    if (numbersOnly.length > 0) {
      formatted += numbersOnly.substring(0, 2)
    }
    if (numbersOnly.length > 2) {
      formatted += ' ' + numbersOnly.substring(2, 5)
    }
    if (numbersOnly.length > 5) {
      formatted += ' ' + numbersOnly.substring(5, 8)
    }
    if (numbersOnly.length > 8) {
      formatted += ' ' + numbersOnly.substring(8, 11)
    }

    setAbn(formatted)

    if (numbersOnly.length === 11) {
      const isValid = validateABN(numbersOnly)
      if (!isValid) {
        setAbnError('Invalid ABN format (Luhn check failed)')
      } else {
        setAbnError(undefined)
      }
    } else if (numbersOnly.length > 0 && numbersOnly.length < 11) {
      setAbnError(undefined) // neutral while typing
    } else {
      setAbnError(undefined)
    }
  }

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Details Required', 'Please enter your first and last name.')
      return
    }

    const cleanAbn = abn.replace(/\s/g, '')
    if (cleanAbn.length !== 11 || !validateABN(cleanAbn)) {
      Alert.alert('Invalid ABN', 'Please provide a valid 11-digit Australian Business Number.')
      return
    }

    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        trade_type: tradeType,
        abn: cleanAbn,
      })
      // Auth store updates and root navigator will automatically mount the App stack
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Verification failed')
    }
  }

  const cleanAbnLength = abn.replace(/\s/g, '').length
  const isAbnValid = cleanAbnLength === 11 && !abnError

  // Determine ABN input borders
  let abnBorderColor: string = Colors.borderStrong
  if (cleanAbnLength === 11) {
    abnBorderColor = isAbnValid ? Colors.success : Colors.danger
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Business Profile</Text>
            <Text style={styles.subtitle}>Enter your details and ABN to complete setup</Text>
          </View>

          <View style={styles.form}>
            <FormField
              label="First Name"
              placeholder="e.g. John"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <FormField
              label="Last Name"
              placeholder="e.g. Smith"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <FormField
              label="ABN (Australian Business Number)"
              placeholder="12 345 678 901"
              value={abn}
              onChangeText={handleABNChange}
              keyboardType="numeric"
              maxLength={14}
              error={abnError}
              style={{ borderColor: abnBorderColor, borderWidth: cleanAbnLength === 11 ? 1.5 : 0.5 }}
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                We verify your ABN directly with the Australian Business Register (ABR) to activate your client invoicing & payments.
              </Text>
            </View>

            <AppButton
              title="Activate Profile"
              onPress={handleRegister}
              variant="primary"
              size="large"
              loading={isLoading}
              disabled={!firstName.trim() || !lastName.trim() || !isAbnValid}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
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
    marginTop: Spacing.sm,
  },
  form: {
    width: '100%',
  },
  infoBox: {
    backgroundColor: Colors.ctaPale,
    borderWidth: 0.5,
    borderColor: Colors.ctaLight,
    borderRadius: Radius.element,
    padding: Spacing.md,
    marginVertical: Spacing.lg,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.cta,
    fontFamily: Typography.fontFamily,
  },
  button: {
    marginTop: Spacing.md,
  },
})
