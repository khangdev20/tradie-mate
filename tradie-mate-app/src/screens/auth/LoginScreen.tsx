import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native'
import { useAuthStore } from '../../store/auth.store'
import { GoogleIcon, AppleIcon } from '../../components/icons'

export const LoginScreen = ({ navigation }: any) => {
  const { loginWithGoogle, loginWithApple, loginWithEmail, isLoading } = useAuthStore()
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = async () => {
    try {
      const { is_new_user, tradie_id } = await loginWithGoogle()
      if (tradie_id) {
        if (is_new_user) {
          navigation.navigate('TradeType')
        }
      }
    } catch {}
  }

  const handleAppleLogin = async () => {
    try {
      const { is_new_user, tradie_id } = await loginWithApple()
      if (tradie_id) {
        if (is_new_user) {
          navigation.navigate('TradeType')
        }
      }
    } catch {}
  }

  const handleEmailLogin = async () => {
    try {
      await loginWithEmail(email, password)
    } catch {}
  }

  const toggleEmail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowEmail(!showEmail)
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>TradieMate</Text>
          <Text style={styles.headline}>Welcome, tradie</Text>
          <Text style={styles.subtext}>Sign in to start managing your jobs</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.phoneButton}
            onPress={() => navigation.navigate('Phone')}
            disabled={isLoading}
          >
            <Text style={styles.phoneButtonText}>Continue with Phone Number</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity 
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <View style={styles.socialIconContainer}>
              <GoogleIcon size={20} />
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity 
              style={styles.appleButton}
              onPress={handleAppleLogin}
              disabled={isLoading}
            >
              <View style={styles.socialIconContainer}>
                <AppleIcon size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.moreOptions}
            onPress={toggleEmail}
          >
            <Text style={styles.moreOptionsText}>
              {showEmail ? 'Hide email options' : 'More sign in options'}
            </Text>
          </TouchableOpacity>

          {showEmail && (
            <View style={styles.emailContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={handleEmailLogin}
                disabled={isLoading || !email || !password}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signInButtonText}>Sign In</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to TradieMate?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Create account</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#2E6B45" />
          </View>
        )}
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
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2E6B45',
    marginBottom: 16,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
  },
  phoneButton: {
    height: 52,
    backgroundColor: '#2E6B45',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2E6B45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E6E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  googleButton: {
    height: 52,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E6E0',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '600',
  },
  appleButton: {
    height: 52,
    backgroundColor: '#000',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  moreOptions: {
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  moreOptionsText: {
    color: '#666',
    fontSize: 15,
  },
  emailContainer: {
    marginTop: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E8E6E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  signInButton: {
    height: 52,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 12,
  },
  forgotPasswordText: {
    color: '#2E6B45',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 48,
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  link: {
    color: '#2E6B45',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorToast: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
})
