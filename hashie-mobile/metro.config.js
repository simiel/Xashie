const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// pnpm can create more than one peer-resolved React Native path. Ensure every
// dependency, including Clerk, resolves React's singleton runtime from Hashie's
// direct dependencies rather than loading a second React Native initializer.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.join(__dirname, 'node_modules/react'),
  'react-native': path.join(__dirname, 'node_modules/react-native'),
};

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});
