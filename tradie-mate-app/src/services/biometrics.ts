import ReactNativeBiometrics from 'react-native-biometrics'
import { TokenStorage } from './tokenStorage'

const rnBiometrics = new ReactNativeBiometrics()

export const BiometricService = {
  // Check if device supports biometrics
  isAvailable: async (): Promise<boolean> => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable()
      return available
    } catch {
      return false
    }
  },

  // Get type: FaceID, TouchID, Biometrics
  getType: async (): Promise<string | null> => {
    try {
      const { biometryType } = await rnBiometrics.isSensorAvailable()
      return biometryType ?? null
    } catch {
      return null
    }
  },

  // Prompt user to enable biometric on first login
  promptEnroll: async (): Promise<boolean> => {
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Enable Face ID for quick access',
        cancelButtonText: 'Not now',
      })
      if (success) {
        TokenStorage.setBiometricEnabled(true)
      }
      return success
    } catch {
      return false
    }
  },

  // Unlock app with biometric (replaces PIN entry)
  unlock: async (): Promise<boolean> => {
    if (!TokenStorage.hasBiometricEnabled()) return false
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Unlock TradieMate',
        cancelButtonText: 'Use phone code',
        fallbackPromptMessage: 'Enter passcode',
      })
      return success
    } catch {
      return false
    }
  },
}
