import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";

import { Text } from "./Text";
import { colors, radius, spacing } from "./theme";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  placeholder?: string;
  value?: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export function Select({ placeholder, value, options, onChange }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    const match = options.find((option) => option.value === value);
    return match?.label ?? "";
  }, [options, value]);

  const displayLabel = selectedLabel || placeholder || "Select";

  return (
    <>
      <Pressable style={styles.input} onPress={() => setIsOpen(true)}>
        <Text style={selectedLabel ? styles.valueText : styles.placeholderText}>{displayLabel}</Text>
      </Pressable>

      <Modal transparent animationType="fade" visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalCard}>
            <Text variant="subtitle">Выберите</Text>
            <ScrollView style={styles.optionList} contentContainerStyle={styles.optionContent}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.optionRow}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={option.value === value ? styles.optionActive : undefined}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  optionList: {
    marginTop: spacing.sm,
  },
  optionContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  optionRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
