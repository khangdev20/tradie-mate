import React, { useState, useEffect, useRef } from 'react'
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
} from 'react-native'
import { useAuthStore } from '../../store/auth.store'

export const PhoneScreen = ({ navigation }: any) => {
  const [phone, setPhone] = useState('')
  const { sendOtp, isLoading, error, clearError } = useAuthStore()
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    // Autofocus on mount
    const timer = setTimeout(() => inputRef.current?.focus(), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error)
      clearError()
    }
  }, [error])

  const handleGetCode = async () => {
    let cleaned = phone.replace(/\s/g, '').replace(/\D/g, '')
    
    // If user enters 04..., strip the 0
    if (cleaned.startsWith('04')) {
      cleaned = cleaned.substring(1)
    }
    
    // Prepend +61 if not already there (though UI prefix handles +61)
    const normalised = '+61' + cleaned
    
    // Validate AU mobile: /^\+614[0-9]{8}$/
    if (!/^\+614[0-9]{8}$/.test(normalised)) {
      Alert.alert('Invalid Number', 'Please enter a valid Australian mobile number starting with 4.')
      return
    }

    try {
      await sendOtp(normalised)
      navigation.navigate('OTP', { phone: normalised })
    } catch (err) {
      // Error handled by useEffect
    }
  }

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '')
    setPhone(cleaned)
  }

  const isValid = (phone.length === 9 && phone.startsWith('4')) || (phone.length === 10 && phone.startsWith('04'))

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>TradieMate</Text>
          <Text style={styles.headline}>Welcome, tradie</Text>
          <Text style={styles.subtext}>Enter your mobile to get started</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>+61</Text>
          </View>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="412 345 678"
            keyboardType="numeric"
            maxLength={10}
            value={phone}
            onChangeText={formatPhone}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
          onPress={handleGetCode}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get Code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing you agree to our{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E6B45',
    marginBottom: 24,
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
  inputContainer: {
    flexDirection: 'row',
    height: 56,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
  },
  prefixContainer: {
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  prefixText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#333',
  },
  button: {
    height: 52,
    backgroundColor: '#2E6B45',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A5CBB3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  link: {
    color: '#2E6B45',
    fontWeight: '600',
  },
})
