import { Pressable, StyleSheet, Switch, Text, type TextInputProps, View } from 'react-native';
import type { z } from 'zod';
import { TextField } from '../components';
import {
  MAX_FONT_SCALE,
  MIN_TOUCH_TARGET,
  borderWidth,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../theme';
import { ValidatedForm } from './ValidatedForm';
import { useValidatedForm } from './use-validated-form';

export interface SelectOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

interface BaseFieldDef<TKey extends string> {
  name: TKey;
  label: string;
}

export interface TextFieldDef<TKey extends string> extends BaseFieldDef<TKey> {
  kind: 'text';
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  maxLength?: number;
}

export interface SelectFieldDef<
  TKey extends string,
  TValue extends string = string,
> extends BaseFieldDef<TKey> {
  kind: 'select';
  options: readonly SelectOption<TValue>[];
  allowClear?: boolean;
}

export interface SwitchFieldDef<TKey extends string> extends BaseFieldDef<TKey> {
  kind: 'switch';
  description?: string;
}

export interface DateFieldDef<TKey extends string> extends BaseFieldDef<TKey> {
  kind: 'date';
  hint?: string;
}

export type FieldDefinition<TKey extends string = string> =
  TextFieldDef<TKey> | SelectFieldDef<TKey> | SwitchFieldDef<TKey> | DateFieldDef<TKey>;

export interface DynamicFormProps<TValues extends Record<string, unknown>, TOutput> {
  fields: readonly FieldDefinition<Extract<keyof TValues, string>>[];
  schema: z.ZodType<TOutput>;
  initialValues: TValues;
  submitLabel?: string;
  onSubmit: (value: TOutput) => Promise<void> | void;
}

/**
 * Motor de formularios dinámicos reutilizable (LM-67):
 * renderiza texto, selección, interruptor y fecha a partir de una definición declarativa,
 * con validación Zod, etiquetas accesibles y objetivos táctiles de al menos 44 px.
 */
export function DynamicForm<TValues extends Record<string, unknown>, TOutput>({
  fields,
  schema,
  initialValues,
  submitLabel = 'Guardar',
  onSubmit,
}: DynamicFormProps<TValues, TOutput>) {
  const form = useValidatedForm({ schema, initialValues, onSubmit });

  return (
    <ValidatedForm
      submitLabel={submitLabel}
      canSubmit={form.canSubmit}
      submitting={form.submitting}
      onSubmit={() => void form.submit()}
    >
      {fields.map((field) => {
        const error = form.errors[field.name];
        const rawValue = form.values[field.name];

        if (field.kind === 'text') {
          return (
            <TextField
              key={field.name}
              label={field.label}
              value={typeof rawValue === 'string' ? rawValue : String(rawValue ?? '')}
              onChangeText={(text) =>
                form.setFieldValue(field.name, text as TValues[typeof field.name])
              }
              keyboardType={field.keyboardType}
              autoCapitalize={field.autoCapitalize}
              maxLength={field.maxLength}
              editable={!form.submitting}
              error={error}
            />
          );
        }

        if (field.kind === 'date') {
          return (
            <View key={field.name} style={styles.fieldGroup}>
              <TextField
                label={field.label}
                value={typeof rawValue === 'string' ? rawValue : ''}
                onChangeText={(text) =>
                  form.setFieldValue(field.name, text as TValues[typeof field.name])
                }
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                maxLength={30}
                editable={!form.submitting}
                error={error}
              />
              {field.hint ? (
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint}>
                  {field.hint}
                </Text>
              ) : null}
            </View>
          );
        }

        if (field.kind === 'switch') {
          const checked = Boolean(rawValue);
          return (
            <View key={field.name} style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label}>
                    {field.label}
                  </Text>
                  {field.description ? (
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint}>
                      {field.description}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  accessibilityLabel={field.label}
                  accessibilityRole="switch"
                  accessibilityState={{ checked, disabled: form.submitting }}
                  value={checked}
                  disabled={form.submitting}
                  onValueChange={(next) =>
                    form.setFieldValue(field.name, next as TValues[typeof field.name])
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>
              {error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={styles.error}
                >
                  {error}
                </Text>
              ) : null}
            </View>
          );
        }

        return (
          <View
            key={field.name}
            accessibilityRole="radiogroup"
            accessibilityLabel={field.label}
            style={styles.fieldGroup}
          >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label}>
              {field.label}
            </Text>
            <View style={styles.optionsWrap}>
              {field.options.map((option) => {
                const selected = rawValue === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${field.label}: ${option.label}`}
                    accessibilityState={{ selected, disabled: form.submitting }}
                    disabled={form.submitting}
                    onPress={() => {
                      const nextValue = selected && field.allowClear ? null : option.value;
                      form.setFieldValue(field.name, nextValue as TValues[typeof field.name]);
                    }}
                    style={[
                      styles.optionChip,
                      selected ? styles.optionChipSelected : null,
                      error ? styles.optionChipError : null,
                    ]}
                  >
                    <Text
                      maxFontSizeMultiplier={MAX_FONT_SCALE}
                      style={[styles.optionText, selected ? styles.optionTextSelected : null]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={styles.error}
              >
                {error}
              </Text>
            ) : null}
          </View>
        );
      })}
    </ValidatedForm>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text },
  hint: { fontSize: fontSize.caption, color: colors.textMuted },
  error: { fontSize: fontSize.caption, color: colors.danger },
  switchRow: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchLabelWrap: { flex: 1, gap: spacing.xs },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipError: {
    borderColor: colors.danger,
  },
  optionText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.onPrimary,
  },
});
