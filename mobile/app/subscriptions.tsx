import { useEffect, useRef } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { clearAuthSession } from "../src/features/auth/api";
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
    return "На устройстве не подключен App Store Sandbox account. Добавьте sandbox tester в Settings > App Store > Sandbox Account.";
  }

  if (error instanceof StoreDuplicatePurchaseError) {
    return "Эта покупка уже была получена. Нажмите Restore purchases, чтобы восстановить подписку.";
  }

  if (error instanceof StoreProductMismatchError) {
    return `App Store сохранил ${error.actualProductId} вместо ${error.requestedProductId}. Проверьте текущий план в настройках подписок App Store.`;
  }

  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (rawMessage.includes("No active account") || rawMessage.includes("ASDErrorDomain Code=509")) {
    return "На устройстве не подключен App Store Sandbox account. Добавьте sandbox tester в Settings > App Store > Sandbox Account.";
  }

  if (error instanceof SubscriptionsApiError) {
    switch (error.code) {
      case "PRODUCT_MAPPING_NOT_FOUND":
        return "Продукт временно недоступен.";
      case "RECEIPT_INVALID":
      case "PURCHASE_TOKEN_INVALID":
        return "Покупка не подтверждена. Попробуйте еще раз.";
      case "RECEIPT_EXPIRED":
        return "Период этой покупки уже истек. Выберите актуальную подписку.";
      case "PURCHASE_ALREADY_LINKED":
        return "Эта покупка уже привязана к другому аккаунту MoneyDrive. Войдите в связанный аккаунт или используйте другой App Store Sandbox account.";
      default:
        return error.message;
    }
  }

  return rawMessage || "Не удалось выполнить действие.";
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const sourceTitle = (source: SubscriptionSourceDto | null) => {
  if (!source) {
    return "No active store source";
  }
  const sourceStatus = source.status === "ACTIVE" && !source.autoRenew
    ? "Auto-renew off"
    : statusLabels[source.status] ?? source.status;
  return `${source.provider} · ${sourceStatus}`;
};

const isWebManageAction = (source: SubscriptionSourceDto | null) =>
  source?.manageAction === "WEB";

const isLiqPaySource = (source: SubscriptionSourceDto | null) =>
  source?.provider === "LIQPAY" || source?.manageAction === "LIQPAY";

const openManageAction = async (source: SubscriptionSourceDto | null) => {
  if (!source || source.manageAction === "NONE") {
    Alert.alert("Subscription management", "No external management action is available.");
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
    Alert.alert("Subscription management", "No external management action is available.");
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
    "Subscription management",
    source.manageAction === "APP_STORE"
      ? "Open App Store account settings and choose Subscriptions."
      : "Open the subscription provider account settings to manage this plan.",
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
    validateSubscription.mutate(
      {
        externalProductId: product.externalProductId,
        productCode: product.productCode,
        storeProduct: product.storeProduct,
      },
      {
        onSuccess: (response) => {
          Alert.alert(
            "Subscription",
            response.premiumActive && response.status === "ACTIVE"
              ? response.planChangeScheduled
                ? "Premium is active. The plan change will take effect on the next App Store renewal."
                : "Premium is active."
              : "The verified purchase is not active.",
          );
        },
        onError: (error) => {
          const message = userErrorMessage(error);
          if (message) {
            Alert.alert("Subscription", message);
          }
        },
      },
    );
  };

  const handleRestore = () => {
    restoreSubscriptions.mutate(undefined, {
      onSuccess: (response) => {
        Alert.alert(
          "Restore purchases",
          response.restoredCount > 0 ? `Restored purchases: ${response.restoredCount}.` : "No active purchases found.",
        );
      },
      onError: (error) => {
        const message = userErrorMessage(error);
        if (message) {
          Alert.alert("Restore purchases", message);
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
      await clearAuthSession();
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
            <Text variant="title">Subscription</Text>
            <Text variant="caption">Manage premium access</Text>
          </View>
          {!status.isLoadingStatus && !premiumActive ? (
            <Button
              title="Logout"
              variant="outline"
              tone="danger"
              size="sm"
              disabled={isBusy}
              onPress={() => void handleLogout()}
            />
          ) : (
            <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={handleBack} />
          )}
        </View>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="subtitle">Current plan</Text>
            <View style={[styles.badge, premiumActive ? styles.badgeActive : styles.badgeMuted]}>
              <Text style={[styles.badgeText, premiumActive ? styles.badgeTextActive : styles.badgeTextMuted]}>
                {premiumActive ? "Premium" : "Free"}
              </Text>
            </View>
          </View>

          {status.isLoadingStatus ? (
            <Text variant="caption">Loading subscription status...</Text>
          ) : (
            <>
              <Text style={styles.planName}>
                {renewalCanceled
                  ? "Renewal canceled"
                  : statusLabels[status.statusResponse?.status ?? ""] ?? "Inactive"}
              </Text>
              <Text variant="caption">Access until: {formatDate(status.statusResponse?.effectiveTo)}</Text>
              <Text variant="caption">{sourceTitle(activeSource)}</Text>
              {renewalCanceled ? (
                <Text variant="caption">
                  Auto-renewal is off. Premium access remains available through the date above.
                </Text>
              ) : null}
              {status.statusResponse?.status === "PAST_DUE" ? (
                <Text style={styles.warningText}>
                  The payment is overdue. Premium access remains available through the grace-period date above.
                </Text>
              ) : null}
              {status.statusResponse?.status === "EXPIRED" ? (
                <Text variant="caption">
                  Your account and data are safe. Buy a new subscription to restore business features.
                </Text>
              ) : null}
              {status.statusResponse?.status === "EXPIRED" && isLiqPaySource(activeSource) ? (
                <Text variant="caption">
                  To renew with LiqPay, open the web version and complete a new checkout.
                </Text>
              ) : null}
              {isTrial ? (
                <Text variant="caption">Choose an App Store or Google Play product below.</Text>
              ) : premiumActive && isLiqPaySource(activeSource) ? (
                <Text variant="caption">
                  LiqPay subscription can be cancelled only in the web version of the app.
                </Text>
              ) : premiumActive ? (
                <View style={styles.actionRow}>
                  <Button
                    title={isWebManageAction(activeSource) ? "Manage on web" : "Manage subscription"}
                    onPress={() => openManageAction(activeSource)}
                  />
                </View>
              ) : (
                <Text variant="caption">Choose an App Store or Google Play product below.</Text>
              )}
            </>
          )}

          {status.error ? <Text style={styles.errorText}>{status.error}</Text> : null}
        </Card>

        {showProducts ? (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="subtitle">Available plans</Text>
              <Text variant="caption">
                {products.platform ? `Products for ${products.platform}` : "Store purchases require iOS or Android"}
              </Text>
            </View>

            {products.isLoadingProducts ? <Text variant="caption">Loading store products...</Text> : null}
            {products.error ? <Text style={styles.errorText}>{products.error}</Text> : null}
            {showStoreProductsUnavailable ? (
              <Text style={styles.warningText}>
                Store products are not available yet. Please check App Store or Google Play product setup.
              </Text>
            ) : null}
            {showSomeStoreProductsUnavailable ? (
              <Text style={styles.warningText}>
                Some store products are not available yet: {products.unavailableProductIds.join(", ")}.
              </Text>
            ) : null}

            <View style={styles.list}>
              {products.products.map((product) => (
                <Card key={product.productCode} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.productTitle}>
                      {periodLabels[product.billingPeriod] ?? product.title}
                    </Text>
                    <Text style={styles.planPrice}>{product.displayPrice}</Text>
                  </View>
                  <Text variant="caption">{product.description}</Text>
                  <Text variant="caption">Product: {product.externalProductId}</Text>
                  <Button
                    title={validateSubscription.isPending ? "Processing..." : "Subscribe"}
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
              title={restoreSubscriptions.isPending ? "Restoring..." : "Restore purchases"}
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
