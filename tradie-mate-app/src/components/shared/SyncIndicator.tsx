import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'

interface SyncIndicatorProps {
  status: 'online' | 'syncing' | 'offline'
  queuedCount?: number
  onPress?: () => void
}

export function SyncIndicator({ status, queuedCount = 0, onPress }: SyncIndicatorProps) {
  const iconName =
    status === 'online' ? 'wifi' : status === 'syncing' ? 'sync' : 'wifi-off'

  const iconColor =
    status === 'online' ? Colors.success : Colors.warning

  const label =
    status === 'online'
      ? queuedCount > 0
        ? `${queuedCount} queued`
        : 'Online'
      : status === 'syncing'
        ? 'Syncing...'
        : queuedCount > 0
          ? `Offline · ${queuedCount} queued`
          : 'Offline'

  const content = (
    <View style={styles.container}>
      <MaterialCommunityIcons name={iconName} size={16} color={iconColor} />
      <Text style={styles.text}>{label}</Text>
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
        {content}
      </TouchableOpacity>
    )
  }

  return content
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
  },
  text: {
    fontSize: Typography.sizes.micro,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
})
