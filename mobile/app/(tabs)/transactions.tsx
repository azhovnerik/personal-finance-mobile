import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

const FILTERS = [
  { label: "Все", active: true },
  { label: "Доход", active: false },
  { label: "Расход", active: false },
  { label: "Счет: Основной", active: false },
];

const TRANSACTIONS = [
  {
    id: "t1",
    title: "Супермаркет",
    category: "Продукты",
    account: "Основной счет",
    amount: "-₴ 2 350",
    date: "Сегодня, 12:40",
  },
  {
    id: "t2",
    title: "Такси",
    category: "Транспорт",
    account: "Карта",
    amount: "-₴ 480",
    date: "Сегодня, 08:10",
  },
  {
    id: "t3",
    title: "Фриланс",
    category: "Доход",
    account: "Основной счет",
    amount: "+₴ 9 200",
    date: "Вчера, 18:30",
  },
];

export default function TransactionsScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Транзакции</Text>
            <Text variant="caption">Список операций и фильтры</Text>
          </View>
          <Button title="Добавить" />
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
          {TRANSACTIONS.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View>
                  <Text>{transaction.title}</Text>
                  <Text variant="caption">{transaction.category}</Text>
                </View>
                <Text
                  style={transaction.amount.startsWith("-") ? styles.negativeValue : styles.positiveValue}
                >
                  {transaction.amount}
                </Text>
              </View>
              <Text variant="caption">{transaction.date}</Text>
              <Text variant="caption">{transaction.account}</Text>
              <View style={styles.actionRow}>
                <Button title="Редактировать" variant="secondary" />
                <Button title="Удалить" variant="ghost" />
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
