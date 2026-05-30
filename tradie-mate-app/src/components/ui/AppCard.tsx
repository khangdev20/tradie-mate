import React from 'react'
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'
import { Radius } from '../../constants/spacing'

interface AppCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  variant?: 'elevated' | 'surface'
}

export function AppCard({ children, style, variant = 'elevated' }: AppCardProps) {
  const cardStyle = [
    styles.card,
    variant === 'surface' ? styles.surfaceVariant : styles.elevatedVariant,
    style,
  ]

  return <View style={cardStyle}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card, // 12px
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
  },
  elevatedVariant: {
    backgroundColor: Colors.elevated, // #FFFFFF
  },
  surfaceVariant: {
    backgroundColor: Colors.surface, // #EDECEA
  },
})
