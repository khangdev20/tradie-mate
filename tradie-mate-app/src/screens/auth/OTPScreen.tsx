import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native'
import { useAuthStore } from '../../store/auth.store'

export const OTPScreen = ({ route, navigation }: any) => {
  const { phone } = route.params
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(60)
  const { verifyOtp, sendOtp, isLoading, error, clearError } = useAuthStore()
  const inputs = useRef<TextInput[]>([])
  const shakeAnimation = useRef(new Animated.Value(0)).current

  const handleBack = () => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack()
    } else if (navigation) {
      navigation.navigate('Phone')
    }
  }

  useEffect(() => {
    // Focus first box on mount
    const t = setTimeout(() => inputs.current[0]?.focus(), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }, [shakeAnimation])

  useEffect(() => {
    if (error) {
      shake()
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      Alert.alert('Error', error)
      clearError()
    }
  }, [error, shake, clearError])

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }

    if (newOtp.every((digit) => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (token: string) => {
    try {
      const result = await verifyOtp(phone, token)
      if (result.is_new_user) {
        navigation.navigate('TradeType')
      } else {
        // Auth store updates isAuthenticated, RootNavigator handles navigation
      }
    } catch {
      // Error handled by useEffect
    }
  }

  const handleResend = async () => {
    if (timer > 0) return
    try {
      await sendOtp(phone)
      setTimer(60)
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } catch {
      Alert.alert('Error', 'Failed to resend code')
    }
  }

  const displayPhone = phone.replace('+61', '0')
  const maskedPhone = displayPhone.slice(0, 4) + ' ' + displayPhone.slice(4, 7) + ' ' + displayPhone.slice(7)

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headline}>Enter your code</Text>
          <Text style={styles.subtext}>Sent to {maskedPhone}</Text>
        </View>

        <Animated.View style={[styles.otpContainer, { transform: [{ translateX: shakeAnimation }] }]}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref!;
              }}
              style={styles.otpInput}
              keyboardType="numeric"
              maxLength={1}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        {isLoading && <ActivityIndicator size="large" color="#2E6B45" style={styles.loader} />}

        <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={timer > 0}>
          <Text style={[styles.resendText, timer > 0 && styles.resendTextDisabled]}>
            {timer > 0 ? `Resend code (${timer}s)` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 32,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
  },
  header: {
    marginBottom: 40,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  otpInput: {
    width: 45,
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  loader: {
    marginBottom: 24,
  },
  resendButton: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 16,
    color: '#2E6B45',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#999',
  },
})
