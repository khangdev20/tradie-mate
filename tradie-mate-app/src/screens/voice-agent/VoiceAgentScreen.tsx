import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { AppButton } from '../../components/ui/AppButton'
import { useEntitlements } from '../../hooks/useEntitlements'
import api from '../../services/apiService'
import { trackEvent } from '../../services/analytics'

export function VoiceAgentScreen() {
  const { getEntitlement } = useEntitlements()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [callScript, setCallScript] = useState('')
  const [disclosureText, setDisclosureText] = useState('')

  const aiEnabled = getEntitlement('aiVoiceEnabled')

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get('/voice-agent/config') as any
      const cfg = res?.data
      setIsEnabled(cfg?.isEnabled ?? false)
      setCallScript(cfg?.callScript ?? '')
      setDisclosureText(cfg?.disclosureText ?? '')
    } catch {
      Alert.alert('Error', 'Failed to load voice agent settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const save = async () => {
    if (!aiEnabled) {
      Alert.alert('Upgrade required', 'AI voice agent is a Team plan add-on.')
      return
    }
    setSaving(true)
    try {
      await api.put('/voice-agent/config', { isEnabled, callScript, disclosureText })
      trackEvent('voice_agent_config_saved')
      Alert.alert('Saved', 'Voice agent settings updated.')
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.cta} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI Voice Agent</Text>
        <Text style={styles.subtitle}>
          Configure Vapi to answer calls when you are on the tools. ACMA disclosure is required.
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Enable voice agent</Text>
          <Switch value={isEnabled} onValueChange={setIsEnabled} trackColor={{ true: Colors.cta }} />
        </View>

        <Text style={styles.label}>Call script</Text>
        <TextInput
          style={styles.input}
          multiline
          value={callScript}
          onChangeText={setCallScript}
          placeholder="Greeting and intake questions..."
        />

        <Text style={styles.label}>Recording disclosure (ACMA)</Text>
        <TextInput
          style={styles.input}
          multiline
          value={disclosureText}
          onChangeText={setDisclosureText}
        />

        <AppButton title="Save settings" onPress={save} loading={saving} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: Colors.textMuted, marginVertical: 12, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: Colors.elevated,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
})
