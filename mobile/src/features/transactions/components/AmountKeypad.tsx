import { Pressable, StyleSheet, View } from "react-native";

import { Text, colors, spacing } from "../../../shared/ui";

type AmountKeypadProps = {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  doneLabel?: string;
};

const KEYPAD_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0", "000", "."],
];

export function AmountKeypad({ value, onChange, onDone, doneLabel = "ГОТОВО" }: AmountKeypadProps) {
  const appendDigit = (digit: string) => {
    const next = value === "0" ? digit : `${value}${digit}`;
    onChange(next);
  };

  const appendDecimal = () => {
    if (value.includes(".")) {
      return;
    }
    onChange(`${value}.`);
  };

  const clearAmount = () => {
    onChange("0");
  };

  const deleteLast = () => {
    const next = value.length > 1 ? value.slice(0, -1) : "0";
    onChange(next);
  };

  return (
    <View style={styles.keypad}>
      <View style={styles.keypadTopRow}>
        <Text style={styles.keypadPreview}>{value}</Text>
        <View style={styles.keypadTopActions}>
          <Pressable style={[styles.keypadAction, styles.keypadClear]} onPress={clearAmount}>
            <Text style={styles.keypadActionText}>C</Text>
          </Pressable>
          <Pressable style={[styles.keypadAction, styles.keypadDelete]} onPress={deleteLast}>
            <Text style={styles.keypadActionText}>⌫</Text>
          </Pressable>
        </View>
      </View>
      {KEYPAD_ROWS.map((row) => (
        <View key={row.join("-")} style={styles.keypadRow}>
          {row.map((key) => {
            const onPress = key === "." ? appendDecimal : () => appendDigit(key);
            return (
              <Pressable key={key} style={styles.keypadKey} onPress={onPress}>
                <Text style={styles.keypadKeyText}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Pressable style={[styles.keypadKey, styles.keypadDone]} onPress={onDone}>
        <Text style={[styles.keypadKeyText, styles.keypadDoneText]}>{doneLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#1f1f1f",
    padding: spacing.md,
    gap: spacing.sm,
  },
  keypadTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  keypadTopActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  keypadPreview: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "600",
  },
  keypadAction: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  keypadClear: {
    backgroundColor: "#2a2a2a",
  },
  keypadDelete: {
    backgroundColor: "#2f2f2f",
  },
  keypadActionText: {
    color: "#38d169",
    fontWeight: "700",
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  keypadKey: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyText: {
    color: "#38d169",
    fontSize: 18,
    fontWeight: "600",
  },
  keypadDone: {
    marginTop: spacing.sm,
    backgroundColor: "#38d169",
  },
  keypadDoneText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
