import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";

import { localizeSystemMessage, translate } from "../../../localization";
import { Button, Card, Input, Text, colors, spacing } from "../../../shared/ui";
import { logout } from "../../auth/logout";
import type { SubscriptionStatusResponse } from "../../subscriptions/types";
import { useSettingsProfile } from "../useSettingsProfile";
import { requestAppleDeletionCredential, requestGoogleDeletionCredential } from "./reauthenticate";
import type { AccountDeletionMethod } from "./types";
import { useDeleteAccount } from "./useDeleteAccount";

type AccountDeletionCardProps = {
  subscriptionStatus: SubscriptionStatusResponse | null;
  disabled?: boolean;
};

export const AccountDeletionCard = ({ subscriptionStatus, disabled = false }: AccountDeletionCardProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteAccountMutation = useDeleteAccount();
  const { profileResponse, error, refresh } = useSettingsProfile();
  const profile = profileResponse?.profile;

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMethod, setDeleteMethod] = useState<AccountDeletionMethod | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteReauthenticationPending, setIsDeleteReauthenticationPending] = useState(false);
  const normalizedDeleteConfirmation = deleteConfirmation.trim();

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

  const isDeleteActionDisabled = disabled
    || deleteAccountMutation.isPending
    || isDeleteReauthenticationPending
    || normalizedDeleteConfirmation !== "DELETE"
    || !deleteMethod
    || (deleteMethod === "PASSWORD" && !deletePassword);

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
    if (!deleteMethod || normalizedDeleteConfirmation !== "DELETE") {
      return;
    }
    setDeleteError(null);

    try {
      const payload = {
        confirmation: normalizedDeleteConfirmation,
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
      setDeleteError(localizeSystemMessage(
        mutationError instanceof Error ? mutationError.message : "",
        "Unable to delete the account.",
      ));
    }
  }, [
    deleteAccountMutation,
    normalizedDeleteConfirmation,
    deleteMethod,
    deletePassword,
    queryClient,
    router,
  ]);

  return (
    <Card style={{ ...styles.card, ...styles.dangerCard }}>
      <Text variant="caption">
        {translate("Deleting your account permanently removes your profile and financial data. This action cannot be undone.")}
      </Text>

      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title={translate("Retry")}
            variant="ghost"
            tone="secondary"
            onPress={() => void refresh()}
          />
        </>
      ) : null}

      {!showDeleteForm ? (
        <Button
          title={translate("Delete MoneyDrive account")}
          variant="outline"
          tone="danger"
          disabled={disabled || !profileResponse}
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
              <Button
                title={translate("Google")}
                variant={deleteMethod === "GOOGLE" ? "primary" : "outline"}
                tone={deleteMethod === "GOOGLE" ? "danger" : "secondary"}
                size="sm"
                accessibilityState={{ selected: deleteMethod === "GOOGLE" }}
                onPress={() => setDeleteMethod("GOOGLE")}
              />
            ) : null}
            {Platform.OS === "ios" ? (
              <Button
                title={translate("Apple")}
                variant={deleteMethod === "APPLE" ? "primary" : "outline"}
                tone={deleteMethod === "APPLE" ? "danger" : "secondary"}
                size="sm"
                accessibilityState={{ selected: deleteMethod === "APPLE" }}
                onPress={() => setDeleteMethod("APPLE")}
              />
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

          {deleteMethod === "APPLE" ? (
            <View
              accessibilityState={{ disabled: isDeleteActionDisabled }}
              pointerEvents={isDeleteActionDisabled ? "none" : "auto"}
              style={isDeleteActionDisabled ? styles.disabledAppleButton : null}
            >
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={10}
                style={styles.appleDeleteButton}
                onPress={() => void handleDeleteAccount()}
              />
            </View>
          ) : (
            <Button
              title={deleteActionTitle}
              tone="danger"
              disabled={isDeleteActionDisabled}
              onPress={() => void handleDeleteAccount()}
            />
          )}
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
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
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
  appleDeleteButton: {
    width: "100%",
    height: 50,
  },
  disabledAppleButton: {
    opacity: 0.5,
  },
});
