import ReactNativeHapticFeedback from 'react-native-haptic-feedback'

const options = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
}

export function useHaptics() {
  const triggerLight = () => {
    ReactNativeHapticFeedback.trigger('impactLight', options)
  }

  const triggerMedium = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', options)
  }

  const triggerSuccess = () => {
    ReactNativeHapticFeedback.trigger('notificationSuccess', options)
  }

  const triggerSelection = () => {
    ReactNativeHapticFeedback.trigger('selection', options)
  }

  return {
    triggerLight,
    triggerMedium,
    triggerSuccess,
    triggerSelection,
  }
}
