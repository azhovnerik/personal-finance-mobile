import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const PLANS = [
  {
    id: "basic",
    name: "Базовый",
    price: "₴ 0 / мес",
    features: ["1 счет", "До 50 транзакций", "Базовая аналитика"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₴ 199 / мес",
    features: ["Безлимитные счета", "Бюджеты и цели", "Экспорт отчетов"],
  },
  {
    id: "team",
    name: "Команда",
    price: "₴ 399 / мес",
    features: ["Совместные бюджеты", "Роли и права", "Приоритетная поддержка"],
  },
];

export default function SubscriptionsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Подписки</Text>
            <Text variant="caption">Управление активным планом</Text>
          </View>
          <Button title="Назад" variant="secondary" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Текущий план</Text>
          <Text style={styles.planName}>Pro</Text>
          <Text variant="caption">Активен до 30.04.2025</Text>
          <View style={styles.actionRow}>
            <Button title="Перейти к оплате" />
            <Button title="Отменить" variant="ghost" />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Выберите план</Text>
          <Text variant="caption">Переключение доступно в любое время</Text>
        </View>

        <View style={styles.list}>
          {PLANS.map((plan) => (
            <Card key={plan.id} style={styles.card}>
              <View style={styles.planHeader}>
                <Text>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
              <View style={styles.featuresList}>
                {plan.features.map((feature) => (
                  <Text key={feature} variant="caption">
                    • {feature}
                  </Text>
                ))}
              </View>
              <Button title="Выбрать" variant="secondary" />
            </Card>
          ))}
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Оплата через LiqPay</Text>
          <Text variant="caption">После выбора плана вы будете перенаправлены на страницу оплаты.</Text>
          <Button title="Открыть LiqPay" />
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
  card: {
    gap: spacing.sm,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPrice: {
    fontWeight: "600",
    color: colors.primaryDark,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  list: {
    gap: spacing.sm,
  },
  featuresList: {
    gap: spacing.xs,
  },
});
