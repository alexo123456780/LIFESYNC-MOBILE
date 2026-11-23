import { createHealthRecordsRepository } from '../../application/health-records-repository';
import { encryptedCache } from '../cache/local-cache';
import { api } from '../http/api';

export const healthRecordsRepository = createHealthRecordsRepository(api, encryptedCache);
