import { translate } from "../../src/localization";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Card, ScreenContainer, Text, spacing } from "../../src/shared/ui";

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading">{translate("Check your email")}</Text>
        <Text>
          {translate("We sent a verification email to {{email}}.", {
            email: email || translate("the specified address"),
          })}
        </Text>
        <Button
          title={translate("Resend email")}
          onPress={() =>
            router.replace({
              pathname: "/auth/resend-verification",
              params: email ? { email } : {},
            })
          }
        />
        <Button title={translate("I have a token")} variant="outline" tone="primary" onPress={() => router.push("/auth/verify")} />
        <Button title={translate("Go to sign in")} variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  card: {
    gap: spacing.md,
  },
});
