const React = require('react')

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
}))

const createNavigatorMock = () => ({
  Navigator: ({ children }) => {
    const firstScreen = React.Children.toArray(children)[0]
    const Component = firstScreen?.props?.component
    return Component
      ? React.createElement(Component, {
          route: { params: {} },
          navigation: {
            navigate: jest.fn(),
            goBack: jest.fn(),
            popToTop: jest.fn(),
          },
        })
      : null
  },
  Screen: () => null,
})

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
}))

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(createNavigatorMock),
}))

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(createNavigatorMock),
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock('@rnmapbox/maps', () => ({
  setAccessToken: jest.fn(),
  MapView: 'MapView',
  Camera: 'Camera',
  ShapeSource: 'ShapeSource',
  LineLayer: 'LineLayer',
  PointAnnotation: 'PointAnnotation',
}))

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(() => Promise.resolve()),
}))

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(() => Promise.resolve()),
    requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
    displayNotification: jest.fn(() => Promise.resolve()),
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}))

jest.mock('@react-native-firebase/messaging', () => {
  const messaging = () => ({
    onMessage: jest.fn(() => jest.fn()),
    registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
    getToken: jest.fn(() => Promise.resolve('test-fcm-token-1234567890')),
  })
  return messaging
})

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}))

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({
      data: {
        idToken: 'test-google-id-token',
        user: { name: 'Test Tradie', email: 'test@example.com', photo: null },
      },
    })),
    signOut: jest.fn(() => Promise.resolve()),
  },
}))

jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  default: {
    performRequest: jest.fn(() => Promise.resolve({
      identityToken: 'test-apple-token',
      fullName: { givenName: 'Test', familyName: 'Tradie' },
      email: 'test@example.com',
    })),
    Operation: { LOGIN: 'LOGIN' },
    Scope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
  },
}))

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: false })),
    simplePrompt: jest.fn(() => Promise.resolve({ success: false })),
  }))
})

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}))

jest.mock('@react-native-community/geolocation', () => ({
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn((success) => success({
    coords: {
      latitude: -27.4698,
      longitude: 153.0251,
      accuracy: 10,
    },
  })),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
}))

jest.mock('react-native-signature-canvas', () => 'SignatureCanvas')

jest.mock('react-native-url-polyfill/auto', () => ({}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithOtp: jest.fn(() => Promise.resolve({ error: null })),
      verifyOtp: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      refreshSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve()),
    },
  })),
}))

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => {
    const values = new Map()
    return {
      set: jest.fn((key, value) => values.set(key, value)),
      getString: jest.fn((key) => values.get(key)),
      delete: jest.fn((key) => values.delete(key)),
      clearAll: jest.fn(() => values.clear()),
    }
  }),
}))

jest.mock('react-native-config', () => ({}))

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')
