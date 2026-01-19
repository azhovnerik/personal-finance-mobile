import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";

import {
  Button,
  Card,
  Chip,
  DateInput,
  ScreenContainer,
  Select,
  Text,
  colors,
  spacing,
} from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockAccounts, mockTransactions, mockUser } from "../../src/shared/mocks";

const FILTERS = [
  { label: "All types", active: true },
  { label: "Income", active: false },
  { label: "Expenses", active: false },
  { label: "All accounts", active: false },
];

export default function TransactionsScreen() {
  const baseCurrency = mockUser.baseCurrency ?? "UAH";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
    type: null as string | null,
    accountId: null as string | null,
  });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const [formState, setFormState] = useState({
    date: null as string | null,
    categoryId: null as string | null,
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

  const typeOptions = [
    { value: "ALL", label: "Все типы" },
    { value: "INCOME", label: "Доход" },
    { value: "EXPENSE", label: "Расход" },
  ];

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((transaction) => {
      if (appliedFilters.startDate) {
        const start = new Date(appliedFilters.startDate).getTime();
        const current = new Date(transaction.date).getTime();
        if (!Number.isNaN(start) && current < start) {
          return false;
        }
      }
      if (appliedFilters.endDate) {
        const end = new Date(appliedFilters.endDate).getTime();
        const current = new Date(transaction.date).getTime();
        if (!Number.isNaN(end) && current > end) {
          return false;
        }
      }
      if (appliedFilters.type && appliedFilters.type !== "ALL") {
        if (transaction.type !== appliedFilters.type) {
          return false;
        }
      }
      if (appliedFilters.accountId && transaction.account.id !== appliedFilters.accountId) {
        return false;
      }
      return true;
    });
  }, [appliedFilters]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Transactions</Text>
            <Text variant="caption">Period: 2026-01-01 – 2026-01-31</Text>
          </View>
          <Chip label={baseCurrency} isActive />
        </View>

        <Card style={styles.filterCard}>
          <Text variant="subtitle">Filters</Text>
          <View style={styles.filterRow}>
            <DateInput
              placeholder="Start date"
              value={draftFilters.startDate}
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, startDate: value }))}
            />
            <DateInput
              placeholder="End date"
              value={draftFilters.endDate}
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, endDate: value }))}
            />
          </View>
          <View style={styles.filterRow}>
            <Select
              placeholder="Type"
              value={draftFilters.type}
              options={typeOptions}
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, type: value }))}
            />
            <Select
              placeholder="Account"
              value={draftFilters.accountId}
              options={accountOptions}
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, accountId: value }))}
            />
          </View>
          <Button title="Apply" size="sm" onPress={() => setAppliedFilters(draftFilters)} />
        </Card>

        <View style={styles.filterChips}>
          {FILTERS.map((filter) => (
            <Chip key={filter.label} label={filter.label} isActive={filter.active} />
          ))}
        </View>

        <View style={styles.actionRow}>
          <Button title="Add new transaction" size="sm" onPress={() => setIsFormOpen(true)} />
          <Button title="Export to xls" variant="outline" tone="primary" size="sm" />
        </View>

        <View style={styles.list}>
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View>
                  <Text>{transaction.date}</Text>
                  <Text variant="caption">{transaction.account.name}</Text>
                </View>
                <Text
                  style={
                    transaction.direction === "DECREASE" ? styles.negativeValue : styles.positiveValue
                  }
                >
                  {transaction.direction === "DECREASE" ? "-" : "+"}
                  {formatCurrency(transaction.amount, transaction.currency ?? baseCurrency)}
                </Text>
              </View>
              <View style={styles.transactionMeta}>
                <Chip label={transaction.type} isActive />
                <Chip label={transaction.direction} />
              </View>
              <Text variant="caption">{transaction.category.name}</Text>
              <Text variant="caption">{transaction.comment}</Text>
              <View style={styles.actionRowInline}>
                <Button title="Edit" variant="outline" tone="primary" size="sm" />
                <Button title="Delete" variant="ghost" size="sm" />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={isFormOpen} onRequestClose={() => setIsFormOpen(false)}>
        <Pressable style={styles.formBackdrop} onPress={() => setIsFormOpen(false)}>
          <Pressable style={styles.formCard}>
            <Text variant="subtitle">Добавить транзакцию</Text>
            <DateInput
              placeholder="Date"
              value={formState.date}
              onChange={(value) => setFormState((prev) => ({ ...prev, date: value }))}
            />
            <Select
              placeholder="Category"
              value={formState.categoryId}
              options={categoryOptions}
              onChange={(value) => setFormState((prev) => ({ ...prev, categoryId: value }))}
            />
            <Select
              placeholder="Account"
              value={formState.accountId}
              options={accountOptions}
              onChange={(value) => setFormState((prev) => ({ ...prev, accountId: value }))}
            />
            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => setIsFormOpen(false)}
              />
              <Button title="Save" size="sm" onPress={() => setIsFormOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  filterCard: {
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  transactionCard: {
    gap: spacing.sm,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionMeta: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionRowInline: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  formBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
});
