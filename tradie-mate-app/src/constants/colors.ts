// src/constants/colors.ts
export const Colors = {
  // TradieFlow Pro Palette
  urgentRed:     '#ba1a1a',
  surfaceMain:   '#f8f9fb',
  surfaceCard:   '#ffffff',
  borderBold:    '#8e7164',
  navActive:     '#ff6b00',

  // Backgrounds
  background:    '#f8f9fb',  // Maps to surface-main
  surface:       '#ffffff',  // Maps to surface-card
  surfaceHover:  '#E5E3DF',

  // Borders
  border:        '#8e7164',  // Maps to border-bold
  
  // Text
  textPrimary:   '#1A1A1A',
  textMuted:     '#888888',
  textDisabled:  '#C4C2BC',

  // Actions
  primary:       '#ff6b00',  // High-Visibility Orange
  secondary:     '#003366',  // Deep Blue
  cta:           '#ff6b00',
  ctaDark:       '#cc5500',
  ctaLight:      '#ff9e4d',
  ctaPale:       '#ffe5cc',

  // Semantic
  success:       '#639922',
  successLight:  '#C0DD97',
  warning:       '#BA7517',
  warningLight:  '#FAC775',
  danger:        '#ba1a1a',  // Maps to urgent-red
  dangerLight:   '#F7C1C1',
  info:          '#378ADD',
  infoLight:     '#B5D4F4',

  // Neutral
  stone:         '#5F5E5A',
  white:         '#ffffff',
  black:         '#000000',
} as const
