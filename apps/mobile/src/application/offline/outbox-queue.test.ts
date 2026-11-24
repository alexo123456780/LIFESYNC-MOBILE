import { type CacheReadResult, type EncryptedCachePort } from '../health-records-repository';
import { flushOutbox, type HttpRequestExecutor, OutboxQueue } from './outbox-queue';

class MemoryEncryptedCache implements EncryptedCachePort {
  private store = new Map<string, unknown>();

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.parse(JSON.stringify(value)));
  }

  async get<T>(key: string): Promise<CacheReadResult<T>> {
    if (this.store.has(key)) {
      return { status: 'hit', value: this.store.get(key) as T };
    }
    return { status: 'miss' };
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

describe('OutboxQueue (LM-113)', () => {
  let cache: MemoryEncryptedCache;
  let queue: OutboxQueue;

  beforeEach(() => {
    cache = new MemoryEncryptedCache();
    queue = new OutboxQueue(cache);
  });

  it('guarda una escritura en la cola cifrada y la marca como pendiente', async () => {
    const item = await queue.enqueue({
      url: '/health-records/allergies',
      method: 'POST',
      body: { name: 'Maní', severity: 'SEVERE' },
    });

    expect(item.status).toBe('pending');
    expect(item.url).toBe('/health-records/allergies');

    const items = await queue.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(item.id);
    expect(items[0].status).toBe('pending');
  });

  it('la cola sobrevive a reinicios de app (re-instanciando la cola con la misma caché)', async () => {
    await queue.enqueue({
      url: '/health-records/profile',
      method: 'PUT',
      body: { bloodType: 'AB_POS' },
    });

    // Nueva instancia de cola compartiendo la caché persistente
    const freshQueue = new OutboxQueue(cache);
    const items = await freshQueue.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].body).toEqual({ bloodType: 'AB_POS' });
  });

  it('clear() borra todos los elementos de la cola (cierre de sesión)', async () => {
    await queue.enqueue({ url: '/test', method: 'POST' });
    await queue.clear();
    const items = await queue.getItems();
    expect(items).toHaveLength(0);
  });
});

describe('flushOutbox (LM-114)', () => {
  let cache: MemoryEncryptedCache;
  let queue: OutboxQueue;
  let mockExecutor: HttpRequestExecutor;

  beforeEach(() => {
    cache = new MemoryEncryptedCache();
    queue = new OutboxQueue(cache);
  });

  it('al volver la red, envía las peticiones en orden FIFO y las retira de la cola', async () => {
    await queue.enqueue({ url: '/first', method: 'POST' });
    await queue.enqueue({ url: '/second', method: 'POST' });

    const executionOrder: string[] = [];
    mockExecutor = {
      request: jest.fn().mockImplementation(async (_method, url) => {
        executionOrder.push(url);
        return { status: 201 };
      }),
    };

    const result = await flushOutbox(queue, mockExecutor);
    expect(result.confirmed).toBe(2);
    expect(executionOrder).toEqual(['/first', '/second']);

    const remaining = await queue.getItems();
    expect(remaining).toHaveLength(0);
  });

  it('maneja rechazos 400 marcándolos como fallidos y no los reintenta indefinidamente', async () => {
    await queue.enqueue({ url: '/invalid', method: 'POST', body: { bad: 'data' } });

    mockExecutor = {
      request: jest.fn().mockResolvedValue({ status: 400 }),
    };

    const result = await flushOutbox(queue, mockExecutor);
    expect(result.rejected).toBe(1);

    const items = await queue.getItems();
    expect(items[0].status).toBe('failed');
    expect(items[0].error).toContain('400');

    // Siguiente flush: no debe reintentar el fallido
    const secondResult = await flushOutbox(queue, mockExecutor);
    expect(secondResult.processed).toBe(0);
    expect(mockExecutor.request).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red interrumpe el procesamiento y mantiene los cambios en la cola', async () => {
    await queue.enqueue({ url: '/offline-1', method: 'POST' });
    await queue.enqueue({ url: '/offline-2', method: 'POST' });

    mockExecutor = {
      request: jest.fn().mockRejectedValue(new Error('Network failure')),
    };

    const result = await flushOutbox(queue, mockExecutor);
    expect(result.networkInterrupted).toBe(true);
    expect(result.confirmed).toBe(0);

    const remaining = await queue.getItems();
    expect(remaining).toHaveLength(2);
    expect(remaining[0].status).toBe('pending');
  });
});
