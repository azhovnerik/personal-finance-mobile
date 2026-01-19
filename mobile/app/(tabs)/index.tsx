import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Path, Svg } from "react-native-svg";

import { removeToken } from "../../src/storage/auth";
import { Button, Card, Chip, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency, formatDateRange } from "../../src/shared/utils/format";
import { mockDashboardSummary } from "../../src/shared/mocks";

const CHART_COLORS = [
  colors.danger,
  colors.warning,
  colors.info,
  colors.success,
  colors.accent,
  colors.primary,
  "#9b51e0",
  "#14b8a6",
];

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const angleInRadians = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    cx,
    cy,
    "L",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    "Z",
  ].join(" ");
};

export default function DashboardScreen() {
  const router = useRouter();
  const [breakdownType, setBreakdownType] = useState<"expenses" | "income">("expenses");

  const breakdownList = useMemo(() => {
    return breakdownType === "expenses"
      ? mockDashboardSummary.expenseBreakdown
      : mockDashboardSummary.incomeBreakdown;
  }, [breakdownType]);

  const categorySegments = useMemo(() => {
    const total = breakdownList.reduce((sum, item) => sum + item.amount, 0);
    let currentAngle = 0;

    return breakdownList.map((item, index) => {
      const ratio = total > 0 ? item.amount / total : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + ratio * 360;
      currentAngle = endAngle;

      return {
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length],
        startAngle,
        endAngle,
      };
    });
  }, [breakdownList]);

  const totalAmount = useMemo(() => {
    return breakdownList.reduce((sum, item) => sum + item.amount, 0);
  }, [breakdownList]);

  const handleLogout = useCallback(async () => {
    try {
      await removeToken();
    } finally {
      router.replace("/login");
    }
  }, [router]);

  const dateRangeLabel = useMemo(() => {
    return formatDateRange(mockDashboardSummary.startDate, mockDashboardSummary.endDate);
  }, []);

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

        <Card style={styles.chartCardWrapper}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Расходы и доходы</Text>
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
          <Text variant="caption">Сегменты показывают суммы по категориям.</Text>
          <View style={styles.pieRow}>
            <View style={styles.pieChartWrapper}>
              <Svg width={160} height={160} viewBox="0 0 160 160">
                {categorySegments.map((segment) => (
                  <Path
                    key={segment.categoryId}
                    d={describeArc(80, 80, 70, segment.startAngle, segment.endAngle)}
                    fill={segment.color}
                  />
                ))}
              </Svg>
              <View style={styles.pieCenter}>
                <Text variant="caption">Всего</Text>
                <Text style={styles.pieTotal}>
                  {formatCurrency(totalAmount, mockDashboardSummary.baseCurrency)}
                </Text>
              </View>
            </View>
            <View style={styles.chartLegend}>
              {categorySegments.map((segment) => (
                <View key={segment.categoryId} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                  <View>
                    <Text>{segment.name}</Text>
                    <Text variant="caption">
                      {formatCurrency(segment.amount, mockDashboardSummary.baseCurrency)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
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
  chartCardWrapper: {
    gap: spacing.sm,
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
  pieRow: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  pieChartWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenter: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pieTotal: {
    fontWeight: "600",
    textAlign: "center",
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
