import { HttpError, NetworkError } from '../../application/errors';

export { HttpError, NetworkError };

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
