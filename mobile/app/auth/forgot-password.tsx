import { localizeSystemMessage, translate } from "../../src/localization";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { forgotPassword } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError(translate("Enter your email."));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await forgotPassword(email.trim());
      setMessage(
        response.cooldownSeconds
          ? translate("If the account exists, an email has been sent. Retry in {{seconds}} seconds.", {
              seconds: response.cooldownSeconds,
            })
          : translate("If the account exists, an email has been sent."),
      );
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(localizeSystemMessage(apiError.message, "Unable to send the email."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading">{translate("Password recovery")}</Text>
        <Input placeholder={translate("Email")} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {message ? <Text>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? translate("Sending...") : translate("Send email")} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title={translate("Back to sign in")} variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
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
  error: {
    color: colors.danger,
  },
});
