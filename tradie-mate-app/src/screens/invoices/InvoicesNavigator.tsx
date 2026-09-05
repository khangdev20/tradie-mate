import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { InvoiceListScreen } from './InvoiceListScreen'
import { InvoiceScreen } from './InvoiceScreen'
import { SignatureScreen } from './SignatureScreen'
import { PaymentScreen } from './PaymentScreen'

export type InvoicesStackParamList = {
  InvoiceList: undefined
  InvoiceBuilder: { jobId: string }
  Signature: { invoiceId: string; amountCents: number }
  Payment: { invoiceId: string; amountCents: number }
}

const Stack = createNativeStackNavigator<InvoicesStackParamList>()

export function InvoicesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <Stack.Screen name="InvoiceBuilder" component={InvoiceScreen} />
      <Stack.Screen name="Signature" component={SignatureScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  )
}
