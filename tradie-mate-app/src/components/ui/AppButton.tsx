import React from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { Radius, TouchTarget } from '../../constants/spacing'
import { useHaptics } from '../../hooks/useHaptics'

interface AppButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  icon?: React.ReactNode
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: AppButtonProps) {
  const { triggerMedium } = useHaptics()
  const scaleAnim = React.useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start()
  }

  const handlePress = () => {
    if (loading || disabled) return
    triggerMedium()
    onPress()
  }

  const buttonStyle = [
    styles.btn,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ]

  const labelStyle = [
    styles.btnText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ]

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={buttonStyle}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.cta}
          />
        ) : (
          <>
            {icon}
            <Text style={labelStyle}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.element,
    borderWidth: 0,
  },
  primary: {
    backgroundColor: Colors.cta,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.cta,
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  small: {
    height: 36,
    paddingHorizontal: 12,
  },
  medium: {
    height: TouchTarget.min, // 44px min height
    paddingHorizontal: 16,
  },
  large: {
    height: 52, // 52px height for critical primary actions
    paddingHorizontal: 24,
  },
  btnText: {
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.weights.medium,
  },
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.textPrimary,
  },
  outlineText: {
    color: Colors.cta,
  },
  dangerText: {
    color: Colors.white,
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  disabled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.textDisabled,
  },
})
