const { getDefaultConfig } = require('expo/metro-config');

// WatermelonDB doesn't need a custom transformer for Expo
// Babel handles decorators via babel.config.js
const config = getDefaultConfig(__dirname);

module.exports = config;
