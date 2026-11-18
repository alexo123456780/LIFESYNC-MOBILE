import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Borra la caché local. Hoy guarda solo datos de la app (el historial cifrado llega en el Sprint 2);
 * los tokens nunca van aquí: viven únicamente en SecureStore.
 */
export const clearLocalCache = (): Promise<void> => AsyncStorage.clear();
