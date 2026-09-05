import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing } from '../../constants/spacing'
import { FormField } from '../../components/ui/FormField'
import { AppButton } from '../../components/ui/AppButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEntitlements } from '../../hooks/useEntitlements'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { useNetworkState } from '../../hooks/useNetworkState'
import { trackEvent } from '../../services/analytics'
import api from '../../services/apiService'

export function QuickJobScreen({ navigation }: any) {
  const { isLimitReached } = useEntitlements()
  const { addToQueue } = useOfflineQueue()
  const { isConnected } = useNetworkState()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString())
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    trackEvent('quick_job_started')

    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      Alert.alert('Fields Required', 'Customer name, phone, and address are required.')
      return
    }

    if (isLimitReached('jobsCreated', 'maxJobsPerMonth')) {
      Alert.alert('Limit Reached', 'You have reached your monthly job limit. Upgrade in Profile.')
      return
    }

    const payload = {
      title: `Job for ${customerName.trim()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      scheduledAt,
      estimatedDurationMin: 60,
      source: 'MANUAL',
    }

    if (!isConnected) {
      addToQueue('CREATE_JOB', payload)
      trackEvent('quick_job_completed', { offline: true })
      Alert.alert('Offline Mode', 'Quick job saved locally. It will sync when you reconnect.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
      return
    }

    try {
      setLoading(true)
      const res = (await api.post('/jobs', payload)) as any
      if (res?.success) {
        trackEvent('job_created', { source: 'quick_job' })
        trackEvent('quick_job_completed')
        Alert.alert('Success', 'Quick job added.', [{ text: 'OK', onPress: () => navigation.goBack() }])
      }
    } catch (error: any) {
      Alert.alert('Creation Failed', error.message || 'Unable to create job.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Quick Job</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <EmptyState
            iconName="lightning-bolt"
            title="Add today's first job"
            description="Only the essentials — name, phone, address, and time."
          />

          <FormField
            label="Customer Name"
            placeholder="e.g. Sarah Wilson"
            value={customerName}
            onChangeText={setCustomerName}
            autoCapitalize="words"
          />

          <FormField
            label="Customer Phone"
            placeholder="e.g. 0412 345 678"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />

          <FormField
            label="Street Address"
            placeholder="e.g. 45 Bunnings Rd, Fortitude Valley QLD"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
          />

          <FormField
            label="Scheduled Date / Time"
            placeholder="YYYY-MM-DD HH:MM"
            value={scheduledAt}
            onChangeText={setScheduledAt}
            hint="Defaults to now if unchanged"
          />

          <AppButton
            title="Add Quick Job"
            onPress={handleSave}
            variant="primary"
            size="large"
            loading={loading}
            style={styles.saveButton}
          />
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
    width: 60,
  },
  backText: {
    fontSize: 14,
    color: Colors.cta,
    fontWeight: Typography.weights.medium,
  },
  title: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
})
