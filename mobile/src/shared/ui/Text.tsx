import { Text as RNText, StyleSheet, TextProps as RNTextProps } from "react-native";

import { colors } from "./theme";

type TextProps = RNTextProps & {
  variant?: "title" | "body" | "caption" | "subtitle" | "heading";
};

export function Text({ style, variant = "body", ...props }: TextProps) {
  return <RNText style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.heading,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.heading,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
