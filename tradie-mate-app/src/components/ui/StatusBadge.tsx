import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'
import { Radius } from '../../constants/spacing'
import { Typography } from '../../constants/typography'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'stone' | 'cta'

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  style?: StyleProp<ViewStyle>
  showDot?: boolean
}

export function StatusBadge({
  label,
  variant = 'stone',
  style,
  showDot = true,
}: StatusBadgeProps) {
  const containerStyle = [
    styles.badge,
    styles[`${variant}Bg`],
    style,
  ]

  const labelStyle = [
    styles.text,
    styles[`${variant}Text`],
  ]

  const dotStyle = [
    styles.dot,
    styles[`${variant}Dot`],
  ]

  return (
    <View style={containerStyle}>
      {showDot && <View style={dotStyle} />}
      <Text style={labelStyle}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    display: 'flex',
    flexDirection: 'row',

    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.pill, // 20px
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
  },
  
  // Success
  successBg: { backgroundColor: Colors.successPale },
  successText: { color: Colors.success },
  successDot: { backgroundColor: Colors.success },

  // Warning
  warningBg: { backgroundColor: Colors.warningPale },
  warningText: { color: Colors.warning },
  warningDot: { backgroundColor: Colors.warning },

  // Danger
  dangerBg: { backgroundColor: Colors.dangerPale },
  dangerText: { color: Colors.danger },
  dangerDot: { backgroundColor: Colors.danger },

  // Info
  infoBg: { backgroundColor: Colors.infoPale },
  infoText: { color: Colors.info },
  infoDot: { backgroundColor: Colors.info },

  // Stone
  stoneBg: { backgroundColor: Colors.stonePale },
  stoneText: { color: Colors.stone },
  stoneDot: { backgroundColor: Colors.stone },

  // CTA
  ctaBg: { backgroundColor: Colors.ctaPale },
  ctaText: { color: Colors.cta },
  ctaDot: { backgroundColor: Colors.cta },
})
