import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

const BUDGETS = [
  {
    id: "b1",
    title: "Семейные расходы",
    amount: "₴ 20 000",
    spent: "₴ 12 450",
    categories: ["Продукты", "Дом", "Транспорт"],
  },
  {
    id: "b2",
    title: "Личные цели",
    amount: "₴ 8 000",
    spent: "₴ 6 120",
    categories: ["Обучение", "Спорт"],
  },
];

export default function BudgetsScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Бюджеты</Text>
            <Text variant="caption">Планирование и контроль расходов</Text>
          </View>
          <Button title="Новый" />
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
          {BUDGETS.map((budget) => (
            <Card key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View>
                  <Text>{budget.title}</Text>
                  <Text variant="caption">Лимит {budget.amount}</Text>
                </View>
                <Text style={styles.spentValue}>{budget.spent}</Text>
              </View>
              <View style={styles.categoryRow}>
                {budget.categories.map((category) => (
                  <Chip key={category} label={category} />
                ))}
                <Chip label="+ Категория" isActive />
              </View>
              <View style={styles.actionRow}>
                <Button title="Изменить" variant="secondary" />
                <Button title="Удалить" variant="ghost" />
              </View>
            </Card>
          ))}
        </View>

        <Card>
          <Text variant="subtitle">Сводка бюджета</Text>
          <View style={styles.summaryRow}>
            <Text>Всего запланировано</Text>
            <Text style={styles.summaryValue}>₴ 28 000</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Потрачено</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>₴ 18 570</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Остаток</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>₴ 9 430</Text>
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
    color: colors.warning,
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
});
