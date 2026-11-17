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

/** Puerto mínimo que los casos de uso necesitan del cliente HTTP. */
export interface ApiPort {
  post<T>(path: string, body?: unknown): Promise<T>;
}
