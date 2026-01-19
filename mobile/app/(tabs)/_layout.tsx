import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";

import {
  Button,
  DateInput,
  Input,
  Select,
  Text,
  colors,
  spacing,
} from "../../src/shared/ui";
import { mockAccounts, mockTransactions, mockUser } from "../../src/shared/mocks";

export default function TabsLayout() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formState, setFormState] = useState({
    amount: "555",
    categoryId: null as string | null,
    note: "",
    date: "2026-01-19",
    accountId: null as string | null,
  });

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    mockTransactions.forEach((transaction) => {
      map.set(transaction.category.id, transaction.category.name);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, []);

  const accountOptions = useMemo(() => {
    return mockAccounts.map((account) => ({ value: account.id, label: account.name }));
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Главная" }} />
        <Tabs.Screen name="transactions" options={{ title: "Транзакции" }} />
        <Tabs.Screen
          name="add"
          options={{
            title: "",
            tabBarLabel: "",
            tabBarButton: () => (
              <Pressable style={styles.addButtonWrapper} onPress={() => setIsAddOpen(true)}>
                <View style={styles.addButton}>
                  <Text style={styles.addButtonLabel}>+</Text>
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen name="budgets" options={{ title: "Бюджеты" }} />
        <Tabs.Screen name="more" options={{ title: "Ещё" }} />
      </Tabs>

      <Modal animationType="slide" transparent={false} visible={isAddOpen} onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setIsAddOpen(false)}>
              <Text style={styles.modalAction}>Отмена</Text>
            </Pressable>
            <Text variant="subtitle">Добавить операцию</Text>
            <View style={styles.modalActionSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.amountRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>{mockUser.baseCurrency ?? "UAH"}</Text>
              </View>
              <View style={styles.amountInput}>
                <Text variant="caption">Сумма</Text>
                <Input
                  keyboardType="numeric"
                  value={formState.amount}
                  onChangeText={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
                />
              </View>
            </View>

            <Select
              placeholder="Категория"
              value={formState.categoryId}
              options={categoryOptions}
              onChange={(value) => setFormState((prev) => ({ ...prev, categoryId: value }))}
            />

            <Input
              placeholder="Примечание"
              value={formState.note}
              onChangeText={(value) => setFormState((prev) => ({ ...prev, note: value }))}
            />

            <DateInput
              placeholder="Дата"
              value={formState.date}
              onChange={(value) => setFormState((prev) => ({ ...prev, date: value }))}
            />

            <Select
              placeholder="Счет"
              value={formState.accountId}
              options={accountOptions}
              onChange={(value) => setFormState((prev) => ({ ...prev, accountId: value }))}
            />

            <Pressable style={styles.detailsToggle}>
              <Text style={styles.detailsText}>Добавить детали</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button title="Сохранить" size="lg" onPress={() => setIsAddOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    height: 74,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  addButtonWrapper: {
    position: "absolute",
    top: -24,
    alignSelf: "center",
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2ecc71",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addButtonLabel: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modalActionSpacer: {
    width: 60,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  currencyBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  currencyText: {
    fontWeight: "600",
  },
  amountInput: {
    flex: 1,
    gap: spacing.xs,
  },
  detailsToggle: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  detailsText: {
    color: "#2ecc71",
    fontWeight: "600",
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});
