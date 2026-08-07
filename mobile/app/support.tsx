import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useSettingsProfile } from "../src/features/settings/useSettingsProfile";
import { useSubmitSupportRequest } from "../src/features/support/useSubmitSupportRequest";
import { SupportApiError } from "../src/features/support/types";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const extractFieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof SupportApiError) || !error.details) {
    return {};
  }

  const fields = (error.details as { fields?: unknown }).fields;
  if (!fields || typeof fields !== "object") {
    return {};
  }

  return Object.entries(fields as Record<string, unknown>).reduce<Record<string, string>>((result, [key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    }
    return result;
  }, {});
};

export default function SupportScreen() {
  const router = useRouter();
  const submitMutation = useSubmitSupportRequest();
  const { profileResponse } = useSettingsProfile();
  const [email, setEmail] = useState("");
  const [isEmailInitialized, setIsEmailInitialized] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEmailInitialized && profileResponse?.profile.email) {
      setEmail(profileResponse.profile.email);
      setIsEmailInitialized(true);
    }
  }, [isEmailInitialized, profileResponse?.profile.email]);

  const handleSubmit = useCallback(async () => {
    const normalizedEmail = email.trim();
    const normalizedSubject = subject.trim();
    const normalizedMessage = message.trim();
    const validationErrors: Record<string, string> = {};

    if (!normalizedEmail) {
      validationErrors.email = "Enter your email.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      validationErrors.email = "Enter a valid email address.";
    }
    if (!normalizedSubject) {
      validationErrors.subject = "Enter a subject.";
    }
    if (!normalizedMessage) {
      validationErrors.message = "Enter a message.";
    }

    setFieldErrors(validationErrors);
    setFormError(null);
    setSuccessMessage(null);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await submitMutation.mutateAsync({
        email: normalizedEmail,
        subject: normalizedSubject,
        message: normalizedMessage,
      });
      setSubject("");
      setMessage("");
      setSuccessMessage("Your request has been sent to our support team.");
    } catch (error) {
      const serverFieldErrors = extractFieldErrors(error);
      setFieldErrors(serverFieldErrors);
      setFormError(error instanceof Error ? error.message : "Unable to send request. Please try again.");
    }
  }, [email, message, subject, submitMutation]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text variant="title">Contact support</Text>
            <Text variant="caption">We usually respond within one business day.</Text>
          </View>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Send a request</Text>
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            maxLength={255}
            onChangeText={(value) => {
              setEmail(value);
              setIsEmailInitialized(true);
            }}
            placeholder="Your email"
            value={email}
          />
          {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
          <Input
            maxLength={255}
            onChangeText={setSubject}
            placeholder="Subject"
            value={subject}
          />
          {fieldErrors.subject ? <Text style={styles.errorText}>{fieldErrors.subject}</Text> : null}
          <Input
            maxLength={4000}
            multiline
            onChangeText={setMessage}
            placeholder="Message"
            style={styles.messageInput}
            textAlignVertical="top"
            value={message}
          />
          {fieldErrors.message ? <Text style={styles.errorText}>{fieldErrors.message}</Text> : null}
          <Button
            disabled={submitMutation.isPending}
            onPress={() => void handleSubmit()}
            title={submitMutation.isPending ? "Sending..." : "Send request"}
          />
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
  messageInput: {
    minHeight: 120,
  },
  errorText: {
    color: colors.danger,
  },
  successText: {
    color: colors.success,
  },
});
