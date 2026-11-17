// Expo sustituye `process.env.EXPO_PUBLIC_*` en el build: debe leerse con el nombre literal.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL no está definida: se configura por perfil en eas.json');
}

export const API_URL: string = apiUrl.replace(/\/+$/, '');
