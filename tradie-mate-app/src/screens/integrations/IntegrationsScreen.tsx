import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { AppButton } from '../../components/ui/AppButton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useEntitlements } from '../../hooks/useEntitlements'
import api from '../../services/apiService'
import { trackEvent } from '../../services/analytics'

export function IntegrationsScreen() {
  const { getEntitlement } = useEntitlements()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const xeroEnabled = getEntitlement('xeroSyncEnabled')

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get('/integrations/xero/status') as any
      setStatus(res?.data ?? null)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const connectXero = async () => {
    if (!xeroEnabled) {
      Alert.alert('Upgrade required', 'Xero sync is available on Pro and Team plans.')
      return
    }
    setConnecting(true)
    try {
      const res = await api.get('/integrations/xero/connect') as any
      const url = res?.data?.authUrl
      if (url) {
        trackEvent('xero_connect_started')
        await Linking.openURL(url)
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start Xero connection')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectXero = async () => {
    await api.delete('/integrations/xero')
    await loadStatus()
    trackEvent('xero_disconnected')
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
        <Text style={styles.title}>Integrations</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Xero Accounting</Text>
            <StatusBadge
              label={status?.isConnected ? 'Connected' : 'Not connected'}
              variant={status?.isConnected ? 'success' : 'stone'}
            />
          </View>
          {status?.tenantName && <Text style={styles.meta}>Org: {status.tenantName}</Text>}
          {status?.lastSyncAt && (
            <Text style={styles.meta}>Last sync: {new Date(status.lastSyncAt).toLocaleString('en-AU')}</Text>
          )}
          {status?.isConnected ? (
            <AppButton title="Disconnect Xero" variant="secondary" onPress={disconnectXero} style={styles.btn} />
          ) : (
            <AppButton title="Connect Xero" onPress={connectXero} loading={connecting} style={styles.btn} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  card: {
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  meta: { color: Colors.textMuted, marginTop: 8, fontSize: 13 },
  btn: { marginTop: 16 },
})
