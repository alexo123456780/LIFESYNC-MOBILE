import { HttpError, NetworkError, type RequestOptions } from '../../application/errors';
import type { TokenStorage } from '../../application/token-storage';

export { HttpError, NetworkError };

export interface HttpClientOptions {
  tokenStorage?: TokenStorage;
  onAuthFailure?: () => Promise<void> | void;
}

interface RefreshTokenPayload {
  access_token?: string;
  refresh_token?: string;
}

/**
 * Cliente HTTP con interceptor de request (inyecta `Authorization: Bearer <JWT>` desde SecureStore)
 * e interceptor de respuesta con refresh single-flight ante `401` (LM-53 / LM-64 / LM-65).
 */
export class HttpClient {
  private readonly tokenStorage?: TokenStorage;
  private onAuthFailure?: () => Promise<void> | void;
  private refreshInFlight?: Promise<string | null>;

  constructor(
    private readonly baseUrl: string,
    options: HttpClientOptions = {},
  ) {
    this.tokenStorage = options.tokenStorage;
    this.onAuthFailure = options.onAuthFailure;
  }

  setAuthFailureHandler(handler: (() => Promise<void> | void) | undefined): void {
    this.onAuthFailure = handler;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
    retried = false,
  ): Promise<T> {
    const headers = await this.buildHeaders(body, options);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      throw new NetworkError({ cause });
    }

    if (
      response.status === 401 &&
      !retried &&
      !options?.skipAuth &&
      path !== '/oauth/token' &&
      this.tokenStorage
    ) {
      const nextAccessToken = await this.refreshSingleFlight();
      if (nextAccessToken) {
        return this.request<T>(
          method,
          path,
          body,
          {
            ...options,
            headers: { ...options?.headers, Authorization: `Bearer ${nextAccessToken}` },
          },
          true,
        );
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    let payload: unknown;
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => undefined);
    } else {
      payload = await response.text().catch(() => undefined);
    }
    if (!response.ok) {
      throw new HttpError(response.status, payload);
    }
    return payload as T;
  }

  private async buildHeaders(
    body: unknown,
    options?: RequestOptions,
  ): Promise<Record<string, string> | undefined> {
    const merged: Record<string, string> = {};
    if (body !== undefined) {
      merged['Content-Type'] = 'application/json';
    }
    if (options?.headers) {
      Object.assign(merged, options.headers);
    }

    if (this.tokenStorage && !options?.skipAuth && !merged.Authorization) {
      const tokens = await this.tokenStorage.load();
      if (tokens?.accessToken) {
        merged.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }

    return Object.keys(merged).length === 0 ? undefined : merged;
  }

  /** Garantiza un único refresh simultáneo ante múltiples respuestas 401. */
  private refreshSingleFlight(): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh().finally(() => {
        this.refreshInFlight = undefined;
      });
    }
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<string | null> {
    if (!this.tokenStorage) return null;

    const current = await this.tokenStorage.load();
    if (!current?.refreshToken) {
      await this.expireSession();
      return null;
    }

    let response: Response;
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: current.refreshToken,
      });
      response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
    } catch {
      return null;
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 400) {
        await this.expireSession();
      }
      return null;
    }

    const payload = (await response.json().catch(() => null)) as RefreshTokenPayload | null;
    if (!payload?.access_token || !payload?.refresh_token) {
      await this.expireSession();
      return null;
    }

    await this.tokenStorage.save({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
    });
    return payload.access_token;
  }

  private async expireSession(): Promise<void> {
    await this.tokenStorage?.clear().catch(() => {});
    await this.onAuthFailure?.();
  }
}
