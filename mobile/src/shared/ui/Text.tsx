import { Text as RNText, StyleSheet, TextProps as RNTextProps } from "react-native";

import { colors } from "./theme";

type TextProps = RNTextProps & {
  variant?: "title" | "body" | "caption" | "subtitle";
};

export function Text({ style, variant = "body", ...props }: TextProps) {
  return <RNText style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
