import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { AppTabParamList } from './types'
import { DashboardScreen } from '../../screens/dashboard/DashboardScreen'
import { JobsNavigator } from '../../screens/jobs/JobsNavigator'
import { InvoiceScreen } from '../../screens/invoices/InvoiceScreen'
import { ProfileScreen } from '../../screens/profile/ProfileScreen'
import { Colors } from '../../constants/colors'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { View, Text } from 'react-native'

const Tab = createBottomTabNavigator<AppTabParamList>()

// Placeholder screens for now
const Placeholder = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
    <Text>{name} Screen</Text>
  </View>
)

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.cta,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0.5,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = ''
          if (route.name === 'Dashboard') iconName = 'home'
          else if (route.name === 'Jobs') iconName = 'briefcase'
          else if (route.name === 'Invoices') iconName = 'file-document-outline'
          else if (route.name === 'Notifications') iconName = 'bell'
          else if (route.name === 'Profile') iconName = 'account'
          
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Jobs" component={JobsNavigator} />
      <Tab.Screen name="Invoices" component={InvoiceScreen} />
      <Tab.Screen name="Notifications" component={() => <Placeholder name="Notifications" />} options={{ tabBarBadge: 3 }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
