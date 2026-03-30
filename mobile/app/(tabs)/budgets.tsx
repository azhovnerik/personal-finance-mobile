import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { Button, Card, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { BudgetCategoryDetailedDto, CurrencyCode } from "../../src/shared/api/dto";
import { formatAmount, getCurrencySymbol } from "../../src/shared/utils/format";
import { useBudgetActions, useBudgetDetails, useBudgets } from "../../src/features/budgets/useBudgets";
import { subscribeTransactionsChanged } from "../../src/shared/lib/events/transactions";

const parseBudgetMonth = (value: string): Date | null => {
  const match = value.match(/^(\d{2})-(\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    return new Date(year, month - 1, 1);
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    return new Date(year, month - 1, 1);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
};

const getMonthKey = (value: string) => {
  const date = parseBudgetMonth(value);
  if (!date) {
    return Number.NEGATIVE_INFINITY;
  }
  return date.getFullYear() * 100 + (date.getMonth() + 1);
};

const monthTitle = (value: string) => {
  const date = parseBudgetMonth(value);
  if (!date) {
    return value;
  }
  return new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(date);
};
const monthTitleFromDate = (value: Date) =>
  new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(value);
const monthKeyFromDate = (value: Date) => value.getFullYear() * 100 + (value.getMonth() + 1);
const monthApiFromDate = (value: Date) =>
  `${String(value.getMonth() + 1).padStart(2, "0")}-${value.getFullYear()}`;

const resolveAmount = (value?: number | null, fallback?: number | null) => value ?? fallback ?? 0;
const formatAmountWithSymbol = (value: number, currency: CurrencyCode) =>
  `${formatAmount(value)} ${getCurrencySymbol(currency)}`;

const renderCategoryName = (item: BudgetCategoryDetailedDto) => {
  const name = item.category?.name ?? "Без названия";
  return name;
};

const CategorySection = ({
  title,
  categories,
  baseCurrency,
  budgetId,
  openCategory,
  openAddCategory,
}: {
  title: string;
  categories: BudgetCategoryDetailedDto[];
  baseCurrency: CurrencyCode;
  budgetId?: string;
  openCategory: (categoryId: string, budgetId: string) => void;
  openAddCategory: (budgetId: string, type: "INCOME" | "EXPENSES", categoryId?: string) => void;
}) => {
  const totals = categories.reduce(
    (acc, item) => {
      acc.plan += resolveAmount(item.planAmountInBase, item.planAmount);
      acc.fact += resolveAmount(item.factAmountInBase, item.factAmount);
      acc.leftover += resolveAmount(item.leftoverInBase, item.leftover);
      return acc;
    },
    { plan: 0, fact: 0, leftover: 0 },
  );

  const sectionType = title === "Доходы" ? "INCOME" : "EXPENSES";

  if (categories.length === 0) {
    return (
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text variant="subtitle">{title}</Text>
          {budgetId ? (
            <Button
              title="Добавить категорию"
              size="sm"
              variant="outline"
              onPress={() => openAddCategory(budgetId, sectionType)}
            />
          ) : null}
        </View>
        <Text variant="caption">Категорий нет.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text variant="subtitle">{title}</Text>
        {budgetId ? (
          <Button
            title="Добавить категорию"
            size="sm"
            variant="outline"
            onPress={() => openAddCategory(budgetId, sectionType)}
          />
        ) : null}
      </View>

      {categories.map((item) => {
        const planned = resolveAmount(item.planAmountInBase, item.planAmount);
        const fact = resolveAmount(item.factAmountInBase, item.factAmount);
        const leftover = resolveAmount(item.leftoverInBase, item.leftover);
        const currency = (item.currency ?? baseCurrency) as CurrencyCode;
        const ratioRaw = planned > 0 ? fact / planned : fact > 0 ? 1 : 0;
        const progress = Math.min(Math.max(ratioRaw, 0), 1);
        const isOverspend = leftover < 0;
        const percentOfPlan = planned > 0 ? Math.round((fact / planned) * 100) : fact > 0 ? 100 : 0;
        const progressToneStyle =
          isOverspend ? styles.progressFillDanger : ratioRaw > 0.7 ? styles.progressFillWarning : styles.progressFillSafe;
        const incomeProgressToneStyle = isOverspend ? styles.progressFillInfo : styles.progressFillSafe;
        const canOpen = Boolean(budgetId && (item.id || item.category?.id));
        const isIncomeSection = sectionType === "INCOME";

        const rowContent = (
          <View style={styles.categoryCard}>
            <View style={styles.categoryTopRow}>
              <Text numberOfLines={1} style={styles.categoryName}>
                {renderCategoryName(item)}
              </Text>
              <Text style={styles.categoryAmountMeta}>
                {formatAmountWithSymbol(fact, currency)} / {formatAmountWithSymbol(planned, currency)}
              </Text>
            </View>

            {isIncomeSection ? (
              <Text style={[styles.incomePercentText, isOverspend ? styles.infoValue : styles.safeValue]}>
                {percentOfPlan}% от плана
              </Text>
            ) : null}

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  isIncomeSection ? incomeProgressToneStyle : progressToneStyle,
                  { width: `${Math.max(progress * 100, fact > 0 ? 6 : 0)}%` },
                ]}
              />
            </View>

            {isIncomeSection ? (
              <Text style={[styles.leftoverText, isOverspend ? styles.safeValue : leftover === 0 ? styles.safeValue : styles.mutedValue]}>
                {isOverspend
                  ? `+${formatAmountWithSymbol(Math.abs(leftover), currency)} сверх плана 🚀`
                  : leftover === 0
                    ? "Цель достигнута! 🎉"
                    : `До цели: ${formatAmountWithSymbol(leftover, currency)}`}
              </Text>
            ) : (
              <Text style={[styles.leftoverText, isOverspend ? styles.negativeValue : styles.safeValue]}>
                {isOverspend
                  ? `Перерасход ${formatAmountWithSymbol(Math.abs(leftover), currency)}`
                  : `Осталось ${formatAmountWithSymbol(leftover, currency)}`}
              </Text>
            )}
          </View>
        );

        return (
          <View key={item.id ?? `${item.type}-${item.category?.id}`}>
            {canOpen ? (
              <Pressable
                style={({ pressed }) => [styles.categoryRow, pressed ? styles.rowPressed : undefined]}
                onPress={() => {
                  if (!budgetId) {
                    return;
                  }
                  if (item.id) {
                    openCategory(item.id, budgetId);
                    return;
                  }
                  openAddCategory(budgetId, item.type === "INCOME" ? "INCOME" : "EXPENSES", item.category?.id);
                }}
              >
                {rowContent}
              </Pressable>
            ) : (
              <View style={styles.categoryRow}>{rowContent}</View>
            )}
          </View>
        );
      })}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          План {formatAmountWithSymbol(totals.plan, baseCurrency)} · Факт {formatAmountWithSymbol(totals.fact, baseCurrency)}
        </Text>
        <Text style={[styles.totalValue, totals.leftover < 0 ? styles.negativeValue : styles.safeValue]}>
          {totals.leftover < 0
            ? `Перерасход ${formatAmountWithSymbol(Math.abs(totals.leftover), baseCurrency)}`
            : `Осталось ${formatAmountWithSymbol(totals.leftover, baseCurrency)}`}
        </Text>
      </View>
    </Card>
  );
};

export default function BudgetsScreen() {
  const router = useRouter();
  const { budgets, isLoading, isRefreshing, error, refresh } = useBudgets();
  const { createBudget, isCreating, error: createError } = useBudgetActions();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedTab, setSelectedTab] = useState<"INCOME" | "EXPENSES">("EXPENSES");

  const selectedMonthKey = useMemo(() => monthKeyFromDate(selectedMonth), [selectedMonth]);
  const selectedBudget = useMemo(
    () => budgets.find((item) => getMonthKey(item.month) === selectedMonthKey),
    [budgets, selectedMonthKey],
  );

  const {
    budget: selectedBudgetDetails,
    isLoading: isBudgetLoading,
    isRefreshing: isBudgetRefreshing,
    error: budgetError,
    refresh: refreshBudget,
  } = useBudgetDetails(selectedBudget?.id);

  const openCategory = (categoryId: string, budgetId: string) => {
    router.push(`/budgets/categories/${categoryId}?budgetId=${budgetId}`);
  };

  const openAddCategory = (budgetId: string, type: "INCOME" | "EXPENSES", categoryId?: string) => {
    const categoryParam = categoryId ? `&categoryId=${categoryId}` : "";
    router.push(`/budgets/categories/add?budgetId=${budgetId}&type=${type}${categoryParam}`);
  };

  const goToPrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const onCreateBudget = async () => {
    await createBudget(monthApiFromDate(selectedMonth));
    await refresh();
  };

  const baseCurrency = (selectedBudgetDetails?.baseCurrency ?? selectedBudget?.baseCurrency ?? "UAH") as CurrencyCode;
  const incomeCategories = selectedBudgetDetails?.incomeBudgetCategories ?? [];
  const expenseCategories = selectedBudgetDetails?.expenseBudgetCategories ?? [];

  useEffect(() => {
    const unsubscribe = subscribeTransactionsChanged(() => {
      void refresh();
      void refreshBudget();
    });
    return unsubscribe;
  }, [refresh, refreshBudget]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isBudgetRefreshing}
            onRefresh={() => {
              void refresh();
              void refreshBudget();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text variant="title">Бюджет</Text>
            <Text variant="caption">План / факт / остаток по категориям</Text>
          </View>
          <Button title="Обновить" size="sm" variant="outline" onPress={() => void refresh()} />
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.negativeValue}>{error}</Text>
            <Button title="Повторить" size="sm" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {!error && isLoading ? <Text variant="caption">Загрузка бюджетов...</Text> : null}

        {!isLoading && !error && budgets.length === 0 ? (
          <Card>
            <Text variant="caption">Бюджеты пока не найдены.</Text>
          </Card>
        ) : null}

        <Card style={styles.monthCard}>
          <View style={styles.monthRow}>
            <Pressable onPress={goToPrevMonth}>
              <Text style={styles.monthArrow}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {selectedBudget ? monthTitle(selectedBudget.month) : monthTitleFromDate(selectedMonth)}
            </Text>
            <Pressable onPress={goToNextMonth}>
              <Text style={styles.monthArrow}>›</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tabItem, selectedTab === "INCOME" ? styles.tabItemActive : undefined]}
            onPress={() => setSelectedTab("INCOME")}
          >
            <Text style={selectedTab === "INCOME" ? styles.tabTextActive : styles.tabText}>Доходы</Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, selectedTab === "EXPENSES" ? styles.tabItemActive : undefined]}
            onPress={() => setSelectedTab("EXPENSES")}
          >
            <Text style={selectedTab === "EXPENSES" ? styles.tabTextActive : styles.tabText}>Расходы</Text>
          </Pressable>
        </View>

        {selectedBudget && isBudgetLoading ? <Text variant="caption">Загрузка категорий...</Text> : null}

        {selectedBudget && budgetError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.negativeValue}>{budgetError}</Text>
            <Button title="Повторить" size="sm" onPress={() => void refreshBudget()} />
          </Card>
        ) : null}

        {selectedBudget && selectedBudgetDetails ? (
          <>
            {selectedTab === "INCOME" ? (
              <CategorySection
                title="Доходы"
                categories={incomeCategories}
                baseCurrency={baseCurrency}
                budgetId={selectedBudgetDetails.id}
                openCategory={openCategory}
                openAddCategory={openAddCategory}
              />
            ) : (
              <CategorySection
                title="Расходы"
                categories={expenseCategories}
                baseCurrency={baseCurrency}
                budgetId={selectedBudgetDetails.id}
                openCategory={openCategory}
                openAddCategory={openAddCategory}
              />
            )}
          </>
        ) : null}

        {!selectedBudget && !isLoading && !error ? (
          <Card style={styles.emptyMonthCard}>
            <Text>Бюджет на выбранный месяц не создан.</Text>
            <Text variant="caption">Список бюджетных категорий за этот месяц пуст.</Text>
            {createError ? <Text style={styles.negativeValue}>{createError}</Text> : null}
            <Button
              title={isCreating ? "Создание..." : "Добавить бюджет"}
              onPress={() => void onCreateBudget()}
              disabled={isCreating}
            />
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthCard: {
    paddingVertical: spacing.sm,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthArrow: {
    fontSize: 26,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  monthTitle: {
    textTransform: "capitalize",
    fontSize: 18,
    fontWeight: "600",
    color: colors.heading,
  },
  tabsRow: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.heading,
    fontWeight: "700",
  },
  sectionCard: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  categoryRow: {
    marginBottom: spacing.xs,
  },
  rowPressed: {
    opacity: 0.9,
  },
  categoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  categoryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  categoryName: {
    flex: 1,
    minWidth: 0,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  categoryAmountMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressFillSafe: {
    backgroundColor: colors.success,
  },
  progressFillWarning: {
    backgroundColor: colors.warning,
  },
  progressFillDanger: {
    backgroundColor: colors.danger,
  },
  progressFillInfo: {
    backgroundColor: colors.info,
  },
  incomePercentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  leftoverText: {
    fontSize: 12,
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
  safeValue: {
    color: colors.success,
    fontWeight: "600",
  },
  infoValue: {
    color: colors.info,
    fontWeight: "600",
  },
  mutedValue: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  totalRow: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontWeight: "700",
    color: colors.heading,
  },
  totalValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  errorCard: {
    gap: spacing.sm,
  },
  emptyMonthCard: {
    gap: spacing.sm,
  },
});
