import fs from 'node:fs';
import path from 'node:path';
import type { ExpoConfig } from 'expo/config';
import { AndroidConfig, withAndroidManifest, withDangerousMod } from 'expo/config-plugins';

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
</network-security-config>
`;

const withStrictHttpsTransport = (expoConfig: ExpoConfig): ExpoConfig => {
  const withManifest = withAndroidManifest(expoConfig, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.$['android:usesCleartextTraffic'] = 'false';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return mod;
  });

  return withDangerousMod(withManifest, [
    'android',
    async (mod) => {
      const xmlDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG_XML,
      );
      return mod;
    },
  ]);
};

// Permisos nativos declarados de forma restrictiva (RF-M17, LM-84) y bloqueo de tráfico HTTP en claro (LM-117).
const config = (): ExpoConfig =>
  withStrictHttpsTransport({
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
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
        },
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
  });

export default config;
