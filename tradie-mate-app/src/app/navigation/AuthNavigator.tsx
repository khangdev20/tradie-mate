import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { PhoneScreen } from '../../screens/auth/PhoneScreen'
import { OTPScreen } from '../../screens/auth/OTPScreen'
import { TradeTypeScreen } from '../../screens/auth/TradeTypeScreen'
import { ABNScreen } from '../../screens/auth/ABNScreen'
import { LoginScreen } from '../../screens/auth/LoginScreen'
import { RegisterScreen } from '../../screens/auth/RegisterScreen'
import { ForgotPasswordScreen } from '../../screens/auth/ForgotPasswordScreen'
import { DocumentUploadScreen } from '../../screens/onboarding/DocumentUploadScreen'

import { useAuthStore } from '../../store/auth.store'

const Stack = createNativeStackNavigator()

export function AuthNavigator() {
  const { isAuthenticated, resumeStep } = useAuthStore()
  
  let initialRoute = 'Login'
  if (isAuthenticated) {
    if (resumeStep === 'business') {
      initialRoute = 'ABN'
    } else if (resumeStep === 'tracking') {
      initialRoute = 'DocumentUpload'
    } else {
      initialRoute = 'TradeType'
    }
  }

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="TradeType" component={TradeTypeScreen} />
      <Stack.Screen name="ABN" component={ABNScreen} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  )
}
