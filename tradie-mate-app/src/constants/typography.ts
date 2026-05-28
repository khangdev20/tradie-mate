// src/constants/typography.ts
import { Platform } from 'react-native'

export const Typography = {
  fontFamily: Platform.select({
    ios: 'Inter',   // install via Info.plist
    android: 'Inter-Regular', // install via assets/fonts
  }),
  sizes: {
    display:  32,
    heading:  24,
    title:    20,
    bodyLg:   18,
    body:     16,
    label:    14,
    micro:    12,
    badge:    12,
  },
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semiBold: '600' as const,
    bold:     '700' as const,
    heavy:    '800' as const,
  },
  lineHeights: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.8,
  },
  letterSpacing: {
    tight: -0.02,
    wide:  0.05,
  }
}
