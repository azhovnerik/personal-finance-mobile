import { getCurrentIntlLocale, localizeSystemMessage, translate } from "../src/localization";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { logout } from "../src/features/auth/logout";
import { useRestoreSubscriptions } from "../src/features/subscriptions/useRestoreSubscriptions";
import {
  useSubscriptionProducts,
  type SubscriptionProductWithStore,
} from "../src/features/subscriptions/useSubscriptionProducts";
import { useSubscriptionStatus } from "../src/features/subscriptions/useSubscriptionStatus";
import { useValidateSubscription } from "../src/features/subscriptions/useValidateSubscription";
import { trackSubscriptionEvent } from "../src/features/subscriptions/analytics";
import {
  StoreAccountUnavailableError,
  StoreDuplicatePurchaseError,
  StoreProductMismatchError,
  StorePurchaseCancelledError,
  SubscriptionsApiError,
  type SubscriptionSourceDto,
} from "../src/features/subscriptions/types";
import { Button, Card, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const statusLabels: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  PAST_DUE: "Payment issue",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
};

const periodLabels: Record<string, string> = {
  YEARLY: "Yearly",
  MONTHLY: "Monthly",
};

const userErrorMessage = (error: unknown) => {
  if (error instanceof StorePurchaseCancelledError) {
    return null;
  }

  if (error instanceof StoreAccountUnavailableError) {
    return translate("No App Store Sandbox account is connected on this device. Add a sandbox tester in Settings > App Store > Sandbox Account.");
  }

  if (error instanceof StoreDuplicatePurchaseError) {
    return translate("This purchase has already been received. Tap Restore purchases to restore the subscription.");
  }

  if (error instanceof StoreProductMismatchError) {
    return translate(
      "App Store saved {{actualProductId}} instead of {{requestedProductId}}. Check the current plan in App Store subscription settings.",
      { actualProductId: error.actualProductId, requestedProductId: error.requestedProductId },
    );
  }

  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (rawMessage.includes("No active account") || rawMessage.includes("ASDErrorDomain Code=509")) {
    return translate("No App Store Sandbox account is connected on this device. Add a sandbox tester in Settings > App Store > Sandbox Account.");
  }

  if (error instanceof SubscriptionsApiError) {
    switch (error.code) {
      case "PRODUCT_MAPPING_NOT_FOUND":
        return translate("Product temporarily unavailable.");
      case "RECEIPT_INVALID":
      case "PURCHASE_TOKEN_INVALID":
        return translate("Purchase not confirmed. Try again.");
      case "RECEIPT_EXPIRED":
        return translate("This purchase period has expired. Select a current subscription.");
      case "PURCHASE_ALREADY_LINKED":
        return translate("This purchase is linked to another MoneyDrive account. Sign in to the linked account or use a different App Store Sandbox account.");
      default:
        return localizeSystemMessage(error.message, "Unable to complete the action.");
    }
  }

  return localizeSystemMessage(rawMessage, "Unable to complete the action.");
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return translate("Not set");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return translate("Not set");
  }

  return new Intl.DateTimeFormat(getCurrentIntlLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const sourceTitle = (source: SubscriptionSourceDto | null) => {
  if (!source) {
    return translate("No active store source");
  }
  const sourceStatus = source.status === "ACTIVE" && !source.autoRenew
    ? translate("Auto-renew off")
    : translate(statusLabels[source.status] ?? "Inactive");
  return `${source.provider} · ${sourceStatus}`;
};

const isWebManageAction = (source: SubscriptionSourceDto | null) =>
  source?.manageAction === "WEB";

const isLiqPaySource = (source: SubscriptionSourceDto | null) =>
  source?.provider === "LIQPAY" || source?.manageAction === "LIQPAY";

const openManageAction = async (source: SubscriptionSourceDto | null) => {
  if (!source || source.manageAction === "NONE") {
    Alert.alert(
      translate("Subscription management"),
      translate("No external management action is available."),
    );
    return;
  }

  const urls =
    source.manageAction === "APP_STORE"
      ? ["itms-apps://apps.apple.com/account/subscriptions", "https://apps.apple.com/account/subscriptions"]
      : source.manageAction === "GOOGLE_PLAY"
        ? ["https://play.google.com/store/account/subscriptions"]
        : isWebManageAction(source)
          ? ["https://app.moneydrive.me/subscriptions"]
          : [];

  if (urls.length === 0) {
    Alert.alert(
      translate("Subscription management"),
      translate("No external management action is available."),
    );
    return;
  }

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next provider URL below. Simulators often cannot open store apps.
    }
  }

  Alert.alert(
    translate("Subscription management"),
    source.manageAction === "APP_STORE"
      ? translate("Open App Store account settings and choose Subscriptions.")
      : translate("Open the subscription provider account settings to manage this plan."),
  );
};

export default function SubscriptionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useSubscriptionStatus();
  const premiumActive = status.statusResponse?.premiumActive ?? false;
  const isTrial = status.statusResponse?.status === "TRIAL";
  const renewalCanceled = status.statusResponse?.status === "ACTIVE"
    && status.statusResponse.autoRenew === false;
  const canPurchaseSubscription = !premiumActive || isTrial;
  const products = useSubscriptionProducts(!status.isLoadingStatus && canPurchaseSubscription);
  const validateSubscription = useValidateSubscription();
  const restoreSubscriptions = useRestoreSubscriptions();
  const trackedScreenOpen = useRef(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const activeSource = status.statusResponse?.sources?.[0] ?? null;
  const isBusy = validateSubscription.isPending || restoreSubscriptions.isPending;
  const showProducts = !status.isLoadingStatus && canPurchaseSubscription;
  const showStoreProductsUnavailable =
    showProducts &&
    !products.isLoadingProducts &&
    !products.error &&
    products.backendProductCount > 0 &&
    products.products.length === 0;
  const showSomeStoreProductsUnavailable =
    showProducts &&
    !products.isLoadingProducts &&
    !products.error &&
    products.products.length > 0 &&
    products.unavailableProductIds.length > 0;

  useEffect(() => {
    if (trackedScreenOpen.current) {
      return;
    }
    trackedScreenOpen.current = true;
    trackSubscriptionEvent("subscription_screen_opened", {
      platform: products.platform,
      status: status.statusResponse?.status ?? null,
    });
  }, [products.platform, status.statusResponse?.status]);

  const handlePurchase = (product: SubscriptionProductWithStore) => {
    setPendingProductId(product.externalProductId);
    validateSubscription.mutate(
      {
        externalProductId: product.externalProductId,
        productCode: product.productCode,
        storeProduct: product.storeProduct,
      },
      {
        onSuccess: (response) => {
          Alert.alert(
            translate("Subscription"),
            response.premiumActive && response.status === "ACTIVE"
              ? response.planChangeScheduled
                ? translate("Premium is active. The plan change will take effect on the next App Store renewal.")
                : translate("Premium is active.")
              : translate("The verified purchase is not active."),
          );
        },
        onError: (error) => {
          const message = userErrorMessage(error);
          if (message) {
            Alert.alert(translate("Subscription"), message);
          }
        },
        onSettled: () => {
          setPendingProductId(null);
        },
      },
    );
  };

  const handleRestore = () => {
    restoreSubscriptions.mutate(undefined, {
      onSuccess: (response) => {
        Alert.alert(
          translate("Restore purchases"),
          response.restoredCount > 0
            ? translate("Restored purchases: {{count}}.", { count: response.restoredCount })
            : translate("No active purchases found."),
        );
      },
      onError: (error) => {
        const message = userErrorMessage(error);
        if (message) {
          Alert.alert(translate("Restore purchases"), message);
        }
      },
    });
  };

  const handleRefresh = async () => {
    await status.refresh();
    if (canPurchaseSubscription) {
      await products.refetchProducts();
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      queryClient.clear();
      router.replace("/login");
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status.isRefreshingStatus && !status.isLoadingStatus}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="title">{translate("Subscription")}</Text>
            <Text variant="caption">{translate("Manage premium access")}</Text>
          </View>
          {!status.isLoadingStatus && !premiumActive ? (
            <Button
              title={translate("Logout")}
              variant="outline"
              tone="danger"
              size="sm"
              disabled={isBusy}
              onPress={() => void handleLogout()}
            />
          ) : (
            <Button title={translate("Back")} variant="outline" tone="secondary" size="sm" onPress={handleBack} />
          )}
        </View>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="subtitle">{translate("Current plan")}</Text>
            <View style={[styles.badge, premiumActive ? styles.badgeActive : styles.badgeMuted]}>
              <Text style={[styles.badgeText, premiumActive ? styles.badgeTextActive : styles.badgeTextMuted]}>
                {premiumActive ? translate("Premium") : translate("Free")}
              </Text>
            </View>
          </View>

          {status.isLoadingStatus ? (
            <Text variant="caption">{translate("Loading subscription status...")}</Text>
          ) : (
            <>
              <Text style={styles.planName}>
                {renewalCanceled
                  ? translate("Renewal canceled")
                  : translate(statusLabels[status.statusResponse?.status ?? ""] ?? "Inactive")}
              </Text>
              <Text variant="caption">
                {translate("Access until: {{date}}", { date: formatDate(status.statusResponse?.effectiveTo) })}
              </Text>
              {!isTrial ? <Text variant="caption">{sourceTitle(activeSource)}</Text> : null}
              {renewalCanceled ? (
                <Text variant="caption">
                  {translate("Auto-renewal is off. Premium access remains available through the date above.")}</Text>
              ) : null}
              {status.statusResponse?.status === "PAST_DUE" ? (
                <Text style={styles.warningText}>
                  {translate("The payment is overdue. Premium access remains available through the grace-period date above.")}</Text>
              ) : null}
              {status.statusResponse?.status === "EXPIRED" ? (
                <Text variant="caption">
                  {translate("Your account and data are safe. Buy a new subscription to restore business features.")}</Text>
              ) : null}
              {status.statusResponse?.status === "EXPIRED" && isLiqPaySource(activeSource) ? (
                <Text variant="caption">
                  {translate("To renew with LiqPay, open the web version and complete a new checkout.")}</Text>
              ) : null}
              {isTrial ? (
                <Text variant="caption">{translate("Choose an App Store or Google Play product below.")}</Text>
              ) : premiumActive && isLiqPaySource(activeSource) ? (
                <Text variant="caption">
                  {translate("LiqPay subscription can be cancelled only in the web version of the app.")}</Text>
              ) : premiumActive ? (
                <View style={styles.actionRow}>
                  <Button
                    title={isWebManageAction(activeSource) ? translate("Manage on web") : translate("Manage subscription")}
                    onPress={() => openManageAction(activeSource)}
                  />
                </View>
              ) : (
                <Text variant="caption">{translate("Choose an App Store or Google Play product below.")}</Text>
              )}
            </>
          )}

          {status.error ? <Text style={styles.errorText}>{status.error}</Text> : null}
        </Card>

        {showProducts ? (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="subtitle">{translate("Available plans")}</Text>
              <Text variant="caption">
                {products.platform
                  ? translate("Products for {{platform}}", { platform: products.platform })
                  : translate("Store purchases require iOS or Android")}
              </Text>
            </View>

            {products.isLoadingProducts ? <Text variant="caption">{translate("Loading store products...")}</Text> : null}
            {products.error ? <Text style={styles.errorText}>{products.error}</Text> : null}
            {showStoreProductsUnavailable ? (
              <Text style={styles.warningText}>
                {translate("Store products are not available yet. Please check App Store or Google Play product setup.")}</Text>
            ) : null}
            {showSomeStoreProductsUnavailable ? (
              <Text style={styles.warningText}>
                {translate("Some store products are not available yet: {{products}}.", {
                  products: products.unavailableProductIds.join(", "),
                })}
              </Text>
            ) : null}

            <View style={styles.list}>
              {products.products.map((product) => (
                <Card key={product.productCode} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.productTitle}>
                      {localizeSystemMessage(
                        periodLabels[product.billingPeriod] ?? product.title,
                        "Subscription plan",
                      )}
                    </Text>
                    <Text style={styles.planPrice}>{product.displayPrice}</Text>
                  </View>
                  <Text variant="caption">
                    {localizeSystemMessage(product.description, "Subscription plan")}
                  </Text>
                  <Text variant="caption">
                    {translate("Product: {{product}}", { product: product.externalProductId })}
                  </Text>
                  <Button
                    title={pendingProductId === product.externalProductId ? translate("Processing...") : translate("Subscribe")}
                    variant="outline"
                    tone="primary"
                    size="sm"
                    disabled={isBusy}
                    onPress={() => handlePurchase(product)}
                  />
                </Card>
              ))}
            </View>

            <Button
              title={restoreSubscriptions.isPending ? translate("Restoring...") : translate("Restore purchases")}
              variant="ghost"
              tone="secondary"
              disabled={isBusy || Platform.OS === "web"}
              onPress={handleRestore}
            />
          </>
        ) : null}
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
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  card: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeActive: {
    backgroundColor: "rgba(44, 182, 125, 0.12)",
  },
  badgeMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: colors.success,
  },
  badgeTextMuted: {
    color: colors.textSecondary,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  productTitle: {
    flex: 1,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  planPrice: {
    fontWeight: "700",
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
  errorText: {
    color: colors.danger,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
  },
});
