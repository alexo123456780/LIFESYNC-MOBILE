import { API_URL } from '../config/env';
import { HttpClient } from './http-client';

export const api = new HttpClient(API_URL);
