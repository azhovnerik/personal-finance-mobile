import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import { Platform } from "react-native";

import { getToken } from "../../storage/auth";
import { SubscriptionsApiError } from "./types";
import { finish, observeStorePurchases } from "./storeAdapter";
import { useSubscriptionAuth } from "./useSubscriptionAuth";
import { validateStorePurchase } from "./validateStorePurchase";
import { SUBSCRIPTION_PRODUCTS_QUERY_KEY } from "./useSubscriptionProducts";
import { SUBSCRIPTION_STATUS_QUERY_KEY } from "./useSubscriptionStatus";

export const useStorePurchaseObserver = () => {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { withSubscriptionAuth } = useSubscriptionAuth();

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return;
    }

    let disposed = false;
    let stopObserving: (() => void) | undefined;

    void getToken()
      .then((token) => {
        if (disposed || !token) {
          return;
        }

        stopObserving = observeStorePurchases(
          async (purchase) => {
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
            console.warn("Unable to process pending store purchase.", error);
          },
        );
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("Unable to start store purchase observer.", error);
        }
      });

    return () => {
      disposed = true;
      stopObserving?.();
    };
  }, [pathname, queryClient, withSubscriptionAuth]);
};
