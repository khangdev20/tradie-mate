import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileScreen } from '../profile/ProfileScreen'
import { SyncHealthScreen } from '../settings/SyncHealthScreen'

export type ProfileStackParamList = {
  ProfileMain: undefined
  SyncHealth: undefined
}

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="SyncHealth" component={SyncHealthScreen} />
    </Stack.Navigator>
  )
}
