import React from 'react'
import { colors } from './tokens'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: 32, color: colors.textMuted }}>
      <h3 style={{ color: colors.textPrimary, marginBottom: 8 }}>{title}</h3>
      {description && <p style={{ marginBottom: 16 }}>{description}</p>}
      {action}
    </div>
  )
}
