import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Chip, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency, formatDateRange } from "../../src/shared/utils/format";
import { mockDashboardSummary, mockUser } from "../../src/shared/mocks";

const QUICK_ACTIONS = [
  { label: "Добавить транзакцию", route: "/(tabs)/transactions", tone: "primary" as const },
  { label: "Добавить бюджет", route: "/(tabs)/budgets", tone: "secondary" as const },
  { label: "Добавить категорию", route: "/categories", tone: "success" as const },
  { label: "Добавить счет", route: "/(tabs)/accounts", tone: "info" as const },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [breakdownType, setBreakdownType] = useState<"expenses" | "income">("expenses");

  const breakdownList = useMemo(() => {
    return breakdownType === "expenses"
      ? mockDashboardSummary.expenseBreakdown
      : mockDashboardSummary.incomeBreakdown;
  }, [breakdownType]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="title">С возвращением, {mockUser.name}</Text>
            <Text variant="caption">{formatDateRange(mockDashboardSummary.startDate, mockDashboardSummary.endDate)}</Text>
          </View>
          <Button title="Выйти" variant="outline" tone="danger" size="sm" />
        </View>

        <Card style={styles.quickActionsCard}>
          <View style={styles.quickHeader}>
            <Text variant="subtitle">Швидкі дії</Text>
            <Text variant="caption">Часто используемые операции</Text>
          </View>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                title={action.label}
                variant="outline"
                tone={action.tone}
                size="sm"
                onPress={() => router.push(action.route)}
                style={styles.quickActionButton}
              />
            ))}
          </View>
        </Card>

        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Text variant="caption">Общий баланс</Text>
            <Text variant="heading">
              {formatCurrency(mockDashboardSummary.totalBalance, mockDashboardSummary.baseCurrency)}
            </Text>
            <Text variant="caption">По всем счетам</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text variant="caption">Доходы за период</Text>
            <Text style={[styles.summaryValue, styles.positiveValue]}>
              {formatCurrency(mockDashboardSummary.totalIncome, mockDashboardSummary.baseCurrency)}
            </Text>
            <Text variant="caption">Все категории доходов</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text variant="caption">Расходы за период</Text>
            <Text style={[styles.summaryValue, styles.negativeValue]}>
              {formatCurrency(mockDashboardSummary.totalExpenses, mockDashboardSummary.baseCurrency)}
            </Text>
            <Text variant="caption">Совокупные траты</Text>
          </Card>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Счета</Text>
            <Button title="Добавить" variant="outline" tone="primary" size="sm" />
          </View>
          <View style={styles.accountList}>
            {mockDashboardSummary.accounts.map((account) => (
              <View key={account.id} style={styles.accountRow}>
                <View>
                  <Text>{account.name}</Text>
                  <Text variant="caption">{account.type}</Text>
                </View>
                <View style={styles.accountAmount}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(account.balance, account.currency ?? mockDashboardSummary.baseCurrency)}
                  </Text>
                  {account.currency && account.currency !== mockDashboardSummary.baseCurrency ? (
                    <Text variant="caption">
                      ≈ {formatCurrency(account.balanceInBase ?? account.balance, mockDashboardSummary.baseCurrency)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Структура доходов и расходов</Text>
            <View style={styles.toggleRow}>
              <Chip
                label="Расходы"
                isActive={breakdownType === "expenses"}
                onPress={() => setBreakdownType("expenses")}
              />
              <Chip
                label="Доходы"
                isActive={breakdownType === "income"}
                onPress={() => setBreakdownType("income")}
              />
            </View>
          </View>
          <Text variant="caption">
            Все суммы в {mockDashboardSummary.baseCurrency}.
          </Text>
          <View style={styles.breakdownList}>
            {breakdownList.map((item) => (
              <View key={item.categoryId} style={styles.breakdownRow}>
                <Text>{item.name}</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(item.amount, mockDashboardSummary.baseCurrency)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="subtitle">Популярные категории</Text>
          <Text variant="caption">
            Топ расходов за период ({mockDashboardSummary.baseCurrency})
          </Text>
          <View style={styles.breakdownList}>
            {mockDashboardSummary.topExpenseCategories.map((item, index) => (
              <View key={item.categoryId} style={styles.breakdownRow}>
                <Text>{`${index + 1}. ${item.name}`}</Text>
                <Text style={[styles.summaryValue, styles.negativeValue]}>
                  {formatCurrency(item.amount, mockDashboardSummary.baseCurrency)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Прогресс бюджетов</Text>
            <Button title="Все бюджеты" variant="outline" tone="primary" size="sm" />
          </View>
          <View style={styles.progressList}>
            {mockDashboardSummary.budgetProgress.map((budget) => (
              <View key={budget.budgetId} style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text>{budget.monthLabel}</Text>
                  <Text variant="caption">
                    {formatCurrency(budget.actualExpense, mockDashboardSummary.baseCurrency)} /{" "}
                    {formatCurrency(budget.plannedExpense, mockDashboardSummary.baseCurrency)}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${budget.expenseCompletionPercent}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="subtitle">Последние транзакции</Text>
          <Text variant="caption">Обновлено 5 минут назад</Text>
          <View style={styles.transactionList}>
            {mockDashboardSummary.recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View>
                  <Text>{transaction.categoryName}</Text>
                  <Text variant="caption">{transaction.accountName}</Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={
                      transaction.direction === "DECREASE" ? styles.negativeValue : styles.positiveValue
                    }
                  >
                    {transaction.direction === "DECREASE" ? "-" : "+"}
                    {formatCurrency(transaction.amount, transaction.currency ?? mockDashboardSummary.baseCurrency)}
                  </Text>
                  <Text variant="caption">{transaction.dateLabel}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
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
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  quickActionsCard: {
    gap: spacing.sm,
  },
  quickHeader: {
    gap: 2,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickActionButton: {
    minWidth: 150,
    justifyContent: "flex-start",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    gap: spacing.xs,
  },
  summaryValue: {
    fontWeight: "600",
  },
  sectionCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  accountList: {
    gap: spacing.sm,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  accountAmount: {
    alignItems: "flex-end",
  },
  toggleRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  breakdownList: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  progressList: {
    gap: spacing.md,
  },
  progressCard: {
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15, 118, 110, 0.08)",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  transactionList: {
    gap: spacing.sm,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  transactionAmount: {
    alignItems: "flex-end",
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
