import React from 'react'
import { colors } from './tokens'

export function MapPanel({
  children,
  height = 280,
}: {
  children?: React.ReactNode
  height?: number
}) {
  return (
    <div
      style={{
        height,
        borderRadius: 12,
        border: `0.5px solid ${colors.border}`,
        background: colors.ctaPale,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}
