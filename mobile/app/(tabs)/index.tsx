import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Chip, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

const QUICK_ACTIONS = [
  { label: "Добавить транзакцию", route: "/(tabs)/transactions" },
  { label: "Добавить бюджет", route: "/(tabs)/budgets" },
  { label: "Добавить категорию", route: "/categories" },
  { label: "Добавить счет", route: "/(tabs)/accounts" },
];

const ANALYTICS = [
  { label: "Доходы", value: "₴ 82 500", change: "+12%", tone: colors.success },
  { label: "Расходы", value: "₴ 46 900", change: "-4%", tone: colors.danger },
  { label: "Сбережения", value: "₴ 18 300", change: "+7%", tone: colors.primary },
];

const RECENT_TRANSACTIONS = [
  {
    id: "t1",
    title: "Супермаркет",
    category: "Продукты",
    amount: "-₴ 2 350",
    date: "Сегодня, 12:40",
  },
  {
    id: "t2",
    title: "Перевод на депозит",
    category: "Сбережения",
    amount: "-₴ 4 000",
    date: "Вчера, 19:10",
  },
  {
    id: "t3",
    title: "Зарплата",
    category: "Доход",
    amount: "+₴ 32 000",
    date: "28 фев",
  },
];

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Дашборд</Text>
            <Text variant="caption">Обзор финансов за последний месяц</Text>
          </View>
          <Chip label="Март" isActive />
        </View>

        <Card style={styles.balanceCard}>
          <Text variant="caption">Общий баланс</Text>
          <Text variant="title">₴ 164 250</Text>
          <View style={styles.balanceFooter}>
            <Text variant="caption">+₴ 12 400 за месяц</Text>
            <Chip label="Стабильно" isActive />
          </View>
        </Card>

        <View style={styles.analyticsGrid}>
          {ANALYTICS.map((item) => (
            <Card key={item.label} style={styles.analyticsCard}>
              <Text variant="caption">{item.label}</Text>
              <Text style={styles.analyticsValue}>{item.value}</Text>
              <Text style={[styles.analyticsChange, { color: item.tone }]}> {item.change}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Швидкі дії</Text>
          <Text variant="caption">Часто используемые операции</Text>
        </View>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              title={action.label}
              variant="secondary"
              onPress={() => router.push(action.route)}
              style={styles.quickActionButton}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Аналитика расходов</Text>
          <Text variant="caption">Категории с наибольшими тратами</Text>
        </View>
        <Card>
          <View style={styles.analyticsRow}>
            <View>
              <Text>Продукты</Text>
              <Text variant="caption">36% от расходов</Text>
            </View>
            <Text style={styles.negativeValue}>-₴ 16 800</Text>
          </View>
          <View style={styles.analyticsRow}>
            <View>
              <Text>Дом и быт</Text>
              <Text variant="caption">22% от расходов</Text>
            </View>
            <Text style={styles.negativeValue}>-₴ 10 350</Text>
          </View>
          <View style={styles.analyticsRow}>
            <View>
              <Text>Транспорт</Text>
              <Text variant="caption">15% от расходов</Text>
            </View>
            <Text style={styles.negativeValue}>-₴ 7 100</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Последние транзакции</Text>
          <Text variant="caption">Обновлено 5 минут назад</Text>
        </View>
        <View style={styles.transactionList}>
          {RECENT_TRANSACTIONS.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text>{transaction.title}</Text>
                <Text
                  style={transaction.amount.startsWith("-") ? styles.negativeValue : styles.positiveValue}
                >
                  {transaction.amount}
                </Text>
              </View>
              <Text variant="caption">{transaction.category}</Text>
              <Text variant="caption">{transaction.date}</Text>
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
  balanceCard: {
    gap: spacing.sm,
  },
  balanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analyticsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  analyticsCard: {
    flex: 1,
    minWidth: 140,
    gap: spacing.xs,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  analyticsChange: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    gap: 4,
  },
  quickActions: {
    gap: spacing.sm,
  },
  quickActionButton: {
    justifyContent: "flex-start",
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionList: {
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
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
});
