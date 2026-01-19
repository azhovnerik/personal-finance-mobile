import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, spacing } from "../src/shared/ui";

export default function SupportScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Contact support</Text>
            <Text variant="caption">We usually respond within one business day.</Text>
          </View>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Send a request</Text>
          <Input placeholder="Email" keyboardType="email-address" />
          <Input placeholder="Subject" />
          <Input placeholder="Message" multiline />
          <Button title="Send request" />
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
});
