import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileStackParamList } from '../../app/navigation/types'
import { ProfileScreen } from '../profile/ProfileScreen'
import { SyncHealthScreen } from '../settings/SyncHealthScreen'
import { EarningsScreen } from '../earnings/EarningsScreen'
import { TeamScreen } from '../team/TeamScreen'
import { DocumentsScreen } from '../documents/DocumentsScreen'
import { ReviewsScreen } from '../reviews/ReviewsScreen'
import { SuppliesScreen } from '../supplies/SuppliesScreen'
import { IntegrationsScreen } from '../integrations/IntegrationsScreen'
import { VoiceAgentScreen } from '../voice-agent/VoiceAgentScreen'
import { LanguageScreen } from '../settings/LanguageScreen'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="SyncHealth" component={SyncHealthScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Supplies" component={SuppliesScreen} />
      <Stack.Screen name="Integrations" component={IntegrationsScreen} />
      <Stack.Screen name="VoiceAgent" component={VoiceAgentScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
    </Stack.Navigator>
  )
}
