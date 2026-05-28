import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Spacing, Radius } from '../../constants/spacing'

export type JobStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface JobStatusBadgeProps {
  status: JobStatus
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'UPCOMING': return { bg: Colors.infoLight, text: Colors.info }
      case 'IN_PROGRESS': return { bg: Colors.warningLight, text: Colors.warning }
      case 'COMPLETED': return { bg: Colors.successLight, text: Colors.success }
      case 'CANCELLED': return { bg: Colors.dangerLight, text: Colors.danger }
    }
  }

  const { bg, text } = getStyles()

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{status}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  text: {
    fontSize: Typography.sizes.badge,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
  },
})
