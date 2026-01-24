import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockBudgets, mockUser } from "../../src/shared/mocks";

export default function BudgetsScreen() {
  const baseCurrency = mockUser.baseCurrency ?? "UAH";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Budgets</Text>
            <Text variant="caption">Monthly income and expense targets</Text>
          </View>
          <Button title="Add new budget" size="sm" />
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Add budget</Text>
          <Input placeholder="Month" />
          <Input placeholder="Total income" keyboardType="numeric" />
          <Input placeholder="Total expenses" keyboardType="numeric" />
          <Button title="Create budget" />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.tableHeader}>
            <Text variant="caption">Month</Text>
            <Text variant="caption">Total income</Text>
            <Text variant="caption">Total expenses</Text>
          </View>
          <View style={styles.list}>
            {mockBudgets.map((budget) => (
              <View key={budget.id} style={styles.rowCard}>
                <View>
                  <Text>{budget.month}</Text>
                  <Text variant="caption">
                    {formatCurrency(budget.totalIncome ?? 0, budget.baseCurrency ?? baseCurrency)} income
                  </Text>
                </View>
                <View style={styles.rowAmounts}>
                  <Text style={styles.positiveValue}>
                    {formatCurrency(budget.totalIncomeFact ?? 0, budget.baseCurrency ?? baseCurrency)}
                  </Text>
                  <Text style={styles.negativeValue}>
                    {formatCurrency(budget.totalExpenseFact ?? 0, budget.baseCurrency ?? baseCurrency)}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Button title="Details" variant="outline" tone="primary" size="sm" />
                  <Button title="Delete" variant="ghost" size="sm" />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text variant="subtitle">Budget summary</Text>
          <View style={styles.summaryRow}>
            <Text>Total income</Text>
            <Text style={styles.positiveValue}>
              {formatCurrency(
                mockBudgets.reduce((sum, budget) => sum + (budget.totalIncomeFact ?? 0), 0),
                baseCurrency,
              )}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total expenses</Text>
            <Text style={styles.negativeValue}>
              {formatCurrency(
                mockBudgets.reduce((sum, budget) => sum + (budget.totalExpenseFact ?? 0), 0),
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
  sectionCard: {
    gap: spacing.sm,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  list: {
    gap: spacing.sm,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rowAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
});
