import React from 'react'
import { colors } from './tokens'

const variantColors: Record<string, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  neutral: colors.textMuted,
}

export function StatusBadge({
  label,
  variant = 'neutral',
}: {
  label: string
  variant?: keyof typeof variantColors
}) {
  const color = variantColors[variant] ?? colors.textMuted
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 8,
        border: `0.5px solid ${color}`,
        color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}
