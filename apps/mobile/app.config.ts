import type { ExpoConfig } from 'expo/config';

// Permisos, ATS y red segura se agregan aquí en el Sprint 3 y 4 (RF-M17, RF-E03 y RF-E04).
const config: ExpoConfig = {
  name: 'LifeSync',
  slug: 'lifesync',
  version: '0.1.0',
  scheme: 'lifesync',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: { package: 'com.lifesync.mobile' },
  ios: { bundleIdentifier: 'com.lifesync.mobile' },
  plugins: ['expo-router'],
};

export default config;
