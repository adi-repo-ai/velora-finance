const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// expo/metro-config detects the pnpm workspace and watches the shared packages.
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './src/global.css' });
