import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  TouchableOpacity,
  Modal,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { AppButton } from '../../components/ui/AppButton'
import { FormField } from '../../components/ui/FormField'
import { validateABN } from '../../utils/abn'
import { useAuthStore } from '../../store/auth.store'
import api from '../../services/apiService'
import { supabase } from '../../services/supabase'

export function ABNScreen({ route, navigation }: any) {
  const { tradeType } = route.params || { tradeType: 'OTHER' }
  const { submitOnboardingProfile, isLoading } = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [abn, setAbn] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [hasPublicLiability, setHasPublicLiability] = useState(false)
  const [abnError, setAbnError] = useState<string | undefined>(undefined)
  const [isValidatingAbn, setIsValidatingAbn] = useState(false)

  // Legal Consents
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'disclaimer' | null>(null)

  useEffect(() => {
    // Attempt to pre-fill email/phone/names from Supabase session
    async function prefill() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          if (session.user.email) setEmail(session.user.email)
          if (session.user.phone) setPhone(session.user.phone)
          
          const metadata = session.user.user_metadata || {}
          if (metadata.first_name) setFirstName(metadata.first_name)
          if (metadata.last_name) setLastName(metadata.last_name)
        }
      } catch (err) {
        console.warn('Prefill error:', err)
      }
    }
    prefill()
  }, [])

  const handleABNChange = async (text: string) => {
    const numbersOnly = text.replace(/\D/g, '')
    
    // Group format: XX XXX XXX XXX
    let formatted = ''
    if (numbersOnly.length > 0) formatted += numbersOnly.substring(0, 2)
    if (numbersOnly.length > 2) formatted += ' ' + numbersOnly.substring(2, 5)
    if (numbersOnly.length > 5) formatted += ' ' + numbersOnly.substring(5, 8)
    if (numbersOnly.length > 8) formatted += ' ' + numbersOnly.substring(8, 11)

    setAbn(formatted)

    if (numbersOnly.length === 11) {
      const isValidFormat = validateABN(numbersOnly)
      if (!isValidFormat) {
        setAbnError('Invalid ABN format (Luhn check failed)')
        return
      }
      setAbnError(undefined)

      // Trigger backend ABN lookup verification
      setIsValidatingAbn(true)
      try {
        const response = await api.post('/onboarding/abn/validate', { abn: numbersOnly }) as any
        const res = response.data ?? response
        if (res.valid && res.entity_name) {
          setBusinessName(res.entity_name)
          setAbnError(undefined)
        } else {
          setAbnError('ABN not found in register')
        }
      } catch (err: any) {
        // Soft validation warning in case ABR is down
        if (err.message.includes('unavailable') || err.message.includes('503')) {
          setAbnError('ABR is offline. Please enter business name manually.')
        } else {
          setAbnError(err.message || 'Verification failed')
        }
      } finally {
        setIsValidatingAbn(false)
      }
    } else {
      setAbnError(undefined)
    }
  }

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Details Required', 'Please enter your first and last name.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.')
      return
    }

    if (!phone.trim()) {
      Alert.alert('Phone Required', 'Please enter your mobile phone number.')
      return
    }

    const cleanAbn = abn.replace(/\s/g, '')
    if (cleanAbn.length !== 11 || !validateABN(cleanAbn)) {
      Alert.alert('Invalid ABN', 'Please provide a valid 11-digit Australian Business Number.')
      return
    }

    if (!businessName.trim()) {
      Alert.alert('Business Name Required', 'Please enter your business name.')
      return
    }

    if (!termsAccepted || !privacyAccepted || !disclaimerAccepted) {
      Alert.alert('Consents Required', 'You must agree to the Terms, Privacy Policy, and Verification Disclaimer to continue.')
      return
    }

    try {
      await submitOnboardingProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        trade_type: tradeType,
        business_name: businessName.trim(),
        abn: cleanAbn,
        has_public_liability: hasPublicLiability,
      })
      // Auth store state is updated, which triggers RootNavigator rerouting
      // (or navigates to DocumentUpload via AuthNavigator)
    } catch (err: any) {
      Alert.alert('Profile Activation Failed', err.message || 'Failed to complete profile registration.')
    }
  }

  const cleanAbnLength = abn.replace(/\s/g, '').length
  const isAbnValid = cleanAbnLength === 11 && !abnError

  // Determine ABN input borders
  let abnBorderColor: string = Colors.borderStrong
  if (cleanAbnLength === 11) {
    abnBorderColor = isAbnValid ? Colors.success : Colors.danger
  }

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.includes('@') &&
    phone.trim().length > 0 &&
    isAbnValid &&
    businessName.trim().length > 0 &&
    termsAccepted &&
    privacyAccepted &&
    disclaimerAccepted

  const handleBack = () => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack()
    } else if (navigation) {
      navigation.navigate('TradeType')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Activate Profile</Text>
            <Text style={styles.subtitle}>Enter your business details to complete setup</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <FormField
                  label="First Name"
                  placeholder="e.g. John"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <FormField
                  label="Last Name"
                  placeholder="e.g. Smith"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <FormField
              label="Email Address"
              placeholder="e.g. john@smith.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormField
              label="Mobile Number"
              placeholder="e.g. +61412345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <FormField
              label="ABN (Australian Business Number)"
              placeholder="12 345 678 901"
              value={abn}
              onChangeText={handleABNChange}
              keyboardType="numeric"
              maxLength={14}
              error={abnError}
              style={{ borderColor: abnBorderColor, borderWidth: cleanAbnLength === 11 ? 1 : 0.5 }}
            />

            <FormField
              label="Business/Entity Name"
              placeholder="e.g. John Smith Plumbing"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              editable={!isValidatingAbn}
            />

            <View style={styles.switchContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Public Liability Insurance</Text>
                <Text style={styles.switchSubtitle}>Do you hold current public liability insurance?</Text>
              </View>
              <Switch
                value={hasPublicLiability}
                onValueChange={setHasPublicLiability}
                trackColor={{ false: Colors.borderStrong, true: Colors.ctaLight }}
                thumbColor={hasPublicLiability ? Colors.cta : Colors.borderStrong}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                We verify details directly with the Australian Business Register (ABR) to activate client invoicing and payments.
              </Text>
            </View>

            {/* Legal Consents Checkboxes */}
            <View style={styles.consentSection}>
              <Text style={styles.consentHeader}>Legal Agreements</Text>
              
              <TouchableOpacity style={styles.consentRow} onPress={() => setActiveModal('terms')}>
                <MaterialCommunityIcons 
                  name={termsAccepted ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color={termsAccepted ? Colors.cta : Colors.textMuted} 
                />
                <Text style={styles.consentText}>I accept the <Text style={styles.linkText}>Terms of Service</Text></Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.consentRow} onPress={() => setActiveModal('privacy')}>
                <MaterialCommunityIcons 
                  name={privacyAccepted ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color={privacyAccepted ? Colors.cta : Colors.textMuted} 
                />
                <Text style={styles.consentText}>I agree to the <Text style={styles.linkText}>Privacy Policy</Text></Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.consentRow} onPress={() => setActiveModal('disclaimer')}>
                <MaterialCommunityIcons 
                  name={disclaimerAccepted ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color={disclaimerAccepted ? Colors.cta : Colors.textMuted} 
                />
                <Text style={styles.consentText}>I consent to the <Text style={styles.linkText}>Identity & License Verification Disclaimer</Text></Text>
              </TouchableOpacity>
            </View>

            <AppButton
              title="Activate Profile"
              onPress={handleRegister}
              variant="primary"
              size="large"
              loading={isLoading || isValidatingAbn}
              disabled={!isFormValid || isLoading || isValidatingAbn}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={activeModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'terms' && 'Terms of Service'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'disclaimer' && 'Verification Disclaimer'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
              {activeModal === 'terms' && (
                <>
                  <Text style={styles.modalSectionTitle}>Welcome to TradieMate</Text>
                  <Text style={styles.modalText}>
                    These Terms of Service govern your use of the TradieMate mobile application and services. By accessing or using our platform, you agree to comply with and be bound by these terms.
                  </Text>
                  
                  <Text style={styles.modalSectionTitle}>1. Scope of Services</Text>
                  <Text style={styles.modalText}>
                    TradieMate provides a platform designed specifically for tradespeople ("tradies") to manage invoices, organize jobs, track quotes, and receive customer payments.
                  </Text>

                  <Text style={styles.modalSectionTitle}>2. ABN & Identity Verification</Text>
                  <Text style={styles.modalText}>
                    To maintain a secure platform, all users must supply a valid Australian Business Number (ABN). We verify ABNs directly with the Australian Business Register (ABR).
                  </Text>

                  <Text style={styles.modalSectionTitle}>3. User Account Security</Text>
                  <Text style={styles.modalText}>
                    You are responsible for keeping your credentials secure and confidential. Any activity under your account is your responsibility.
                  </Text>

                  <Text style={styles.modalSectionTitle}>4. Invoice & Payment Terms</Text>
                  <Text style={styles.modalText}>
                    Customer invoicing and card processing is integrated with Stripe. All transactions are subject to Stripe's Services Agreement. TradieMate does not hold client credit card details.
                  </Text>

                  <Text style={styles.modalSectionTitle}>5. Acceptable Conduct</Text>
                  <Text style={styles.modalText}>
                    You agree to provide accurate, honest descriptions of services, invoices, and prices. Misleading, fraudulent, or illegal practices are strictly prohibited.
                  </Text>
                </>
              )}

              {activeModal === 'privacy' && (
                <>
                  <Text style={styles.modalSectionTitle}>Commitment to Privacy</Text>
                  <Text style={styles.modalText}>
                    At TradieMate, we protect your personal and business data. This Privacy Policy describes what information we collect, how it is used, and who we share it with.
                  </Text>

                  <Text style={styles.modalSectionTitle}>1. Information We Collect</Text>
                  <Text style={styles.modalText}>
                    We collect information you provide directly to us, including your name, email address, mobile phone number, ABN, trading name, and uploaded verification documents.
                  </Text>

                  <Text style={styles.modalSectionTitle}>2. How We Use Data</Text>
                  <Text style={styles.modalText}>
                    Your details are used to set up your profile, authenticate your identity, sync invoicing capabilities, prevent fraud, and run our customer support.
                  </Text>

                  <Text style={styles.modalSectionTitle}>3. Data Security & Storage</Text>
                  <Text style={styles.modalText}>
                    We use Supabase database services. Your credentials and personal data are transmitted and stored securely with industry-standard encryption protocols.
                  </Text>

                  <Text style={styles.modalSectionTitle}>4. Third-Party Disclosures</Text>
                  <Text style={styles.modalText}>
                    We share data with Stripe for credit card payments and the Australian Government's ABR database for ABN verification. We do not sell your personal information to third parties.
                  </Text>
                </>
              )}

              {activeModal === 'disclaimer' && (
                <>
                  <Text style={styles.modalSectionTitle}>Verification Overview</Text>
                  <Text style={styles.modalText}>
                    TradieMate operates a verified trades network to build trust with homeowners and clients. We require identity and license validation for account activation.
                  </Text>

                  <Text style={styles.modalSectionTitle}>1. ABN Lookup Consent</Text>
                  <Text style={styles.modalText}>
                    By checking this consent box, you authorize TradieMate to query official public government registries (such as the ABR) using the ABN you provided.
                  </Text>

                  <Text style={styles.modalSectionTitle}>2. Government Registers</Text>
                  <Text style={styles.modalText}>
                    We verify business registration, entity type, active GST status, and public liability details directly from public databases.
                  </Text>

                  <Text style={styles.modalSectionTitle}>3. Account Activation Disclaimer</Text>
                  <Text style={styles.modalText}>
                    While we make every effort to verify credentials, users are solely responsible for keeping their details up-to-date. Verification status may be revoked if details become invalid.
                  </Text>

                  <Text style={styles.modalSectionTitle}>4. Accuracy of Provided Documents</Text>
                  <Text style={styles.modalText}>
                    You certify that any qualification certificates, licenses, or insurance certificates you submit are genuine and valid.
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <AppButton
                title="Decline"
                variant="outline"
                size="medium"
                style={styles.modalDeclineButton}
                onPress={() => {
                  if (activeModal === 'terms') setTermsAccepted(false)
                  else if (activeModal === 'privacy') setPrivacyAccepted(false)
                  else if (activeModal === 'disclaimer') setDisclaimerAccepted(false)
                  setActiveModal(null)
                }}
              />
              <AppButton
                title="I Accept"
                variant="primary"
                size="medium"
                style={styles.modalAcceptButton}
                onPress={() => {
                  if (activeModal === 'terms') setTermsAccepted(true)
                  else if (activeModal === 'privacy') setPrivacyAccepted(true)
                  else if (activeModal === 'disclaimer') setDisclaimerAccepted(true)
                  setActiveModal(null)
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  row: {
    flexDirection: 'row',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.elevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.element,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  switchLabel: {
    fontSize: Typography.sizes.label,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  switchSubtitle: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: Colors.ctaPale,
    borderWidth: 0.5,
    borderColor: Colors.ctaLight,
    borderRadius: Radius.element,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  infoText: {
    fontSize: Typography.sizes.micro,
    lineHeight: 18,
    color: Colors.cta,
    fontFamily: Typography.fontFamily,
  },
  consentSection: {
    marginVertical: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  consentHeader: {
    fontSize: Typography.sizes.label,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.sm,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
    minHeight: 44, // Touch target guideline
  },
  consentText: {
    marginLeft: Spacing.md,
    fontSize: Typography.sizes.label,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  linkText: {
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
  },
  button: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: Colors.elevated,
    borderRadius: Radius.lg,
    width: '100%',
    maxHeight: '80%',
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalContent: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  modalScrollContent: {
    paddingRight: Spacing.xs,
  },
  modalSectionTitle: {
    fontSize: Typography.sizes.label,
    fontWeight: Typography.weights.semiBold,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  modalText: {
    fontSize: Typography.sizes.body,
    lineHeight: 20,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  modalDeclineButton: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  modalAcceptButton: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
})
