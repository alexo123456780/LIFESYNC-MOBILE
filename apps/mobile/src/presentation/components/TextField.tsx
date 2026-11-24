import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
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

interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
  | 'editable'
  | 'maxLength'
  | 'placeholder'
> {
  label: string;
  /** Mensaje de validación: pone el campo en estado de error. */
  error?: string;
}

export function TextField({ label, error, editable = true, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        editable={editable}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        accessibilityHint={error}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[
          styles.input,
          error ? styles.inputError : null,
          !editable ? styles.inputDisabled : null,
        ]}
      />
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

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  inputError: { borderColor: colors.danger, borderWidth: borderWidth.thick },
  inputDisabled: { backgroundColor: colors.disabledSurface, color: colors.onDisabled },
  error: { fontSize: fontSize.caption, color: colors.danger },
});
