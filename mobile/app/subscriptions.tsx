import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    description: "Track a few accounts and essential reports.",
  },
  {
    id: "plus",
    name: "Plus",
    price: "€4.99 / month",
    description: "Unlimited accounts, budgets, and exports.",
  },
];

export default function SubscriptionsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Subscription</Text>
            <Text variant="caption">Manage your active plan</Text>
          </View>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Current plan</Text>
          <Text style={styles.planName}>Trial</Text>
          <Text variant="caption">Free trial ends on 2026-01-22</Text>
          <View style={styles.actionRow}>
            <Button title="Subscribe" />
            <Button title="Cancel" variant="ghost" size="sm" />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Available plans</Text>
          <Text variant="caption">Switch anytime</Text>
        </View>

        <View style={styles.list}>
          {PLANS.map((plan) => (
            <Card key={plan.id} style={styles.card}>
              <Text>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text variant="caption">{plan.description}</Text>
              <Button title="Select plan" variant="outline" tone="primary" size="sm" />
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
  card: {
    gap: spacing.sm,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
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
});
