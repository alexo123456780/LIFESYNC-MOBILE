import { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { z } from 'zod';
import { type FieldErrors, validateWithSchema } from '../../domain/health-schemas';

export interface UseValidatedFormOptions<TValues extends Record<string, unknown>, TOutput> {
  schema: z.ZodType<TOutput>;
  initialValues: TValues;
  onSubmit: (value: TOutput) => Promise<void> | void;
}

export interface UseValidatedFormResult<TValues extends Record<string, unknown>, TOutput> {
  values: TValues;
  errors: FieldErrors<Extract<keyof TValues, string>>;
  submitting: boolean;
  hasErrors: boolean;
  canSubmit: boolean;
  setFieldValue: <K extends Extract<keyof TValues, string>>(field: K, value: TValues[K]) => void;
  submit: () => Promise<{ ok: true; value: TOutput } | { ok: false }>;
  reset: (nextValues?: TValues) => void;
}

/**
 * Conecta un esquema Zod del dominio con formularios accesibles:
 * muestra errores por campo, los anuncia a lectores de pantalla y bloquea el envío inválido.
 */
export function useValidatedForm<TValues extends Record<string, unknown>, TOutput>({
  schema,
  initialValues,
  onSubmit,
}: UseValidatedFormOptions<TValues, TOutput>): UseValidatedFormResult<TValues, TOutput> {
  type FieldKey = Extract<keyof TValues, string>;

  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<FieldKey>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);
  const canSubmit = !hasErrors && !submitting;

  const setFieldValue = useCallback(
    <K extends FieldKey>(field: K, value: TValues[K]) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        if (hasSubmitted || Object.keys(errors).length > 0) {
          const check = validateWithSchema<TOutput, FieldKey>(schema, next);
          setErrors(check.ok ? {} : check.errors);
        }
        return next;
      });
    },
    [errors, hasSubmitted, schema],
  );

  const submit = useCallback(async (): Promise<{ ok: true; value: TOutput } | { ok: false }> => {
    if (submitting) return { ok: false };
    setHasSubmitted(true);

    const check = validateWithSchema<TOutput, FieldKey>(schema, values);
    if (!check.ok) {
      setErrors(check.errors);
      const messages = Object.values(check.errors).filter((msg): msg is string => Boolean(msg));
      if (messages.length > 0) {
        AccessibilityInfo.announceForAccessibility(
          `Revisa los errores del formulario: ${messages.join('. ')}`,
        );
      }
      return { ok: false };
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(check.value);
      return { ok: true, value: check.value };
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, schema, submitting, values]);

  const reset = useCallback(
    (nextValues?: TValues) => {
      setValues(nextValues ?? initialValues);
      setErrors({});
      setHasSubmitted(false);
    },
    [initialValues],
  );

  return {
    values,
    errors,
    submitting,
    hasErrors,
    canSubmit,
    setFieldValue,
    submit,
    reset,
  };
}
