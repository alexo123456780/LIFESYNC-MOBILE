import type {
  AllergyValue,
  BloodType,
  EmergencyContactValue,
  HealthProfileValue,
  MedicationValue,
  Severity,
} from '../domain/health-schemas';
import { NetworkError } from './errors';

export interface HealthProfileRecord {
  id: string | null;
  bloodType: BloodType | null;
  notes: string | null;
}

export interface AllergyRecord {
  id: string;
  name: string;
  severity: Severity;
}

export interface MedicationRecord {
  id: string;
  name: string;
  dose: string;
  frequencyHours: number;
  controlled: boolean;
  startsAt: string;
  endsAt: string | null;
}

export interface EmergencyContactRecord {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export type CacheReadResult<T> =
  { status: 'hit'; value: T } | { status: 'miss' } | { status: 'corrupted' };

export interface EncryptedCachePort {
  set<T>(key: string, value: T): Promise<void>;
  get<T>(key: string): Promise<CacheReadResult<T>>;
  clear(): Promise<void>;
}

export interface ClinicalApiPort {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export interface FetchResult<T> {
  data: T;
  fromCache: boolean;
}

export class OfflineCacheError extends Error {
  constructor(readonly reason: 'empty' | 'corrupted') {
    super(
      reason === 'corrupted'
        ? 'Los datos locales no pudieron descifrarse. Conéctate a internet para resincronizar.'
        : 'Sin conexión y sin datos guardados todavía. Conéctate a internet para sincronizar.',
    );
    this.name = 'OfflineCacheError';
  }
}

const CACHE_KEYS = {
  profile: 'profile',
  allergies: 'allergies',
  medications: 'medications',
  contacts: 'contacts',
} as const;

export interface HealthRecordsRepository {
  getProfile(): Promise<FetchResult<HealthProfileRecord>>;
  saveProfile(input: HealthProfileValue): Promise<HealthProfileRecord>;
  listAllergies(): Promise<FetchResult<AllergyRecord[]>>;
  createAllergy(input: AllergyValue): Promise<AllergyRecord>;
  updateAllergy(id: string, input: AllergyValue): Promise<AllergyRecord>;
  deleteAllergy(id: string): Promise<void>;
  listMedications(): Promise<FetchResult<MedicationRecord[]>>;
  createMedication(input: MedicationValue): Promise<MedicationRecord>;
  updateMedication(id: string, input: MedicationValue): Promise<MedicationRecord>;
  deleteMedication(id: string): Promise<void>;
  listContacts(): Promise<FetchResult<EmergencyContactRecord[]>>;
  createContact(input: EmergencyContactValue): Promise<EmergencyContactRecord>;
  updateContact(id: string, input: EmergencyContactValue): Promise<EmergencyContactRecord>;
  deleteContact(id: string): Promise<void>;
}

/**
 * Repositorio clínico offline-first para lecturas (LM-78):
 * con red refresca la caché cifrada; sin red devuelve la última copia cifrada sin crash.
 */
export function createHealthRecordsRepository(
  api: ClinicalApiPort,
  cache: EncryptedCachePort,
): HealthRecordsRepository {
  async function readWithCache<T>(path: string, cacheKey: string): Promise<FetchResult<T>> {
    try {
      const data = await api.get<T>(path);
      await cache.set(cacheKey, data).catch(() => {});
      return { data, fromCache: false };
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
      const cached = await cache.get<T>(cacheKey);
      if (cached.status === 'hit') {
        return { data: cached.value, fromCache: true };
      }
      throw new OfflineCacheError(cached.status === 'corrupted' ? 'corrupted' : 'empty');
    }
  }

  return {
    getProfile: () =>
      readWithCache<HealthProfileRecord>('/health-records/profile', CACHE_KEYS.profile),
    async saveProfile(input) {
      const saved = await api.put<HealthProfileRecord>('/health-records/profile', input);
      await cache.set(CACHE_KEYS.profile, saved).catch(() => {});
      return saved;
    },

    listAllergies: () =>
      readWithCache<AllergyRecord[]>('/health-records/allergies', CACHE_KEYS.allergies),
    createAllergy: (input) => api.post<AllergyRecord>('/health-records/allergies', input),
    updateAllergy: (id, input) => api.put<AllergyRecord>(`/health-records/allergies/${id}`, input),
    deleteAllergy: (id) => api.delete<void>(`/health-records/allergies/${id}`),

    listMedications: () =>
      readWithCache<MedicationRecord[]>('/health-records/medications', CACHE_KEYS.medications),
    createMedication: (input) => api.post<MedicationRecord>('/health-records/medications', input),
    updateMedication: (id, input) =>
      api.put<MedicationRecord>(`/health-records/medications/${id}`, input),
    deleteMedication: (id) => api.delete<void>(`/health-records/medications/${id}`),

    listContacts: () =>
      readWithCache<EmergencyContactRecord[]>('/health-records/contacts', CACHE_KEYS.contacts),
    createContact: (input) => api.post<EmergencyContactRecord>('/health-records/contacts', input),
    updateContact: (id, input) =>
      api.put<EmergencyContactRecord>(`/health-records/contacts/${id}`, input),
    deleteContact: (id) => api.delete<void>(`/health-records/contacts/${id}`),
  };
}
