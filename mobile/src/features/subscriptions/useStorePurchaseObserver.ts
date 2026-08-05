import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

import { getToken } from "../../storage/auth";
import { SubscriptionsApiError } from "./types";
import { finish, observeStorePurchases } from "./storeAdapter";
import { useSubscriptionAuth } from "./useSubscriptionAuth";
import { validateStorePurchase } from "./validateStorePurchase";
import { SUBSCRIPTION_PRODUCTS_QUERY_KEY } from "./useSubscriptionProducts";
import { SUBSCRIPTION_STATUS_QUERY_KEY } from "./useSubscriptionStatus";

class StorePurchaseAwaitingAuthenticationError extends Error {
  constructor() {
    super("Store purchase is waiting for MoneyDrive authentication.");
    this.name = "StorePurchaseAwaitingAuthenticationError";
  }
}

export const useStorePurchaseObserver = () => {
  const queryClient = useQueryClient();
  const { withSubscriptionAuth } = useSubscriptionAuth();

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return;
    }

    return observeStorePurchases(
      async (purchase) => {
        if (!(await getToken())) {
          throw new StorePurchaseAwaitingAuthenticationError();
        }

        try {
          await withSubscriptionAuth(() => validateStorePurchase(purchase));
        } catch (error) {
          if (
            error instanceof SubscriptionsApiError
            && (error.code === "PURCHASE_ALREADY_LINKED" || error.code === "RECEIPT_EXPIRED")
          ) {
            await finish(purchase);
            return;
          }
          throw error;
        }

        await finish(purchase);
        await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_STATUS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_PRODUCTS_QUERY_KEY });
      },
      (error) => {
        if (error instanceof StorePurchaseAwaitingAuthenticationError) {
          return;
        }
        console.warn("Unable to process pending store purchase.", error);
      },
    );
  }, [queryClient, withSubscriptionAuth]);
};
