import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, spacing } from "./theme";

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
  onPress?: () => void;
}>;

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
  },
});
