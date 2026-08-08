import { localizeSystemMessage, translate } from "../../src/localization";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { resendVerification } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function ResendVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
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
      const response = await resendVerification(email.trim());
      setMessage(
        response.cooldownSeconds
          ? translate("Email sent. You can retry in about {{seconds}} seconds.", {
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
        <Text variant="heading">{translate("Resend email")}</Text>
        <Input placeholder={translate("Email")} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {message ? <Text>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? translate("Sending...") : translate("Send email")} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title={translate("Verify with token")} variant="outline" tone="primary" onPress={() => router.push("/auth/verify")} />
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
