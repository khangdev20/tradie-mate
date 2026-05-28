import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useAuthStore } from '../../store/auth.store'

const TRADE_TYPES = [
  "PLUMBER", "ELECTRICIAN", "CARPENTER", "HVAC", 
  "PAINTER", "TILER", "ROOFER", "OTHER"
]

export const RegisterScreen = ({ navigation }: any) => {
  const { registerWithEmail, isLoading } = useAuthStore()
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    trade_type: '' as any,
  })

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters')
      return
    }
    if (!form.trade_type) {
      Alert.alert('Error', 'Please select your trade type')
      return
    }

    try {
      await registerWithEmail({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        trade_type: form.trade_type,
      })
      // Success: RootNavigator will switch to App stack
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message)
    }
  }

  const getPasswordStrength = () => {
    if (form.password.length === 0) return { label: '', color: '#ccc' }
    if (form.password.length < 6) return { label: 'Weak', color: '#FF3B30' }
    if (form.password.length < 10) return { label: 'Medium', color: '#FF9500' }
    return { label: 'Strong', color: '#34C759' }
  }

  const strength = getPasswordStrength()

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join TradieMate today</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  value={form.first_name}
                  onChangeText={(t) => setForm({ ...form, first_name: t })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  value={form.last_name}
                  onChangeText={(t) => setForm({ ...form, last_name: t })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={form.password}
                onChangeText={(t) => setForm({ ...form, password: t })}
                secureTextEntry
              />
              {form.password.length > 0 && (
                <Text style={[styles.strengthText, { color: strength.color }]}>
                  Strength: {strength.label}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChangeText={(t) => setForm({ ...form, confirmPassword: t })}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Trade Type</Text>
              <View style={styles.tradeGrid}>
                {TRADE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.tradeOption,
                      form.trade_type === type && styles.tradeOptionActive
                    ]}
                    onPress={() => setForm({ ...form, trade_type: type })}
                  >
                    <Text style={[
                      styles.tradeText,
                      form.trade_type === type && styles.tradeTextActive
                    ]}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E8E6E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  tradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tradeOption: {
    width: '48%',
    height: 44,
    borderWidth: 1,
    borderColor: '#E8E6E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1%',
    backgroundColor: '#fff',
  },
  tradeOptionActive: {
    backgroundColor: '#2E6B45',
    borderColor: '#2E6B45',
  },
  tradeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tradeTextActive: {
    color: '#fff',
  },
  button: {
    height: 56,
    backgroundColor: '#2E6B45',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2E6B45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
    padding: 8,
  },
  backText: {
    color: '#666',
    fontSize: 15,
  },
})
