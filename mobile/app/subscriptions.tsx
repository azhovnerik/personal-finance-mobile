import { useEffect, useRef } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

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
  StorePurchaseCancelledError,
  SubscriptionsApiError,
  type SubscriptionSourceDto,
} from "../src/features/subscriptions/types";
import { Button, Card, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const statusLabels: Record<string, string> = {
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
  return `${source.provider} · ${statusLabels[source.status] ?? source.status}`;
};

const isWebManageAction = (source: SubscriptionSourceDto | null) =>
  source?.manageAction === "WEB" || source?.manageAction === "LIQPAY";

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
  const status = useSubscriptionStatus();
  const premiumActive = status.statusResponse?.premiumActive ?? false;
  const products = useSubscriptionProducts(!status.isLoadingStatus && !premiumActive);
  const validateSubscription = useValidateSubscription();
  const restoreSubscriptions = useRestoreSubscriptions();
  const trackedScreenOpen = useRef(false);

  const activeSource = status.statusResponse?.sources?.[0] ?? null;
  const isBusy = validateSubscription.isPending || restoreSubscriptions.isPending;
  const showProducts = !status.isLoadingStatus && !premiumActive;
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
        onSuccess: () => {
          Alert.alert("Subscription", "Premium is active.");
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
    if (!premiumActive) {
      await products.refetchProducts();
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
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
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
              <Text style={styles.planName}>{statusLabels[status.statusResponse?.status ?? ""] ?? "Inactive"}</Text>
              <Text variant="caption">Access until: {formatDate(status.statusResponse?.effectiveTo)}</Text>
              <Text variant="caption">{sourceTitle(activeSource)}</Text>
              {premiumActive ? (
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
