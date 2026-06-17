import React from 'react'
import { colors } from './tokens'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function AppButton({ variant = 'primary', style, children, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    minHeight: 44,
    padding: '10px 20px',
    borderRadius: 8,
    border: variant === 'secondary' ? `0.5px solid ${colors.border}` : 'none',
    background: variant === 'primary' ? colors.cta : variant === 'secondary' ? colors.elevated : 'transparent',
    color: variant === 'primary' ? '#fff' : colors.textPrimary,
    fontWeight: 600,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.6 : 1,
  }
  return (
    <button type="button" style={{ ...base, ...style }} {...props}>
      {children}
    </button>
  )
}
