import { type ApiPort, HttpError, NetworkError } from './errors';
import type { RegisterInput } from './register-schema';

export type RegisterResult =
  | { status: 'created' }
  | { status: 'email_taken' }
  | { status: 'invalid'; message: string }
  | { status: 'unreachable' }
  | { status: 'server_error' };

const FALLBACK_MESSAGE = 'Revisa los datos ingresados';

const messageOf = (body: unknown): string => {
  const message = (body as { message?: unknown } | undefined)?.message;
  if (Array.isArray(message)) return message.join('. ');
  return typeof message === 'string' ? message : FALLBACK_MESSAGE;
};

/** Registra la cuenta y traduce las respuestas del servidor a resultados que la pantalla entiende. */
export async function registerUser(api: ApiPort, input: RegisterInput): Promise<RegisterResult> {
  try {
    await api.post('/auth/register', input);
    return { status: 'created' };
  } catch (error) {
    if (error instanceof NetworkError) return { status: 'unreachable' };
    if (error instanceof HttpError) {
      if (error.status === 409) return { status: 'email_taken' };
      if (error.status === 400) return { status: 'invalid', message: messageOf(error.body) };
      return { status: 'server_error' };
    }
    throw error;
  }
}
