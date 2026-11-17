/** El servidor respondió con un estado no exitoso. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

/** No hubo respuesta: sin red, servidor dormido o tiempo agotado. */
export class NetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('No se pudo conectar con el servidor', options);
    this.name = 'NetworkError';
  }
}

// Los interceptores (JWT y refresh) llegan en el Sprint 2.
export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      throw new NetworkError({ cause });
    }

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new HttpError(response.status, payload);
    }
    return payload as T;
  }
}
