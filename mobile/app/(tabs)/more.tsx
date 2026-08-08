import { translate } from "../../src/localization";
import { useLocalization } from "../../src/localization/LocalizationProvider";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon, Button, Card, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { CategoryIcon } from "../../src/features/categories/components/CategoryIcon";

export default function MoreScreen() {
  useLocalization();
  const router = useRouter();
  const moreItems = [
    {
      label: translate("Support"),
      description: translate("Contact support"),
      route: "/support",
      iconKind: "category",
      icon: "expense.health",
    },
    {
      label: translate("Settings"),
      description: translate("Profile and security"),
      route: "/settings",
      iconKind: "category",
      icon: "expense.utilities",
    },
    {
      label: translate("Subscriptions"),
      description: translate("Plans and billing"),
      route: "/subscriptions",
      iconKind: "category",
      icon: "expense.subscriptions",
    },
  ];

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="title">{translate("More")}</Text>
          <Text variant="caption">{translate("More service sections")}</Text>
        </View>

        <View style={styles.list}>
          {moreItems.map((item) => (
            <Card key={item.route} style={styles.card}>
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
                  title={translate("Open")}
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
