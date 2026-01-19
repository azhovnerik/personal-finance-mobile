import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";

import { Text } from "./Text";
import { colors, radius, spacing } from "./theme";

type DateInputProps = {
  value?: string | null;
  placeholder?: string;
  onChange: (value: string) => void;
};

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const padNumber = (value: number) => value.toString().padStart(2, "0");

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export function DateInput({ value, placeholder, onChange }: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => parseDate(value) ?? new Date());

  const selectedDate = useMemo(() => parseDate(value), [value]);

  const calendarDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekdayIndex = (firstDay.getDay() + 6) % 7;
    const days: Array<number | null> = Array.from({ length: weekdayIndex }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(day);
    }
    return days;
  }, [monthCursor]);

  const label = selectedDate ? formatDate(selectedDate) : placeholder ?? "Выберите дату";

  return (
    <>
      <Pressable style={styles.input} onPress={() => setIsOpen(true)}>
        <Text style={selectedDate ? styles.valueText : styles.placeholderText}>{label}</Text>
      </Pressable>

      <Modal transparent animationType="fade" visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Pressable
                style={styles.navButton}
                onPress={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
              >
                <Text>‹</Text>
              </Pressable>
              <Text variant="subtitle">
                {monthCursor.toLocaleDateString("uk-UA", { month: "long", year: "numeric" })}
              </Text>
              <Pressable
                style={styles.navButton}
                onPress={() =>
                  setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
              >
                <Text>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((day) => (
                <Text key={day} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
                const dateValue = formatDate(date);
                const isSelected = selectedDate ? formatDate(selectedDate) === dateValue : false;
                return (
                  <Pressable
                    key={dateValue}
                    style={[styles.dayCell, isSelected && styles.dayCellActive]}
                    onPress={() => {
                      onChange(dateValue);
                      setIsOpen(false);
                    }}
                  >
                    <Text style={isSelected ? styles.dayTextActive : styles.dayText}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
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
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekLabel: {
    width: 32,
    textAlign: "center",
    fontSize: 12,
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  dayCell: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  dayCellActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.textPrimary,
  },
  dayTextActive: {
    color: colors.surface,
    fontWeight: "600",
  },
});
