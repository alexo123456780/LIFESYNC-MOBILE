import { API_URL } from '../config/env';
import { secureTokenStorage } from '../secure-store/token-storage';
import { HttpClient } from './http-client';

export const api = new HttpClient(API_URL, { tokenStorage: secureTokenStorage });
