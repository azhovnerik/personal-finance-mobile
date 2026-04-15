import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useDashboardSummary } from "../../src/features/dashboard/useDashboardSummary";
import { clearAuthSession } from "../../src/features/auth/api";
import { Button, Card, Chip, DateInput, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency, formatDateRange } from "../../src/shared/utils/format";

const CHART_SIZE = 160;
const CHART_RADIUS = CHART_SIZE / 2;

type PeriodPreset = "THIS_MONTH" | "LAST_30_DAYS" | "CUSTOM";

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

const toYmd = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getThisMonthPeriod = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toYmd(start),
    endDate: toYmd(now),
  };
};

const getLast30DaysPeriod = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 29);
  return {
    startDate: toYmd(start),
    endDate: toYmd(now),
  };
};

const PieSlice = ({
  size,
  startAngle,
  sweepAngle,
  color,
}: {
  size: number;
  startAngle: number;
  sweepAngle: number;
  color: string;
}) => {
  if (sweepAngle <= 0) {
    return null;
  }

  const radius = size / 2;
  const angle = Math.min(sweepAngle, 180);

  return (
    <View style={[styles.sliceContainer, { width: size, height: size, transform: [{ rotate: `${startAngle}deg` }] }]}>
      <View style={[styles.halfCircleContainer, styles.rightHalf, { width: radius, height: size }]}>
        <View
          style={[
            styles.halfCircle,
            styles.halfCircleRight,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            },
          ]}
        />
      </View>
      {sweepAngle > 180 ? (
        <View style={[styles.halfCircleContainer, styles.leftHalf, { width: radius, height: size }]}>
          <View
            style={[
              styles.halfCircle,
              styles.halfCircleLeft,
              {
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: color,
                transform: [{ rotate: `${sweepAngle - 180}deg` }],
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("THIS_MONTH");
  const [initialThisMonthPeriod] = useState(() => getThisMonthPeriod());
  const [customStartDate, setCustomStartDate] = useState(initialThisMonthPeriod.startDate);
  const [customEndDate, setCustomEndDate] = useState(initialThisMonthPeriod.endDate);
  const [breakdownType, setBreakdownType] = useState<"expenses" | "income">("expenses");

  const filters = useMemo(() => {
    if (periodPreset === "LAST_30_DAYS") {
      return getLast30DaysPeriod();
    }
    if (periodPreset === "CUSTOM") {
      return {
        startDate: customStartDate || null,
        endDate: customEndDate || null,
      };
    }
    return getThisMonthPeriod();
  }, [customEndDate, customStartDate, periodPreset]);

  const { summary, isLoading, isRefreshing, error, refresh } = useDashboardSummary(filters);

  const breakdownList = useMemo(() => {
    if (!summary) {
      return [];
    }
    return breakdownType === "expenses" ? summary.expenseBreakdown : summary.incomeBreakdown;
  }, [breakdownType, summary]);

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
      await clearAuthSession();
    } finally {
      router.replace("/login");
    }
  }, [router]);

  const dateRangeLabel = useMemo(() => {
    if (!summary?.startDate || !summary?.endDate) {
      return "Период не выбран";
    }
    return formatDateRange(summary.startDate, summary.endDate);
  }, [summary?.endDate, summary?.startDate]);

  const baseCurrency = summary?.baseCurrency ?? "UAH";

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="title">Dashboard</Text>
            <Text variant="caption">Период: {dateRangeLabel}</Text>
          </View>
          <Button title="Logout" variant="outline" tone="danger" size="sm" onPress={handleLogout} />
        </View>

        <Card style={styles.filterCard}>
          <Text variant="subtitle">Период аналитики</Text>
          <View style={styles.toggleRow}>
            <Chip label="Месяц" isActive={periodPreset === "THIS_MONTH"} onPress={() => setPeriodPreset("THIS_MONTH")} />
            <Chip
              label="30 дней"
              isActive={periodPreset === "LAST_30_DAYS"}
              onPress={() => setPeriodPreset("LAST_30_DAYS")}
            />
            <Chip label="Кастом" isActive={periodPreset === "CUSTOM"} onPress={() => setPeriodPreset("CUSTOM")} />
          </View>
          {periodPreset === "CUSTOM" ? (
            <View style={styles.customDateRow}>
              <DateInput value={customStartDate} placeholder="Start date" onChange={setCustomStartDate} />
              <DateInput value={customEndDate} placeholder="End date" onChange={setCustomEndDate} />
            </View>
          ) : null}
        </Card>

        {isLoading && !summary ? <Text variant="caption">Загрузка dashboard...</Text> : null}

        {!isLoading && error && !summary ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Повторить" size="sm" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {summary ? (
          <>
            <Card style={styles.chartCardWrapper}>
              <View style={styles.sectionHeader}>
                <Text variant="subtitle">Расходы и доходы</Text>
                <View style={styles.toggleRow}>
                  <Chip
                    label="Расходы"
                    isActive={breakdownType === "expenses"}
                    onPress={() => setBreakdownType("expenses")}
                  />
                  <Chip label="Доходы" isActive={breakdownType === "income"} onPress={() => setBreakdownType("income")} />
                </View>
              </View>
              <Text variant="caption">Сегменты показывают суммы по категориям.</Text>
              {categorySegments.length === 0 ? (
                <Text variant="caption">Нет данных за выбранный период.</Text>
              ) : (
                <View style={styles.pieRow}>
                  <View style={styles.pieChartWrapper}>
                    <View style={styles.pieChart}>
                      {categorySegments.map((segment) => (
                        <PieSlice
                          key={`${segment.categoryId}-${segment.name}`}
                          size={CHART_SIZE}
                          startAngle={segment.startAngle}
                          sweepAngle={segment.endAngle - segment.startAngle}
                          color={segment.color}
                        />
                      ))}
                    </View>
                    <View style={styles.pieCenter}>
                      <Text variant="caption">Всего</Text>
                      <Text style={styles.pieTotal}>{formatCurrency(totalAmount, baseCurrency)}</Text>
                    </View>
                  </View>
                  <View style={styles.chartLegend}>
                    {categorySegments.map((segment) => (
                      <View key={`${segment.categoryId}-${segment.name}-legend`} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                        <View>
                          <Text>{segment.name}</Text>
                          <Text variant="caption">{formatCurrency(segment.amount, baseCurrency)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Card>

            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard}>
                <Text variant="caption">Total balance</Text>
                <Text variant="heading">{formatCurrency(summary.totalBalance, baseCurrency)}</Text>
                <Text variant="caption">Across all accounts</Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text variant="caption">Income this period</Text>
                <Text style={[styles.summaryValue, styles.positiveValue]}>{formatCurrency(summary.totalIncome, baseCurrency)}</Text>
                <Text variant="caption">All recorded income categories</Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text variant="caption">Expenses this period</Text>
                <Text style={[styles.summaryValue, styles.negativeValue]}>{formatCurrency(summary.totalExpenses, baseCurrency)}</Text>
                <Text variant="caption">Spending across all accounts</Text>
              </Card>
            </View>

            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text variant="subtitle">Accounts</Text>
                <Button title="Add account" variant="outline" tone="primary" size="sm" onPress={() => router.push("/accounts/edit")} />
              </View>
              <View style={styles.accountList}>
                {summary.accounts.length === 0 ? <Text variant="caption">Нет счетов.</Text> : null}
                {summary.accounts.map((account) => (
                  <View key={account.id} style={styles.accountRow}>
                    <View>
                      <Text variant="caption">{account.type}</Text>
                      <Text>{account.name}</Text>
                    </View>
                    <View style={styles.accountAmount}>
                      <Text style={styles.summaryValue}>{formatCurrency(account.balance, account.currency ?? baseCurrency)}</Text>
                      {account.currency && account.currency !== baseCurrency ? (
                        <Text variant="caption">
                          ≈ {formatCurrency(account.balanceInBase ?? account.balance, baseCurrency)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <Text variant="subtitle">Popular categories</Text>
              <Text variant="caption">Top categories by spending ({baseCurrency})</Text>
              <View style={styles.breakdownList}>
                {summary.topExpenseCategories.length === 0 ? <Text variant="caption">Нет данных.</Text> : null}
                {summary.topExpenseCategories.map((item, index) => (
                  <View key={`${item.categoryId}-${index}`} style={styles.breakdownRow}>
                    <Text>{`${index + 1}. ${item.name}`}</Text>
                    <Text style={[styles.summaryValue, styles.negativeValue]}>{formatCurrency(item.amount, baseCurrency)}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text variant="subtitle">Budget progress</Text>
                <Button
                  title="View budgets"
                  variant="outline"
                  tone="primary"
                  size="sm"
                  onPress={() => router.push("/budgets")}
                />
              </View>
              <View style={styles.progressList}>
                {summary.budgetProgress.length === 0 ? <Text variant="caption">Нет бюджетов за выбранный период.</Text> : null}
                {summary.budgetProgress.map((budget) => (
                  <View key={budget.budgetId} style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                      <Text>{budget.monthLabel}</Text>
                      <Text variant="caption">
                        {formatCurrency(budget.actualExpense, baseCurrency)} / {formatCurrency(budget.plannedExpense, baseCurrency)}
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
                <Button
                  title="View all"
                  variant="outline"
                  tone="primary"
                  size="sm"
                  onPress={() => router.push("/transactions")}
                />
              </View>
              <View style={styles.transactionList}>
                {summary.recentTransactions.length === 0 ? <Text variant="caption">Транзакций пока нет.</Text> : null}
                {summary.recentTransactions.map((transaction) => (
                  <View key={transaction.id} style={styles.transactionRow}>
                    <View>
                      <Text>{transaction.categoryName}</Text>
                      <Text variant="caption">{transaction.accountName}</Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text style={transaction.direction === "DECREASE" ? styles.negativeValue : styles.positiveValue}>
                        {transaction.direction === "DECREASE" ? "-" : "+"}
                        {formatCurrency(transaction.amount, transaction.currency ?? baseCurrency)}
                      </Text>
                      <Text variant="caption">{transaction.dateLabel}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        ) : null}
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
  customDateRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
    flexWrap: "wrap",
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
    width: CHART_SIZE,
    height: CHART_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pieChart: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    borderRadius: CHART_RADIUS,
    overflow: "hidden",
    position: "relative",
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
  sliceContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  halfCircleContainer: {
    position: "absolute",
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
  },
  halfCircleRight: {
    right: 0,
  },
  halfCircleLeft: {
    left: 0,
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
  errorText: {
    color: colors.danger,
  },
});
