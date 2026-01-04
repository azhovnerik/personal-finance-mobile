import {
  Pressable,
  StyleSheet,
  Text as RNText,
  ViewStyle,
  PressableProps,
} from "react-native";

type ButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary";
  style?: ViewStyle;
};

export function Button({ title, variant = "primary", style, ...props }: ButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      <RNText style={[styles.text, styles[`${variant}Text`]]}>{title}</RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#2563eb",
  },
  secondary: {
    backgroundColor: "#e5e7eb",
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: "#ffffff",
  },
  secondaryText: {
    color: "#111827",
  },
});
