import { localizeSystemMessage, translate } from "../src/localization";
import { useLocalization } from "../src/localization/LocalizationProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import type { CurrencyCode } from "../src/shared/api/dto";
import { clearAuthSession } from "../src/features/auth/api";
import { logout } from "../src/features/auth/logout";
import {
  requestAppleDeletionCredential,
  requestGoogleDeletionCredential,
} from "../src/features/settings/accountDeletion/reauthenticate";
import type { AccountDeletionMethod } from "../src/features/settings/accountDeletion/types";
import { useDeleteAccount } from "../src/features/settings/accountDeletion/useDeleteAccount";
import { useChangePassword } from "../src/features/settings/useChangePassword";
import { useResendPendingEmail } from "../src/features/settings/useResendPendingEmail";
import { useSettingsProfile } from "../src/features/settings/useSettingsProfile";
import { useUpdateSettingsProfile } from "../src/features/settings/useUpdateSettingsProfile";
import { Button, Card, Input, ScreenContainer, Select, Text, colors, spacing } from "../src/shared/ui";
import { SettingsApiError } from "../src/features/settings/types";
import { useSubscriptionStatus } from "../src/features/subscriptions/useSubscriptionStatus";

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
      acc[key] = localizeSystemMessage(value, "Invalid value.");
    }
    return acc;
  }, {});
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return localizeSystemMessage(error.message, fallback);
  }
  return fallback;
};

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setLocale } = useLocalization();
  const { profileResponse, isLoading, isRefreshing, error, refresh } = useSettingsProfile();
  const updateProfileMutation = useUpdateSettingsProfile();
  const resendEmailMutation = useResendPendingEmail();
  const changePasswordMutation = useChangePassword();
  const deleteAccountMutation = useDeleteAccount();
  const { statusResponse: subscriptionStatus } = useSubscriptionStatus();

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

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMethod, setDeleteMethod] = useState<AccountDeletionMethod | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteReauthenticationPending, setIsDeleteReauthenticationPending] = useState(false);

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
      setFieldErrors({ name: translate("Enter your name") });
      return;
    }

    if (!email.trim()) {
      setFieldErrors({ email: translate("Enter your email") });
      return;
    }

    if (!language) {
      setFieldErrors({ language: translate("Select a language") });
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
          ? localizeSystemMessage(result.message, "The new email must be verified.")
          : translate("Profile saved."),
      );
      setLocale(result.profile.language);
      setIsProfileDirty(false);
      setFieldErrors({});
      setFormError(null);
    } catch (mutationError) {
      setFieldErrors(extractFieldErrors(mutationError));
      setFormError(getErrorMessage(mutationError, translate("Unable to save the profile.")));
    }
  }, [baseCurrency, email, language, name, telegramUsername, updateProfileMutation]);

  const handleResendEmail = useCallback(async () => {
    setSuccessMessage(null);
    setFormError(null);

    try {
      const response = await resendEmailMutation.mutateAsync();
      if (response.sent) {
        setSuccessMessage(translate("Email resent. Retry in {{seconds}} seconds.", {
          seconds: response.cooldownSeconds,
        }));
        return;
      }
      setFormError(translate("Email was not sent. Try again in {{seconds}} seconds.", {
        seconds: response.cooldownSeconds,
      }));
    } catch (mutationError) {
      setFormError(getErrorMessage(mutationError, translate("Unable to resend the email.")));
    }
  }, [resendEmailMutation]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordFieldErrors({});

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError(translate("Complete all password fields."));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFieldErrors({ confirmNewPassword: translate("Passwords do not match.") });
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

      setSuccessMessage(translate("Password changed."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordForm(false);
    } catch (mutationError) {
      setPasswordFieldErrors(extractFieldErrors(mutationError));
      setPasswordError(getErrorMessage(mutationError, translate("Unable to change password.")));
    }
  }, [changePasswordMutation, confirmNewPassword, currentPassword, newPassword, router]);

  const hasActiveAppleSubscription = useMemo(
    () => subscriptionStatus?.sources.some(
      (source) => source.provider === "APPLE" && ["ACTIVE", "PAST_DUE"].includes(source.status),
    ) ?? false,
    [subscriptionStatus?.sources],
  );

  const deleteActionTitle = useMemo(() => {
    if (isDeleteReauthenticationPending && deleteMethod === "GOOGLE") {
      return translate("Signing in with Google...");
    }
    if (isDeleteReauthenticationPending && deleteMethod === "APPLE") {
      return translate("Signing in...");
    }
    if (deleteAccountMutation.isPending) {
      return translate("Deleting account...");
    }
    if (deleteMethod === "GOOGLE") {
      return translate("Continue with Google and delete account");
    }
    if (deleteMethod === "APPLE") {
      return translate("Continue with Apple and delete account");
    }
    return translate("Delete MoneyDrive account permanently");
  }, [deleteAccountMutation.isPending, deleteMethod, isDeleteReauthenticationPending]);

  const openAppleSubscriptionManagement = useCallback(async () => {
    const urls = [
      "itms-apps://apps.apple.com/account/subscriptions",
      "https://apps.apple.com/account/subscriptions",
    ];
    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Try the web fallback when the App Store URL is unavailable.
      }
    }
    setDeleteError(translate("Unable to open subscription management."));
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (!deleteMethod || deleteConfirmation !== "DELETE") {
      return;
    }
    setDeleteError(null);

    try {
      const payload = {
        confirmation: deleteConfirmation,
        method: deleteMethod,
        ...(deleteMethod === "PASSWORD" ? { currentPassword: deletePassword } : {}),
      };

      if (deleteMethod === "GOOGLE") {
        let idToken: string | null;
        setIsDeleteReauthenticationPending(true);
        try {
          idToken = await requestGoogleDeletionCredential();
        } finally {
          setIsDeleteReauthenticationPending(false);
        }
        if (!idToken) return;
        await deleteAccountMutation.mutateAsync({ ...payload, googleIdToken: idToken });
      } else if (deleteMethod === "APPLE") {
        let credential;
        setIsDeleteReauthenticationPending(true);
        try {
          credential = await requestAppleDeletionCredential();
        } finally {
          setIsDeleteReauthenticationPending(false);
        }
        if (!credential) {
          return;
        }
        await deleteAccountMutation.mutateAsync({
          ...payload,
          appleIdentityToken: credential.identityToken,
          appleNonce: credential.nonce,
          appleAuthorizationCode: credential.authorizationCode,
        });
      } else {
        await deleteAccountMutation.mutateAsync(payload);
      }

      await queryClient.cancelQueries();
      queryClient.clear();
      try {
        await logout();
      } finally {
        router.replace("/login");
        Alert.alert(translate("Account deleted"));
      }
    } catch (mutationError) {
      setDeleteError(getErrorMessage(mutationError, translate("Unable to delete the account.")));
    }
  }, [
    deleteAccountMutation,
    deleteConfirmation,
    deleteMethod,
    deletePassword,
    queryClient,
    router,
  ]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <View>
            <Text variant="title">{translate("Account settings")}</Text>
            <Text variant="caption">{translate("Profile, language, and security")}</Text>
          </View>
          <Button title={translate("Back")} variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        {error ? (
          <Card style={styles.messageCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title={translate("Retry")} size="sm" onPress={() => void refresh()} />
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
            <Text variant="caption">{translate("Loading settings...")}</Text>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text variant="subtitle">{translate("Profile")}</Text>

          <View style={styles.verifiedRow}>
            <Text variant="caption">{translate("Verification")}</Text>
            <Text style={[styles.verifiedBadge, profile?.emailVerified ? styles.verifiedYes : styles.verifiedNo]}>
              {profile?.emailVerified ? translate("Verified") : translate("Unverified")}
            </Text>
          </View>

          <Input
            placeholder={translate("Email")}
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
            placeholder={translate("Name")}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setIsProfileDirty(true);
            }}
          />
          {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}

          <Input
            placeholder={translate("Telegram username")}
            value={telegramUsername}
            onChangeText={(value) => {
              setTelegramUsername(value);
              setIsProfileDirty(true);
            }}
            autoCapitalize="none"
          />
          {fieldErrors.telegramUsername ? <Text style={styles.errorText}>{fieldErrors.telegramUsername}</Text> : null}

          <Select
            placeholder={translate("Interface language")}
            value={language}
            options={languageOptions}
            onChange={(value) => {
              setLanguage(value);
              setIsProfileDirty(true);
            }}
          />
          {fieldErrors.language ? <Text style={styles.errorText}>{fieldErrors.language}</Text> : null}

          <Select
            placeholder={translate("Base currency")}
            value={baseCurrency}
            options={effectiveCurrencyOptions}
            onChange={(value) => {
              setBaseCurrency(value as CurrencyCode);
              setIsProfileDirty(true);
            }}
          />
          {!canChangeBaseCurrency ? (
            <Text style={styles.warningText}>{translate("The base currency cannot be changed because budgets or transactions already exist.")}</Text>
          ) : null}
          {fieldErrors.baseCurrency ? <Text style={styles.errorText}>{fieldErrors.baseCurrency}</Text> : null}

          <Button
            title={updateProfileMutation.isPending ? translate("Saving...") : translate("Save")}
            disabled={updateProfileMutation.isPending || isLoading}
            onPress={() => void handleSaveProfile()}
          />
        </Card>

        {profile?.pendingEmail ? (
          <Card style={styles.card}>
            <Text variant="subtitle">{translate("Email verification")}</Text>
            <Text variant="caption">
              {translate("New email awaiting verification: {{email}}", { email: profile.pendingEmail })}
            </Text>
            <Button
              title={resendEmailMutation.isPending ? translate("Sending...") : translate("Resend email")}
              variant="outline"
              tone="primary"
              size="sm"
              disabled={resendEmailMutation.isPending}
              onPress={() => void handleResendEmail()}
            />
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text variant="subtitle">{translate("Password")}</Text>
          {profile?.hasPassword ? (
            <Button
              title={showPasswordForm ? translate("Hide form") : translate("Change password")}
              variant="outline"
              tone="primary"
              size="sm"
              onPress={() => setShowPasswordForm((value) => !value)}
            />
          ) : (
            <Text variant="caption">
              {translate("This account has no password. Password setup is handled separately.")}</Text>
          )}

          {showPasswordForm && profile?.hasPassword ? (
            <View style={styles.passwordForm}>
              <Input
                placeholder={translate("Current password")}
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
                placeholder={translate("New password")}
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
                placeholder={translate("Confirm new password")}
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
                title={changePasswordMutation.isPending ? translate("Saving...") : translate("Save password")}
                disabled={changePasswordMutation.isPending}
                onPress={() => void handleChangePassword()}
              />
            </View>
          ) : null}
        </Card>

        <Card style={{ ...styles.card, ...styles.dangerCard }}>
          <Text variant="caption">
            {translate("Deleting your account permanently removes your profile and financial data. This action cannot be undone.")}
          </Text>

          {!showDeleteForm ? (
            <Button
              title={translate("Delete MoneyDrive account")}
              variant="outline"
              tone="danger"
              onPress={() => setShowDeleteForm(true)}
            />
          ) : (
            <View style={styles.deleteForm}>
              <Text style={styles.dangerText}>
                {translate("Accounts, categories, budgets, transactions, transfers, settings, and access tokens will be deleted.")}
              </Text>

              {hasActiveAppleSubscription ? (
                <View style={styles.subscriptionWarning}>
                  <Text style={styles.warningText}>
                    {translate("Deleting MoneyDrive does not cancel App Store billing. Cancel the subscription in Apple settings if you no longer want it.")}
                  </Text>
                  <Button
                    title={translate("Manage Apple subscription")}
                    variant="outline"
                    tone="secondary"
                    size="sm"
                    onPress={() => void openAppleSubscriptionManagement()}
                  />
                </View>
              ) : null}

              <Input
                placeholder={translate("Type DELETE to confirm")}
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <Text variant="caption">{translate("Confirm your identity")}</Text>
              <Text variant="caption">
                {translate("Choose a verification method. Sign-in will open after you press the final delete button.")}
              </Text>
              <View style={styles.methodButtons}>
                {profile?.hasPassword ? (
                  <Button
                    title={translate("Password")}
                    variant={deleteMethod === "PASSWORD" ? "primary" : "outline"}
                    tone={deleteMethod === "PASSWORD" ? "danger" : "secondary"}
                    size="sm"
                    accessibilityState={{ selected: deleteMethod === "PASSWORD" }}
                    onPress={() => setDeleteMethod("PASSWORD")}
                  />
                ) : null}
                {Platform.OS === "ios" ? (
                  <>
                    <Button
                      title={translate("Google")}
                      variant={deleteMethod === "GOOGLE" ? "primary" : "outline"}
                      tone={deleteMethod === "GOOGLE" ? "danger" : "secondary"}
                      size="sm"
                      accessibilityState={{ selected: deleteMethod === "GOOGLE" }}
                      onPress={() => setDeleteMethod("GOOGLE")}
                    />
                    <Button
                      title={translate("Apple")}
                      variant={deleteMethod === "APPLE" ? "primary" : "outline"}
                      tone={deleteMethod === "APPLE" ? "danger" : "secondary"}
                      size="sm"
                      accessibilityState={{ selected: deleteMethod === "APPLE" }}
                      onPress={() => setDeleteMethod("APPLE")}
                    />
                  </>
                ) : null}
              </View>

              {deleteMethod === "PASSWORD" ? (
                <Input
                  placeholder={translate("Current password")}
                  secureTextEntry
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                />
              ) : null}

              {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}

              <Button
                title={deleteActionTitle}
                tone="danger"
                disabled={
                  deleteAccountMutation.isPending
                  || isDeleteReauthenticationPending
                  || deleteConfirmation !== "DELETE"
                  || !deleteMethod
                  || (deleteMethod === "PASSWORD" && !deletePassword)
                }
                onPress={() => void handleDeleteAccount()}
              />
              <Button
                title={translate("Cancel")}
                variant="ghost"
                tone="secondary"
                disabled={deleteAccountMutation.isPending || isDeleteReauthenticationPending}
                onPress={() => {
                  setShowDeleteForm(false);
                  setDeleteConfirmation("");
                  setDeleteMethod(null);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
              />
            </View>
          )}
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
  dangerCard: {
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },
  deleteForm: {
    gap: spacing.sm,
  },
  subscriptionWarning: {
    gap: spacing.sm,
  },
  methodButtons: {
    gap: spacing.sm,
  },
});
