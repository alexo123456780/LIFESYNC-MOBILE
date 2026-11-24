import type { ExpoConfig } from 'expo/config';

// Permisos nativos declarados de forma restrictiva (RF-M17, LM-84): únicamente cámara y ubicación.
const config: ExpoConfig = {
  name: 'LifeSync',
  slug: 'lifesync',
  version: '0.1.0',
  scheme: 'lifesync',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: 'com.lifesync.mobile',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },
  ios: {
    bundleIdentifier: 'com.lifesync.mobile',
    infoPlist: {
      NSCameraUsageDescription:
        'LifeSync necesita acceso a la cámara para escanear y adjuntar recetas médicas a tu historial.',
      NSLocationWhenInUseUsageDescription:
        'LifeSync necesita tu ubicación para registrar el lugar exacto en caso de un incidente médico.',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission:
          'LifeSync necesita acceso a la cámara para escanear y adjuntar recetas médicas a tu historial.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'LifeSync necesita tu ubicación para registrar el lugar exacto en caso de un incidente médico.',
      },
    ],
  ],
  owner: 'joselomalles-team',
  extra: {
    eas: {
      projectId: 'faa0e676-1b33-4d1c-9795-422397f0be1f',
    },
  },
};

export default config;
