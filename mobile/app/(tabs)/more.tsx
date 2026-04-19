import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon, Button, Card, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { CategoryIcon } from "../../src/features/categories/components/CategoryIcon";

const MORE_ITEMS = [
  { label: "Поддержка", description: "Связаться с сервисом", route: "/support", iconKind: "category", icon: "expense.health" },
  { label: "Настройки", description: "Профиль и безопасность", route: "/settings", iconKind: "category", icon: "expense.utilities" },
  { label: "Подписки", description: "Планы и оплата", route: "/subscriptions", iconKind: "category", icon: "expense.subscriptions" },
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
                <View style={styles.titleBlock}>
                  <View style={styles.titleRow}>
                    {item.iconKind === "app" ? (
                      <AppIcon name="settings" size={20} color={colors.primary} />
                    ) : (
                      <CategoryIcon name={item.icon} size={22} />
                    )}
                    <Text>{item.label}</Text>
                  </View>
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
  titleBlock: {
    gap: 4,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
