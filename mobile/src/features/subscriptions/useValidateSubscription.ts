import { useMutation, useQueryClient } from "@tanstack/react-query";

import { validateAndroidSubscription, validateIosSubscription } from "./api";
import { finish, purchase } from "./storeAdapter";
import type { AndroidValidateRequest, IosValidateRequest, StoreProduct, StorePurchasePayload } from "./types";
import { StorePurchaseCancelledError, SubscriptionsApiError } from "./types";
import { trackSubscriptionEvent } from "./analytics";
import { useSubscriptionAuth } from "./useSubscriptionAuth";
import { SUBSCRIPTION_PRODUCTS_QUERY_KEY } from "./useSubscriptionProducts";
import { SUBSCRIPTION_STATUS_QUERY_KEY } from "./useSubscriptionStatus";

const assertString = (value: string | null | undefined, message: string) => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

const toIosValidateRequest = (payload: StorePurchasePayload): IosValidateRequest => ({
  externalProductId: payload.externalProductId,
  transactionId: assertString(payload.transactionId, "Store transaction is missing transactionId."),
  originalTransactionId: assertString(
    payload.originalTransactionId,
    "Store transaction is missing originalTransactionId.",
  ),
  signedTransactionInfo: assertString(payload.signedTransactionInfo, "Store transaction is missing signed payload."),
});

const toAndroidValidateRequest = (payload: StorePurchasePayload): AndroidValidateRequest => ({
  externalProductId: payload.externalProductId,
  purchaseToken: assertString(payload.purchaseToken, "Store transaction is missing purchaseToken."),
  orderId: assertString(payload.orderId, "Store transaction is missing orderId."),
  packageName: assertString(payload.packageName, "Store transaction is missing packageName."),
});

const validatePurchase = (payload: StorePurchasePayload) => {
  if (payload.platform === "IOS") {
    return validateIosSubscription(toIosValidateRequest(payload));
  }
  return validateAndroidSubscription(toAndroidValidateRequest(payload));
};

export const useValidateSubscription = () => {
  const queryClient = useQueryClient();
  const { withSubscriptionAuth } = useSubscriptionAuth();

  return useMutation({
    mutationFn: async (input: { externalProductId: string; productCode: string; storeProduct?: StoreProduct }) => {
      trackSubscriptionEvent("subscription_purchase_started", {
        externalProductId: input.externalProductId,
        productCode: input.productCode,
      });

      const storePayload = await purchase(input.externalProductId, input.storeProduct);

      trackSubscriptionEvent("subscription_purchase_store_success", {
        platform: storePayload.platform,
        externalProductId: storePayload.externalProductId,
        productCode: input.productCode,
      });

      try {
        const response = await withSubscriptionAuth(() => validatePurchase(storePayload));
        await finish(storePayload);

        trackSubscriptionEvent("subscription_purchase_validate_success", {
          platform: storePayload.platform,
          externalProductId: storePayload.externalProductId,
          productCode: response.productCode,
          status: response.status,
        });

        return response;
      } catch (error) {
        trackSubscriptionEvent("subscription_purchase_validate_failed", {
          platform: storePayload.platform,
          externalProductId: storePayload.externalProductId,
          productCode: input.productCode,
          errorCode: error instanceof SubscriptionsApiError ? error.code : "UNKNOWN",
        });
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_STATUS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_PRODUCTS_QUERY_KEY });
    },
    retry: (failureCount, error) => {
      if (error instanceof StorePurchaseCancelledError) {
        return false;
      }
      return failureCount < 1;
    },
  });
};
