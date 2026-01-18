import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockTransactions, mockUser } from "../../src/shared/mocks";

const FILTERS = [
  { label: "Все", active: true },
  { label: "Доход", active: false },
  { label: "Расход", active: false },
  { label: "Счет: Основной", active: false },
];

export default function TransactionsScreen() {
  const baseCurrency = mockUser.baseCurrency ?? "UAH";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Транзакции</Text>
            <Text variant="caption">Список операций и фильтры</Text>
          </View>
          <Button title="Добавить" variant="outline" tone="primary" size="sm" />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <Chip key={filter.label} label={filter.label} isActive={filter.active} />
          ))}
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Новая транзакция</Text>
          <Input placeholder="Сумма, ₴" keyboardType="numeric" />
          <Input placeholder="Категория" />
          <Input placeholder="Счет" />
          <Input placeholder="Описание" />
          <Button title="Сохранить" />
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Последние операции</Text>
          <Text variant="caption">Редактируйте или удаляйте транзакции</Text>
        </View>

        <View style={styles.list}>
          {mockTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View>
                  <Text>{transaction.category.name}</Text>
                  <Text variant="caption">{transaction.comment}</Text>
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
              <Text variant="caption">{transaction.date}</Text>
              <Text variant="caption">{transaction.account.name}</Text>
              <View style={styles.actionRow}>
                <Button title="Редактировать" variant="secondary" size="sm" />
                <Button title="Удалить" variant="ghost" size="sm" />
              </View>
            </Card>
          ))}
        </View>
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
  transactionCard: {
    gap: spacing.xs,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
