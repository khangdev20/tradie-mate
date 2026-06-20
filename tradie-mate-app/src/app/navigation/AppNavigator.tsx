import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { AppTabParamList } from './types'
import { DashboardScreen } from '../../screens/dashboard/DashboardScreen'
import { JobsNavigator } from '../../screens/jobs/JobsNavigator'
import { CalendarScreen } from '../../screens/calendar/CalendarScreen'
import { InvoiceScreen } from '../../screens/invoices/InvoiceScreen'
import { NotificationsScreen } from '../../screens/notifications/NotificationsScreen'
import { ProfileNavigator } from '../../screens/profile/ProfileNavigator'
import { Colors } from '../../constants/colors'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

const Tab = createBottomTabNavigator<AppTabParamList>()

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
          else if (route.name === 'Calendar') iconName = 'calendar-month'
          else if (route.name === 'Invoices') iconName = 'file-document-outline'
          else if (route.name === 'Notifications') iconName = 'bell'
          else if (route.name === 'Profile') iconName = 'account'

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Jobs" component={JobsNavigator} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Invoices" component={InvoiceScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  )
}
