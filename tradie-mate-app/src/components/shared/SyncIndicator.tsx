import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'

interface SyncIndicatorProps {
  status: 'online' | 'syncing' | 'offline'
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return Colors.success
      case 'syncing': return Colors.warning
      case 'offline': return Colors.warning
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'online': return 'Online'
      case 'syncing': return 'Syncing...'
      case 'offline': return 'Offline'
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.text}>{getStatusText()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: Typography.sizes.micro,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
})
