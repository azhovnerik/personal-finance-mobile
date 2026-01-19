import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Account settings</Text>
            <Text variant="caption">Profile, language, and security</Text>
          </View>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Button title="Manage subscription" variant="outline" tone="primary" size="sm" style={styles.inlineButton} />
          <View style={styles.profileHeader}>
            <Text variant="subtitle">Profile</Text>
            <Text style={styles.verifiedBadge}>Verified</Text>
          </View>
          <Input placeholder="Email" defaultValue="test10@moneydrive.me" />
          <Input placeholder="Name" defaultValue="10" />
          <Input placeholder="Telegram name" defaultValue="Kij" />
          <Input placeholder="Default interface language" defaultValue="Українська" />
          <Input placeholder="Base currency" defaultValue="UAH" />
          <Button title="Save" />
          <Button title="Manage exchange rates" variant="outline" tone="primary" size="sm" />
        </Card>

        <Card style={styles.card}>
          <Text variant="subtitle">Password</Text>
          <Button title="Change password" variant="outline" tone="primary" size="sm" />
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
  inlineButton: {
    alignSelf: "flex-start",
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verifiedBadge: {
    backgroundColor: colors.success,
    color: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
  },
});
