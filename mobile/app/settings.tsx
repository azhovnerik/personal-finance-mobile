import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { CurrencyCode } from "../src/shared/api/dto";
import { clearAuthSession } from "../src/features/auth/api";
import { useChangePassword } from "../src/features/settings/useChangePassword";
import { useResendPendingEmail } from "../src/features/settings/useResendPendingEmail";
import { useSettingsProfile } from "../src/features/settings/useSettingsProfile";
import { useUpdateSettingsProfile } from "../src/features/settings/useUpdateSettingsProfile";
import { Button, Card, Input, ScreenContainer, Select, Text, colors, spacing } from "../src/shared/ui";
import { SettingsApiError } from "../src/features/settings/types";

const extractFieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof SettingsApiError) || !error.details) {
    return {};
  }

  const fields = (error.details as { fields?: unknown }).fields;
  if (!fields || typeof fields !== "object") {
    return {};
  }

  return Object.entries(fields as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { profileResponse, isLoading, isRefreshing, error, refresh } = useSettingsProfile();
  const updateProfileMutation = useUpdateSettingsProfile();
  const resendEmailMutation = useResendPendingEmail();
  const changePasswordMutation = useChangePassword();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [language, setLanguage] = useState<string>("");
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode | null>(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profileResponse) {
      return;
    }

    if (isFormInitialized && isProfileDirty) {
      return;
    }

    setName(profileResponse.profile.name ?? "");
    setEmail(profileResponse.profile.email ?? "");
    setTelegramUsername(profileResponse.profile.telegramUsername ?? "");
    setLanguage(profileResponse.profile.language ?? "");
    setBaseCurrency(profileResponse.profile.baseCurrency ?? null);
    setIsFormInitialized(true);
  }, [isFormInitialized, isProfileDirty, profileResponse]);

  const languageOptions = useMemo(() => {
    return (profileResponse?.options.supportedLanguages ?? []).map((item) => ({
      label: item.label,
      value: item.code,
    }));
  }, [profileResponse?.options.supportedLanguages]);

  const currencyOptions = useMemo(() => {
    return (profileResponse?.options.supportedCurrencies ?? []).map((code) => ({
      label: code,
      value: code,
    }));
  }, [profileResponse?.options.supportedCurrencies]);

  const profile = profileResponse?.profile;
  const canChangeBaseCurrency = profileResponse?.capabilities.canChangeBaseCurrency ?? true;
  const effectiveCurrencyOptions = useMemo(() => {
    if (canChangeBaseCurrency) {
      return currencyOptions;
    }
    if (baseCurrency) {
      return [{ label: baseCurrency, value: baseCurrency }];
    }
    return [];
  }, [baseCurrency, canChangeBaseCurrency, currencyOptions]);

  const handleSaveProfile = useCallback(async () => {
    setSuccessMessage(null);
    setFormError(null);
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: "Введите имя" });
      return;
    }

    if (!email.trim()) {
      setFieldErrors({ email: "Введите email" });
      return;
    }

    if (!language) {
      setFieldErrors({ language: "Выберите язык" });
      return;
    }

    try {
      const result = await updateProfileMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        telegramUsername: telegramUsername.trim() || null,
        baseCurrency,
        language,
      });

      setSuccessMessage(
        result.emailChangeStarted
          ? (result.message ?? "Нужна верификация нового email.")
          : "Профиль сохранен.",
      );
      setIsProfileDirty(false);
      setFieldErrors({});
      setFormError(null);
    } catch (mutationError) {
      setFieldErrors(extractFieldErrors(mutationError));
      setFormError(getErrorMessage(mutationError, "Не удалось сохранить профиль."));
    }
  }, [baseCurrency, email, language, name, telegramUsername, updateProfileMutation]);

  const handleResendEmail = useCallback(async () => {
    setSuccessMessage(null);
    setFormError(null);

    try {
      const response = await resendEmailMutation.mutateAsync();
      if (response.sent) {
        setSuccessMessage(`Письмо отправлено повторно. Cooldown: ${response.cooldownSeconds}с.`);
        return;
      }
      setFormError(`Письмо не было отправлено. Попробуйте позже (cooldown ${response.cooldownSeconds}с).`);
    } catch (mutationError) {
      setFormError(getErrorMessage(mutationError, "Не удалось отправить письмо повторно."));
    }
  }, [resendEmailMutation]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordFieldErrors({});

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Заполните все поля пароля.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFieldErrors({ confirmNewPassword: "Пароли не совпадают." });
      return;
    }

    try {
      const response = await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      if (response.reauthRequired) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      setSuccessMessage("Пароль изменен.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordForm(false);
    } catch (mutationError) {
      setPasswordFieldErrors(extractFieldErrors(mutationError));
      setPasswordError(getErrorMessage(mutationError, "Не удалось изменить пароль."));
    }
  }, [changePasswordMutation, confirmNewPassword, currentPassword, newPassword, router]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <View>
            <Text variant="title">Account settings</Text>
            <Text variant="caption">Profile, language, and security</Text>
          </View>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        {error ? (
          <Card style={styles.messageCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Повторить" size="sm" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {formError ? (
          <Card style={styles.messageCard}>
            <Text style={styles.errorText}>{formError}</Text>
          </Card>
        ) : null}

        {successMessage ? (
          <Card style={styles.messageCard}>
            <Text style={styles.successText}>{successMessage}</Text>
          </Card>
        ) : null}

        {isLoading && !profileResponse ? (
          <Card style={styles.messageCard}>
            <Text variant="caption">Загрузка настроек...</Text>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text variant="subtitle">Profile</Text>

          <View style={styles.verifiedRow}>
            <Text variant="caption">Verification</Text>
            <Text style={[styles.verifiedBadge, profile?.emailVerified ? styles.verifiedYes : styles.verifiedNo]}>
              {profile?.emailVerified ? "Verified" : "Unverified"}
            </Text>
          </View>

          <Input
            placeholder="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setIsProfileDirty(true);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}

          <Input
            placeholder="Name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setIsProfileDirty(true);
            }}
          />
          {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}

          <Input
            placeholder="Telegram username"
            value={telegramUsername}
            onChangeText={(value) => {
              setTelegramUsername(value);
              setIsProfileDirty(true);
            }}
            autoCapitalize="none"
          />
          {fieldErrors.telegramUsername ? <Text style={styles.errorText}>{fieldErrors.telegramUsername}</Text> : null}

          <Select
            placeholder="Interface language"
            value={language}
            options={languageOptions}
            onChange={(value) => {
              setLanguage(value);
              setIsProfileDirty(true);
            }}
          />
          {fieldErrors.language ? <Text style={styles.errorText}>{fieldErrors.language}</Text> : null}

          <Select
            placeholder="Base currency"
            value={baseCurrency}
            options={effectiveCurrencyOptions}
            onChange={(value) => {
              setBaseCurrency(value as CurrencyCode);
              setIsProfileDirty(true);
            }}
          />
          {!canChangeBaseCurrency ? (
            <Text style={styles.warningText}>Изменение базовой валюты недоступно: уже есть бюджеты или транзакции.</Text>
          ) : null}
          {fieldErrors.baseCurrency ? <Text style={styles.errorText}>{fieldErrors.baseCurrency}</Text> : null}

          <Button
            title={updateProfileMutation.isPending ? "Сохранение..." : "Save"}
            disabled={updateProfileMutation.isPending || isLoading}
            onPress={() => void handleSaveProfile()}
          />
        </Card>

        {profile?.pendingEmail ? (
          <Card style={styles.card}>
            <Text variant="subtitle">Email verification</Text>
            <Text variant="caption">Ожидается подтверждение нового email: {profile.pendingEmail}</Text>
            <Button
              title={resendEmailMutation.isPending ? "Отправка..." : "Resend email"}
              variant="outline"
              tone="primary"
              size="sm"
              disabled={resendEmailMutation.isPending}
              onPress={() => void handleResendEmail()}
            />
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text variant="subtitle">Password</Text>
          {profile?.hasPassword ? (
            <Button
              title={showPasswordForm ? "Скрыть форму" : "Change password"}
              variant="outline"
              tone="primary"
              size="sm"
              onPress={() => setShowPasswordForm((value) => !value)}
            />
          ) : (
            <Text variant="caption">
              Для аккаунта не задан пароль. Password setup flow выполняется в отдельной задаче.
            </Text>
          )}

          {showPasswordForm && profile?.hasPassword ? (
            <View style={styles.passwordForm}>
              <Input
                placeholder="Current password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="oneTimeCode"
              />
              {passwordFieldErrors.currentPassword ? <Text style={styles.errorText}>{passwordFieldErrors.currentPassword}</Text> : null}

              <Input
                placeholder="New password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="oneTimeCode"
              />
              {passwordFieldErrors.newPassword ? <Text style={styles.errorText}>{passwordFieldErrors.newPassword}</Text> : null}

              <Input
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="oneTimeCode"
              />
              {passwordFieldErrors.confirmNewPassword ? (
                <Text style={styles.errorText}>{passwordFieldErrors.confirmNewPassword}</Text>
              ) : null}

              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

              <Button
                title={changePasswordMutation.isPending ? "Сохранение..." : "Save password"}
                disabled={changePasswordMutation.isPending}
                onPress={() => void handleChangePassword()}
              />
            </View>
          ) : null}
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
  messageCard: {
    gap: spacing.sm,
  },
  verifiedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verifiedBadge: {
    color: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
  },
  verifiedYes: {
    backgroundColor: colors.success,
  },
  verifiedNo: {
    backgroundColor: colors.warning,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
  },
  successText: {
    color: colors.success,
    fontSize: 12,
  },
  passwordForm: {
    gap: spacing.sm,
  },
});
