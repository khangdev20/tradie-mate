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
import { Spacing, Radius } from '../../constants/spacing'
import { FormField } from '../../components/ui/FormField'
import { AppButton } from '../../components/ui/AppButton'
import { useEntitlements } from '../../hooks/useEntitlements'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { useNetworkState } from '../../hooks/useNetworkState'
import api from '../../services/apiService'

export function NewJobScreen({ navigation }: any) {
  const { isLimitReached } = useEntitlements()
  const { addToQueue } = useOfflineQueue()
  const { isConnected } = useNetworkState()

  const [title, setTitle] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString())
  const [durationMin, setDurationMin] = useState('60')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !customerName.trim() || !customerPhone.trim() || !address.trim()) {
      Alert.alert('Fields Required', 'Please enter all details.')
      return
    }

    // 1. Check entitlements
    if (isLimitReached('jobsCreated', 'maxJobsPerMonth')) {
      Alert.alert(
        'Limit Reached',
        'You have reached your monthly job limit. Please upgrade your plan in the profile tab.',
        [
          { text: 'Upgrade', onPress: () => navigation.navigate('Profile') },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
      return
    }

    const payload = {
      title: title.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      scheduledAt,
      estimatedDurationMin: parseInt(durationMin, 10) || 60,
      source: 'MANUAL',
    }

    // 2. Offline Mode Save
    if (!isConnected) {
      addToQueue('CREATE_JOB', payload)
      Alert.alert(
        'Offline Mode',
        'Job saved locally and queued. It will sync automatically when network returns.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
      return
    }

    try {
      setLoading(true)
      
      // 3. Geocode lookup validation
      let geocodeConfidence = 100
      try {
        const geoRes = await api.post('/maps/geocode', { address: address.trim() }) as any
        if (geoRes && geoRes.success) {
          geocodeConfidence = geoRes.data.confidence
        }
      } catch (err) {
        console.warn('Geocoding check failed:', err)
      }

      if (geocodeConfidence < 80) {
        Alert.alert(
          'Ambiguous Address',
          'We couldn\'t find a precise match for this address on Mapbox. Do you want to proceed anyway?',
          [
            { text: 'Edit Address', style: 'cancel' },
            { 
              text: 'Save Anyway', 
              onPress: () => submitJob(payload) 
            }
          ]
        )
      } else {
        await submitJob(payload)
      }
    } catch (error: any) {
      Alert.alert('Creation Failed', error.message || 'Unable to create job.')
    } finally {
      setLoading(false)
    }
  }

  const submitJob = async (jobPayload: any) => {
    const res = await api.post('/jobs', jobPayload) as any
    if (res && res.success) {
      Alert.alert('Success', 'Job scheduled successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ])
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
          <Text style={styles.title}>New Job</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <FormField
            label="Job Title"
            placeholder="e.g. Kitchen Sink Leaking Repair"
            value={title}
            onChangeText={setTitle}
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
            hint="Format: ISO Date String"
          />

          <FormField
            label="Est. Duration (minutes)"
            placeholder="60"
            value={durationMin}
            onChangeText={setDurationMin}
            keyboardType="numeric"
          />

          <AppButton
            title="Schedule Job"
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
