// Cola persistente de escrituras pendientes (Outbox) cifrada en la caché local (LM-113, LM-114, RF-M20)
import type { EncryptedCachePort } from '../health-records-repository';

export interface OutboxItem {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  createdAt: number;
  status: 'pending' | 'failed';
  error?: string;
}

const OUTBOX_CACHE_KEY = 'outbox.queue';

export class OutboxQueue {
  constructor(private readonly cache: EncryptedCachePort) {}

  async enqueue(item: Omit<OutboxItem, 'id' | 'createdAt' | 'status'>): Promise<OutboxItem> {
    const fullItem: OutboxItem = {
      ...item,
      id: `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      createdAt: Date.now(),
      status: 'pending',
    };

    const current = await this.getItems();
    current.push(fullItem);
    await this.cache.set(OUTBOX_CACHE_KEY, current);
    return fullItem;
  }

  async getItems(): Promise<OutboxItem[]> {
    const res = await this.cache.get<OutboxItem[]>(OUTBOX_CACHE_KEY);
    if (res.status === 'hit' && Array.isArray(res.value)) {
      return res.value;
    }
    return [];
  }

  async removeItem(id: string): Promise<void> {
    const current = await this.getItems();
    const filtered = current.filter((i) => i.id !== id);
    await this.cache.set(OUTBOX_CACHE_KEY, filtered);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const current = await this.getItems();
    const updated = current.map((i) =>
      i.id === id ? { ...i, status: 'failed' as const, error } : i,
    );
    await this.cache.set(OUTBOX_CACHE_KEY, updated);
  }

  async clear(): Promise<void> {
    await this.cache.set(OUTBOX_CACHE_KEY, []);
  }
}

export interface HttpRequestExecutor {
  request: (
    method: string,
    url: string,
    body?: unknown,
  ) => Promise<{ status: number; data?: unknown }>;
}

export interface FlushResult {
  processed: number;
  confirmed: number;
  rejected: number;
  networkInterrupted: boolean;
}

/**
 * Procesa la cola de escrituras pendientes en orden FIFO (LM-114):
 * - Confirma y retira de la cola peticiones exitosas (2xx).
 * - Maneja rechazos 400 marcándolos como fallidos sin reintentar indefinidamente.
 * - Detiene el procesamiento ante falla de red, preservando la cola para reintento posterior.
 */
export async function flushOutbox(
  queue: OutboxQueue,
  executor: HttpRequestExecutor,
): Promise<FlushResult> {
  const items = await queue.getItems();
  const result: FlushResult = {
    processed: 0,
    confirmed: 0,
    rejected: 0,
    networkInterrupted: false,
  };

  for (const item of items) {
    if (item.status === 'failed') {
      // No reintentar indefinidamente items ya rechazados con 400
      continue;
    }

    result.processed++;
    try {
      const response = await executor.request(item.method, item.url, item.body);
      if (response.status >= 200 && response.status < 300) {
        await queue.removeItem(item.id);
        result.confirmed++;
      } else if (response.status === 400) {
        // Rechazo 400: error de validación o sintaxis, se informa y marca con error
        await queue.markFailed(item.id, 'Petición rechazada por validación del servidor (400)');
        result.rejected++;
      } else {
        // Otro código de servidor temporal: detener
        result.networkInterrupted = true;
        break;
      }
    } catch {
      // Falla de red: interrumpir y mantener en la cola para cuando vuelva la red
      result.networkInterrupted = true;
      break;
    }
  }

  return result;
}
