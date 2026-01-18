import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockBudgets, mockUser } from "../../src/shared/mocks";

export default function BudgetsScreen() {
  const baseCurrency = mockUser.baseCurrency ?? "UAH";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Бюджеты</Text>
            <Text variant="caption">Планирование и контроль расходов</Text>
          </View>
          <Button title="Новый" variant="outline" tone="primary" size="sm" />
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Добавить бюджет</Text>
          <Input placeholder="Название бюджета" />
          <Input placeholder="Лимит, ₴" keyboardType="numeric" />
          <Input placeholder="Период (например, март)" />
          <Button title="Создать бюджет" />
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Активные бюджеты</Text>
          <Text variant="caption">Добавляйте или удаляйте категории</Text>
        </View>

        <View style={styles.list}>
          {mockBudgets.map((budget) => (
            <Card key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View>
                  <Text>{budget.month}</Text>
                  <Text variant="caption">
                    Лимит {formatCurrency(budget.totalExpense ?? 0, budget.baseCurrency ?? baseCurrency)}
                  </Text>
                </View>
                <Text style={styles.spentValue}>
                  {formatCurrency(budget.totalExpenseFact ?? 0, budget.baseCurrency ?? baseCurrency)}
                </Text>
              </View>
              <View style={styles.categoryRow}>
                {(budget.expenseBudgetCategories ?? []).map((category) => (
                  <Chip
                    key={category.id}
                    label={category.category.name}
                  />
                ))}
                <Chip label="+ Категория" isActive />
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption">План</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(budget.totalExpense ?? 0, budget.baseCurrency ?? baseCurrency)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption">Факт</Text>
                <Text style={[styles.summaryValue, styles.negativeValue]}>
                  {formatCurrency(budget.totalExpenseFact ?? 0, budget.baseCurrency ?? baseCurrency)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text variant="caption">Остаток</Text>
                <Text style={[styles.summaryValue, styles.positiveValue]}>
                  {formatCurrency(budget.totalExpenseLeftover ?? 0, budget.baseCurrency ?? baseCurrency)}
                </Text>
              </View>
              <View style={styles.actionRow}>
                <Button title="Изменить" variant="secondary" size="sm" />
                <Button title="Удалить" variant="ghost" size="sm" />
              </View>
            </Card>
          ))}
        </View>

        <Card>
          <Text variant="subtitle">Сводка бюджета</Text>
          <View style={styles.summaryRow}>
            <Text>Всего запланировано</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(
                mockBudgets.reduce((sum, budget) => sum + (budget.totalExpense ?? 0), 0),
                baseCurrency,
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Потрачено</Text>
            <Text style={[styles.summaryValue, styles.negativeValue]}>
              {formatCurrency(
                mockBudgets.reduce((sum, budget) => sum + (budget.totalExpenseFact ?? 0), 0),
                baseCurrency,
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Остаток</Text>
            <Text style={[styles.summaryValue, styles.positiveValue]}>
              {formatCurrency(
                mockBudgets.reduce((sum, budget) => sum + (budget.totalExpenseLeftover ?? 0), 0),
                baseCurrency,
              )}
            </Text>
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
  },
  formCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  list: {
    gap: spacing.sm,
  },
  budgetCard: {
    gap: spacing.sm,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spentValue: {
    color: colors.accent,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryValue: {
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
  },
  positiveValue: {
    color: colors.success,
  },
});
