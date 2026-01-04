import { Text as RNText, StyleSheet, TextProps as RNTextProps } from "react-native";

type TextProps = RNTextProps & {
  variant?: "title" | "body" | "caption";
};

export function Text({ style, variant = "body", ...props }: TextProps) {
  return (
    <RNText
      style={[styles.base, styles[variant], style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#111827",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
  },
  caption: {
    fontSize: 12,
    color: "#6b7280",
  },
});
