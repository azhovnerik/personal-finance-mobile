import { TextInput, TextInputProps, StyleSheet } from "react-native";

import { colors, radius, spacing } from "./theme";

type InputProps = TextInputProps;

export function Input({ style, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: 14,
  },
});
