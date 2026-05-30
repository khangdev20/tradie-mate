import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Radius, TouchTarget } from '../../constants/spacing'
import { Typography } from '../../constants/typography'

interface FormFieldProps extends TextInputProps {
  label: string
  hint?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
}

export function FormField({
  label,
  hint,
  error,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = (e: any) => {
    setIsFocused(true)
    if (onFocus) onFocus(e)
  }

  const handleBlur = (e: any) => {
    setIsFocused(false)
    if (onBlur) onBlur(e)
  }

  const inputStyle = [
    styles.input,
    isFocused && styles.inputFocused,
    error && styles.inputError,
  ]

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <TextInput
        style={inputStyle}
        placeholderTextColor={Colors.textSubtle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    height: TouchTarget.min, // 44px
    borderWidth: 0.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.element,
    paddingHorizontal: 12,
    backgroundColor: Colors.elevated,
    fontFamily: Typography.fontFamily,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  inputFocused: {
    borderColor: Colors.cta,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.danger,
    marginTop: 4,
  },
})
