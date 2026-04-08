import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Card, ScreenContainer, Text, Button, colors, spacing } from "../../src/shared/ui";
import { BudgetCategoryDetailedDto, CurrencyCode } from "../../src/shared/api/dto";
import { formatCurrency } from "../../src/shared/utils/format";
import { useBudgetDetails } from "../../src/features/budgets/useBudgets";
import { CategoryIcon } from "../../src/features/categories/components/CategoryIcon";

const renderAmount = (value?: number | null, currency: CurrencyCode = "UAH") => {
  return formatCurrency(value ?? 0, currency);
};

const renderCategoryName = (item: BudgetCategoryDetailedDto) => {
  return item.category?.name ?? "Без названия";
};

export default function BudgetDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const budgetId = typeof params.id === "string" ? params.id : undefined;
  const { budget, isLoading, isRefreshing, error, refresh } = useBudgetDetails(budgetId);
  const currency = (budget?.baseCurrency ?? "UAH") as CurrencyCode;
  const incomeCategories = budget?.incomeBudgetCategories ?? [];
  const expenseCategories = budget?.expenseBudgetCategories ?? [];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Назад</Text>
          </Pressable>
          <Text variant="title">Budget details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? <Text variant="caption">Загрузка бюджета...</Text> : null}
        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" size="sm" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {!isLoading && !error && !budget ? (
          <Card>
            <Text variant="caption">Бюджет не найден.</Text>
          </Card>
        ) : null}

        {budget ? (
          <>
            <Card style={styles.summaryCard}>
              <Text variant="subtitle">{budget.month}</Text>
              <View style={styles.summaryRow}>
                <Text>Planned income</Text>
                <Text style={styles.positiveValue}>{renderAmount(budget.totalIncome, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Planned expense</Text>
                <Text style={styles.negativeValue}>{renderAmount(budget.totalExpense, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Actual income</Text>
                <Text style={styles.positiveValue}>{renderAmount(budget.totalIncomeFact, currency)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Actual expense</Text>
                <Text style={styles.negativeValue}>{renderAmount(budget.totalExpenseFact, currency)}</Text>
              </View>
            </Card>

            <Card style={styles.sectionCard}>
              <Text variant="subtitle">Income categories</Text>
              {incomeCategories.length === 0 ? (
                <Text variant="caption">Категории доходов пока недоступны.</Text>
              ) : (
                incomeCategories.map((item) => (
                  <View key={item.id ?? `${item.category?.id}-${item.planAmount}`} style={styles.categoryRow}>
                    <View style={styles.categoryTitleCell}>
                      <View style={styles.categoryIcon}>
                        <CategoryIcon name={item.category?.icon} size={26} />
                      </View>
                      <Text numberOfLines={1} style={styles.categoryName}>
                        {renderCategoryName(item)}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.positiveValue}>
                      {renderAmount(item.planAmount, (item.currency ?? currency) as CurrencyCode)}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.sectionCard}>
              <Text variant="subtitle">Expense categories</Text>
              {expenseCategories.length === 0 ? (
                <Text variant="caption">Категории расходов пока недоступны.</Text>
              ) : (
                expenseCategories.map((item) => (
                  <View key={item.id ?? `${item.category?.id}-${item.planAmount}`} style={styles.categoryRow}>
                    <View style={styles.categoryTitleCell}>
                      <View style={styles.categoryIcon}>
                        <CategoryIcon name={item.category?.icon} size={26} />
                      </View>
                      <Text numberOfLines={1} style={styles.categoryName}>
                        {renderCategoryName(item)}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.negativeValue}>
                      {renderAmount(item.planAmount, (item.currency ?? currency) as CurrencyCode)}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <Card>
              <Text variant="caption">
                Изменение бюджета и редактирование категорий будут добавлены отдельно после расширения backend API.
              </Text>
            </Card>
          </>
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
  backLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 48,
  },
  errorCard: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionCard: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  categoryName: {
    flex: 1,
    minWidth: 0,
  },
  categoryTitleCell: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
});
