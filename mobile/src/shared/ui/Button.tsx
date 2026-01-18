import {
  Pressable,
  StyleSheet,
  Text as RNText,
  ViewStyle,
  PressableProps,
} from "react-native";

import { colors, radius, spacing } from "./theme";

type ButtonTone = "primary" | "secondary" | "success" | "danger" | "info";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  tone?: ButtonTone;
  size?: ButtonSize;
  style?: ViewStyle;
};

const toneColors: Record<ButtonTone, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  success: colors.success,
  danger: colors.danger,
  info: colors.info,
};

export function Button({
  title,
  variant = "primary",
  tone = "primary",
  size = "md",
  style,
  ...props
}: ButtonProps) {
  const toneColor = toneColors[tone];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[`size${size}`],
        styles[variant],
        variant === "outline" && { borderColor: toneColor },
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      <RNText
        style={[
          styles.text,
          styles[`text${size}`],
          styles[`${variant}Text`],
          variant === "outline" && { color: toneColor },
        ]}
      >
        {title}
      </RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  sizesm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sizemd: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sizelg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: colors.surface,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontWeight: "600",
  },
  textsm: {
    fontSize: 12,
  },
  textmd: {
    fontSize: 14,
  },
  textlg: {
    fontSize: 16,
  },
  primaryText: {
    color: colors.surface,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
});
