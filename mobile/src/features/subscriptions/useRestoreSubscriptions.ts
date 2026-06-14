import { useMutation, useQueryClient } from "@tanstack/react-query";

import { restoreSubscriptions } from "./api";
import { restore } from "./storeAdapter";
import type { RestorePurchaseRequest, StorePurchasePayload } from "./types";
import { trackSubscriptionEvent } from "./analytics";
import { useSubscriptionAuth } from "./useSubscriptionAuth";
import { SUBSCRIPTION_PRODUCTS_QUERY_KEY } from "./useSubscriptionProducts";
import { SUBSCRIPTION_STATUS_QUERY_KEY } from "./useSubscriptionStatus";

const toRestorePurchaseRequest = (purchase: StorePurchasePayload): RestorePurchaseRequest => {
  if (purchase.platform === "IOS") {
    return {
      externalProductId: purchase.externalProductId,
      transactionId: purchase.transactionId ?? undefined,
      originalTransactionId: purchase.originalTransactionId ?? undefined,
      signedTransactionInfo: purchase.signedTransactionInfo ?? undefined,
    };
  }

  return {
    externalProductId: purchase.externalProductId,
    purchaseToken: purchase.purchaseToken ?? undefined,
    orderId: purchase.orderId ?? undefined,
    packageName: purchase.packageName ?? undefined,
  };
};

export const useRestoreSubscriptions = () => {
  const queryClient = useQueryClient();
  const { withSubscriptionAuth } = useSubscriptionAuth();

  return useMutation({
    mutationFn: async () => {
      trackSubscriptionEvent("subscription_restore_started");

      const purchases = await restore();
      const platform = purchases[0]?.platform;

      if (!platform) {
        trackSubscriptionEvent("subscription_restore_success", {
          restoredCount: 0,
          status: "EXPIRED",
        });
        return {
          processedCount: 0,
          restoredCount: 0,
          premiumActive: false,
          status: "EXPIRED" as const,
          effectiveTo: null,
        };
      }

      const response = await withSubscriptionAuth(() =>
        restoreSubscriptions({
          platform,
          purchases: purchases.map(toRestorePurchaseRequest),
        }),
      );

      trackSubscriptionEvent("subscription_restore_success", {
        platform,
        status: response.status,
        restoredCount: response.restoredCount,
      });

      return response;
    },
    onError: (error) => {
      trackSubscriptionEvent("subscription_restore_failed", {
        errorCode: error instanceof Error ? error.name : "UNKNOWN",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_STATUS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_PRODUCTS_QUERY_KEY });
    },
  });
};
