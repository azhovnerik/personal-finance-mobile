import { useMutation, useQueryClient } from "@tanstack/react-query";

import { finish, purchase, releasePurchase } from "./storeAdapter";
import type { StoreProduct } from "./types";
import { SubscriptionsApiError } from "./types";
import { trackSubscriptionEvent } from "./analytics";
import { useSubscriptionAuth } from "./useSubscriptionAuth";
import { SUBSCRIPTION_PRODUCTS_QUERY_KEY } from "./useSubscriptionProducts";
import { SUBSCRIPTION_STATUS_QUERY_KEY } from "./useSubscriptionStatus";
import { validateStorePurchase } from "./validateStorePurchase";

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
      const planChangeScheduled = storePayload.externalProductId !== input.externalProductId
        && storePayload.pendingProductId === input.externalProductId;

      trackSubscriptionEvent("subscription_purchase_store_success", {
        platform: storePayload.platform,
        externalProductId: storePayload.externalProductId,
        productCode: input.productCode,
      });

      try {
        const response = await withSubscriptionAuth(() => validateStorePurchase(storePayload));
        if (response.status === "EXPIRED") {
          throw new SubscriptionsApiError("Период этой покупки уже истек.", {
            code: "RECEIPT_EXPIRED",
          });
        }
        await finish(storePayload);

        trackSubscriptionEvent("subscription_purchase_validate_success", {
          platform: storePayload.platform,
          externalProductId: storePayload.externalProductId,
          productCode: response.productCode,
          status: response.status,
        });

        return { ...response, planChangeScheduled };
      } catch (error) {
        if (
          error instanceof SubscriptionsApiError
          && (error.code === "RECEIPT_EXPIRED" || error.code === "PURCHASE_ALREADY_LINKED")
        ) {
          try {
            await finish(storePayload);
          } catch (finishError) {
            console.warn("Unable to finish rejected store purchase.", finishError);
          }
        }
        releasePurchase(storePayload);
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
    retry: false,
  });
};
