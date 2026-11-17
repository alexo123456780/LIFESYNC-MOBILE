import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const schema = z.object({
  email: z
    .string()
    .min(1, 'Escribe tu correo electrónico')
    .max(254, 'El correo es demasiado largo')
    .pipe(z.email('Escribe un correo válido')),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`),
});

export interface RegisterInput {
  email: string;
  password: string;
}

export type RegisterValidation =
  | { ok: true; value: RegisterInput }
  | { ok: false; errors: Partial<Record<keyof RegisterInput, string>> };

/** Valida en el dispositivo, con las mismas reglas que el servidor, antes de enviar nada a la red. */
export function validateRegister(input: RegisterInput): RegisterValidation {
  const parsed = schema.safeParse({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: Partial<Record<keyof RegisterInput, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof RegisterInput;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
