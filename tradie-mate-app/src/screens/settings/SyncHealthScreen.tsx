import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'
import { AppButton } from '../../components/ui/AppButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { useNetworkState } from '../../hooks/useNetworkState'

export function SyncHealthScreen({ navigation }: any) {
  const { queue, syncQueue, clearQueue } = useOfflineQueue()
  const { isConnected, status: networkStatus } = useNetworkState()
  const isSyncing = networkStatus === 'syncing'

  const handleSyncNow = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Connect to the internet to sync queued changes.')
      return
    }

    const result = await syncQueue()
    if (result.success) {
      Alert.alert('Sync complete', `${result.syncedCount} item(s) synced.`)
    } else {
      Alert.alert('Sync failed', 'Some items could not be synced. Try again shortly.')
    }
  }

  const handleClear = () => {
    Alert.alert(
      'Clear queue?',
      'This removes all unsynced local changes. Only do this if you are sure they are duplicates.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearQueue },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Health</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <MaterialCommunityIcons
            name={isConnected ? 'wifi' : 'wifi-off'}
            size={32}
            color={isConnected ? Colors.success : Colors.warning}
          />
          <Text style={styles.statusTitle}>
            {isSyncing ? 'Syncing...' : isConnected ? 'Connected' : 'Offline'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {queue.length} item{queue.length === 1 ? '' : 's'} waiting to sync
          </Text>
        </View>

        {queue.length === 0 ? (
          <EmptyState
            iconName="cloud-check-outline"
            title="All synced"
            description="No pending offline changes. You're up to date."
          />
        ) : (
          queue.map((item) => (
            <View key={item.id} style={styles.queueItem}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.warning} />
              <View style={styles.queueBody}>
                <Text style={styles.queueAction}>{item.action.replace(/_/g, ' ')}</Text>
                <Text style={styles.queueMeta}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.actions}>
          <AppButton
            title={isSyncing ? 'Syncing...' : 'Sync Now'}
            onPress={handleSyncNow}
            disabled={queue.length === 0 || isSyncing}
          />
          {queue.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearText}>Clear queue</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
  },
  statusSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.textMuted,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  queueBody: {
    flex: 1,
  },
  queueAction: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  queueMeta: {
    fontSize: Typography.sizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  clearBtn: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  clearText: {
    color: Colors.danger,
    fontSize: Typography.sizes.body,
  },
})
