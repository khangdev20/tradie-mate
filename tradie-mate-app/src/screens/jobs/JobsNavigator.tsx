import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { JobListScreen } from './JobListScreen'
import { JobDetailScreen } from './JobDetailScreen'
import { NewJobScreen } from './NewJobScreen'
import { QuickJobScreen } from './QuickJobScreen'
import { InvoiceScreen } from '../invoices/InvoiceScreen'
import { SignatureScreen } from '../invoices/SignatureScreen'
import { PaymentScreen } from '../invoices/PaymentScreen'
import { JobsStackParamList } from '../../app/navigation/types'

const Stack = createNativeStackNavigator<JobsStackParamList>()

export function JobsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JobList" component={JobListScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="NewJob" component={NewJobScreen} />
      <Stack.Screen name="QuickJob" component={QuickJobScreen} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} />
      <Stack.Screen name="Signature" component={SignatureScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  )
}
