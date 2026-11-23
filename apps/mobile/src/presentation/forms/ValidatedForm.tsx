import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components';
import { spacing } from '../theme';

interface ValidatedFormProps {
  children: ReactNode;
  submitLabel?: string;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

/** Contenedor reutilizable que agrupa campos validados y el botón de guardado bloqueable. */
export function ValidatedForm({
  children,
  submitLabel = 'Guardar',
  canSubmit,
  submitting,
  onSubmit,
}: ValidatedFormProps) {
  return (
    <View style={styles.container}>
      {children}
      <Button label={submitLabel} onPress={onSubmit} disabled={!canSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
});
