import { Pressable, StyleSheet, Text as RNText, ViewStyle } from "react-native";

import { colors, radius, spacing } from "./theme";

type ChipProps = {
  label: string;
  isActive?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
};

export function Chip({ label, isActive, style, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isActive && styles.chipActive,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      <RNText style={[styles.text, isActive && styles.textActive]}>{label}</RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: "#dbeafe",
  },
  chipPressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  textActive: {
    color: colors.primaryDark,
  },
});
