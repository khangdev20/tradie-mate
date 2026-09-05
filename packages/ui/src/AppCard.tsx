import React from 'react'
import { colors } from './tokens'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function AppCard({ style, children, ...props }: CardProps) {
  return (
    <div
      style={{
        background: colors.elevated,
        borderRadius: 12,
        border: `0.5px solid ${colors.border}`,
        padding: 16,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
