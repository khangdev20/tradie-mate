const React = require('react')

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
}))

const createNavigatorMock = () => ({
  Navigator: ({ children }) => children,
  Screen: ({ component: Component }) => (Component ? React.createElement(Component) : null),
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
