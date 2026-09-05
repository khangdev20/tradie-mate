module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-.*|@sentry/react-native|@react-native-firebase|@nozbe/.*|@rnmapbox|@react-navigation/.*)/)',
  ],
};
