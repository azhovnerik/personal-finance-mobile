import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, ScreenContainer, Text, spacing } from "../../src/shared/ui";

const MORE_ITEMS = [
  { label: "Категории", description: "Доходы и расходы", route: "/categories" },
  { label: "Поддержка", description: "Связаться с сервисом", route: "/support" },
  { label: "Настройки", description: "Профиль и безопасность", route: "/settings" },
  { label: "Подписки", description: "Планы и оплата", route: "/subscriptions" },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="title">Ещё</Text>
          <Text variant="caption">Дополнительные разделы сервиса</Text>
        </View>

        <View style={styles.list}>
          {MORE_ITEMS.map((item) => (
            <Card key={item.label} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text>{item.label}</Text>
                  <Text variant="caption">{item.description}</Text>
                </View>
                <Button
                  title="Открыть"
                  variant="secondary"
                  onPress={() => router.push(item.route)}
                />
              </View>
            </Card>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  header: {
    gap: 4,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
