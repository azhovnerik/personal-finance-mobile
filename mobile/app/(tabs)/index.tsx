import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { removeToken } from "../../src/storage/auth";
import { Button, Card, Chip, DateInput, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency, formatDateRange } from "../../src/shared/utils/format";
import { mockDashboardSummary } from "../../src/shared/mocks";

const QUICK_ACTIONS = [
  { label: "Add transaction", route: "/(tabs)/transactions", tone: "primary" as const },
  { label: "Manage budgets", route: "/(tabs)/budgets", tone: "secondary" as const },
  { label: "Add account", route: "/(tabs)/accounts", tone: "success" as const },
  { label: "Browse categories", route: "/categories", tone: "info" as const },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [breakdownType, setBreakdownType] = useState<"expenses" | "income">("expenses");
  const [startDate, setStartDate] = useState<string | null>(mockDashboardSummary.startDate);
  const [endDate, setEndDate] = useState<string | null>(mockDashboardSummary.endDate);

  const breakdownList = useMemo(() => {
    return breakdownType === "expenses"
      ? mockDashboardSummary.expenseBreakdown
      : mockDashboardSummary.incomeBreakdown;
  }, [breakdownType]);

  const handleLogout = useCallback(async () => {
    try {
      await removeToken();
    } finally {
      router.replace("/login");
    }
  }, [router]);

  const dateRangeLabel = useMemo(() => {
    if (startDate && endDate) {
      return formatDateRange(startDate, endDate);
    }
    return "Выберите период";
  }, [startDate, endDate]);

  const totalFlow = mockDashboardSummary.totalIncome + mockDashboardSummary.totalExpenses;
  const expensePercent = totalFlow > 0 ? (mockDashboardSummary.totalExpenses / totalFlow) * 100 : 0;
  const incomePercent = 100 - expensePercent;
  const expenseAngle = Math.min(Math.max(expensePercent, 0), 100) * 3.6;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="title">Welcome back, 10</Text>
            <Text variant="caption">Период: {dateRangeLabel}</Text>
          </View>
          <Button title="Logout" variant="outline" tone="danger" size="sm" onPress={handleLogout} />
        </View>

        <Card style={styles.filterCard}>
          <Text variant="subtitle">Filters</Text>
          <View style={styles.filterRow}>
            <DateInput placeholder="Start date" value={startDate} onChange={setStartDate} />
            <DateInput placeholder="End date" value={endDate} onChange={setEndDate} />
          </View>
          <Button title="Apply" size="sm" style={styles.filterButton} />
        </Card>

        <Card style={styles.quickActionsCard}>
          <View style={styles.quickHeader}>
            <Text variant="subtitle">Quick actions</Text>
            <Text variant="caption">Keep important flows one tap away.</Text>
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
            <Text variant="caption">Total balance</Text>
            <Text variant="heading">
              {formatCurrency(mockDashboardSummary.totalBalance, mockDashboardSummary.baseCurrency)}
            </Text>
            <Text variant="caption">Across all accounts</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text variant="caption">Income this period</Text>
            <Text style={[styles.summaryValue, styles.positiveValue]}>
              {formatCurrency(mockDashboardSummary.totalIncome, mockDashboardSummary.baseCurrency)}
            </Text>
            <Text variant="caption">All recorded income categories</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text variant="caption">Expenses this period</Text>
            <Text style={[styles.summaryValue, styles.negativeValue]}>
              {formatCurrency(mockDashboardSummary.totalExpenses, mockDashboardSummary.baseCurrency)}
            </Text>
            <Text variant="caption">Spending across all accounts</Text>
          </Card>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Accounts</Text>
            <Button title="Add account" variant="outline" tone="primary" size="sm" />
          </View>
          <View style={styles.accountList}>
            {mockDashboardSummary.accounts.map((account) => (
              <View key={account.id} style={styles.accountRow}>
                <View>
                  <Text variant="caption">{account.type}</Text>
                  <Text>{account.name}</Text>
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
            <Text variant="subtitle">Spending & income breakdown</Text>
            <View style={styles.toggleRow}>
              <Chip
                label="Expenses"
                isActive={breakdownType === "expenses"}
                onPress={() => setBreakdownType("expenses")}
              />
              <Chip
                label="Income"
                isActive={breakdownType === "income"}
                onPress={() => setBreakdownType("income")}
              />
            </View>
          </View>
          <Text variant="caption">All amounts in {mockDashboardSummary.baseCurrency}.</Text>
          <View style={styles.chartRow}>
            <View style={styles.chartCard}>
              <View style={styles.donutContainer}>
                <View style={[styles.donutRing, { borderColor: colors.success }]} />
                <View style={[styles.halfCircleContainer, styles.rightHalf]}>
                  <View
                    style={[
                      styles.halfCircle,
                      styles.halfCircleRight,
                      {
                        borderColor: colors.danger,
                        transform: [{ rotate: `${Math.min(expenseAngle, 180)}deg` }],
                      },
                    ]}
                  />
                </View>
                {expenseAngle > 180 ? (
                  <View style={[styles.halfCircleContainer, styles.leftHalf]}>
                    <View
                      style={[
                        styles.halfCircle,
                        styles.halfCircleLeft,
                        {
                          borderColor: colors.danger,
                          transform: [{ rotate: `${expenseAngle - 180}deg` }],
                        },
                      ]}
                    />
                  </View>
                ) : null}
                <View style={styles.donutHole} />
              </View>
              <View style={styles.chartCenter}>
                <Text variant="caption">Income</Text>
                <Text style={styles.chartValue}>{Math.round(incomePercent)}%</Text>
              </View>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <View>
                  <Text variant="caption">Income</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(mockDashboardSummary.totalIncome, mockDashboardSummary.baseCurrency)}
                  </Text>
                </View>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <View>
                  <Text variant="caption">Expenses</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(mockDashboardSummary.totalExpenses, mockDashboardSummary.baseCurrency)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
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
          <Text variant="subtitle">Popular categories</Text>
          <Text variant="caption">
            Top categories by spending ({mockDashboardSummary.baseCurrency})
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
            <Text variant="subtitle">Budget progress</Text>
            <Button title="View budgets" variant="outline" tone="primary" size="sm" />
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
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Recent transactions</Text>
            <Button title="View all" variant="outline" tone="primary" size="sm" />
          </View>
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
  filterCard: {
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterButton: {
    alignSelf: "flex-start",
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
  chartRow: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  chartCard: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  donutContainer: {
    width: 120,
    height: 120,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
  },
  halfCircleContainer: {
    position: "absolute",
    width: 60,
    height: 120,
    overflow: "hidden",
  },
  rightHalf: {
    right: 0,
  },
  leftHalf: {
    left: 0,
  },
  halfCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
  },
  halfCircleRight: {
    right: 0,
  },
  halfCircleLeft: {
    left: 0,
  },
  donutHole: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
  },
  chartCenter: {
    position: "absolute",
    alignItems: "center",
  },
  chartValue: {
    fontWeight: "600",
    fontSize: 16,
  },
  chartLegend: {
    flex: 1,
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
