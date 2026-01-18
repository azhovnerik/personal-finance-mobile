import { StyleSheet, TextInput, TextInputProps } from "react-native";

import { colors, radius, spacing } from "./theme";

type InputProps = TextInputProps & {
  isMultiline?: boolean;
};

export function Input({ style, isMultiline, ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, isMultiline && styles.multiline, style]}
      placeholderTextColor={colors.textSecondary}
      multiline={isMultiline}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
});
