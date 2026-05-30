import React from 'react'
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import { useHaptics } from '../../hooks/useHaptics'

interface IconButtonProps {
  name: string
  onPress: () => void
  size?: number
  color?: string
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}

export function IconButton({
  name,
  onPress,
  size = 24,
  color = Colors.cta,
  style,
  disabled = false,
}: IconButtonProps) {
  const { triggerLight } = useHaptics()

  const handlePress = () => {
    if (disabled) return
    triggerLight()
    onPress()
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, style]}
    >
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
