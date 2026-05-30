import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Colors } from '../../constants/colors'
import { Typography } from '../../constants/typography'
import { AppButton } from './AppButton'

interface EmptyStateProps {
  title: string
  description: string
  iconName: string
  actionTitle?: string
  onActionPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function EmptyState({
  title,
  description,
  iconName,
  actionTitle,
  onActionPress,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name={iconName} size={48} color={Colors.textSubtle} style={styles.icon} />
      
      <Text style={styles.title}>{title}</Text>
      
      <Text style={styles.description}>{description}</Text>

      {actionTitle && onActionPress && (
        <AppButton
          title={actionTitle}
          onPress={onActionPress}
          variant="primary"
          style={styles.actionButton}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fontFamily,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    paddingHorizontal: 24,
  },
})
