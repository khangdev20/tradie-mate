// src/constants/colors.ts
export const Colors = {
  // Backgrounds & Surfaces
  background:    '#FAFAF8',  // --bg-base Warm canvas
  surface:       '#EDECEA',  // --bg-surface
  elevated:      '#FFFFFF',  // --bg-elevated (cards)
  surfaceHover:  '#E5E3DF',

  // Borders
  border:        '#E8E6E0',  // --border
  borderStrong:  '#D4D1CB',  // --border-strong
  
  // Text
  textPrimary:   '#1A1A1A',  // --text-primary
  textMuted:     '#888888',  // --text-muted
  textSubtle:    '#AAAAAA',  // --text-subtle
  textDisabled:  '#C4C2BC',

  // Actions / CTA (Forest Green)
  primary:       '#2E6B45',  // --cta
  cta:           '#2E6B45',  // --cta
  ctaDark:       '#1F3D2B',  // --cta-dark
  ctaLight:      '#C0DD97',  // --cta-light
  ctaPale:       '#EAF3DE',  // --cta-pale
  white:         '#FFFFFF',
  black:         '#000000',

  // Semantic Colors
  success:       '#639922',  // --success
  successPale:   '#EAF3DE',  // --success-pale
  successLight:  '#C0DD97',  // --success-light
  
  warning:       '#BA7517',  // --warning
  warningPale:   '#FAEEDA',  // --warning-pale
  warningLight:  '#FAC775',  // --warning-light
  
  danger:        '#E24B4A',  // --danger
  dangerPale:    '#FCEBEB',  // --danger-pale
  dangerLight:   '#F7C1C1',  // --danger-light
  
  info:          '#378ADD',  // --info
  infoPale:      '#E6F1FB',  // --info-pale
  infoLight:     '#B5D4F4',  // --info-light

  // Additional Accent
  rust:          '#D85A30',  // --rust
  rustPale:      '#FAECE7',  // --rust-pale
  rustLight:     '#F5C4B3',  // --rust-light

  stone:         '#5F5E5A',  // --stone
  stonePale:     '#F1EFE8',  // --stone-pale
  stoneLight:    '#D3D1C7',  // --stone-light
} as const

