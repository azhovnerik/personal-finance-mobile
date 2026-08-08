import { translate } from "../../localization";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { getSubscriptionProducts } from "./api";
import { getStorefrontCode, loadStoreProducts } from "./storeAdapter";
import type { StoreProduct, SubscriptionPlatform, SubscriptionProductDto } from "./types";
import { trackSubscriptionEvent } from "./analytics";
import { useSubscriptionAuth } from "./useSubscriptionAuth";

export const SUBSCRIPTION_PRODUCTS_QUERY_KEY = ["subscription", "products"] as const;

export type SubscriptionProductWithStore = SubscriptionProductDto & {
  storeProduct: StoreProduct;
  displayPrice: string;
};

const getCurrentPlatform = (): Extract<SubscriptionPlatform, "IOS" | "ANDROID"> | null => {
  if (Platform.OS === "ios") {
    return "IOS";
  }
  if (Platform.OS === "android") {
    return "ANDROID";
  }
  return null;
};

const sortProducts = (products: SubscriptionProductDto[]) =>
  [...products].sort((left, right) => {
    const leftRank = left.billingPeriod === "YEARLY" ? 0 : left.billingPeriod === "MONTHLY" ? 1 : 2;
    const rightRank = right.billingPeriod === "YEARLY" ? 0 : right.billingPeriod === "MONTHLY" ? 1 : 2;
    return leftRank - rightRank;
  });

export const useSubscriptionProducts = (enabled: boolean) => {
  const platform = useMemo(() => getCurrentPlatform(), []);
  const { withSubscriptionAuth } = useSubscriptionAuth();

  const query = useQuery({
    queryKey: [...SUBSCRIPTION_PRODUCTS_QUERY_KEY, platform],
    enabled: enabled && platform !== null,
    queryFn: async () => {
      if (!platform) {
        throw new Error(translate("Store products are available only on iOS and Android."));
      }

      const response = await withSubscriptionAuth(() => getSubscriptionProducts(platform));
      const products = sortProducts(response.products.filter((product) => product.active));
      const requestedProductIds = products.map((product) => product.externalProductId);
      const [storeProducts, storefront] = await Promise.all([
        loadStoreProducts(requestedProductIds),
        platform === "IOS" ? getStorefrontCode() : Promise.resolve(""),
      ]);
      const storeById = new Map(storeProducts.map((product) => [product.id, product]));
      const storeProductIds = storeProducts.map((product) => product.id);
      const missingProductIds = requestedProductIds.filter((productId) => !storeById.has(productId));

      trackSubscriptionEvent("subscription_products_loaded", {
        platform,
        status: "loaded",
        backendProductCount: products.length,
      });
      trackSubscriptionEvent("subscription_store_products_loaded", {
        platform,
        requestedProductIds: requestedProductIds.join(","),
        storeProductIds: storeProductIds.join(","),
        storeProductCount: storeProducts.length,
        storefront,
      });
      if (missingProductIds.length) {
        trackSubscriptionEvent("subscription_store_products_missing", {
          platform,
          missingProductIds: missingProductIds.join(","),
        });
      }

      const availableProducts = products.flatMap<SubscriptionProductWithStore>((product) => {
        const storeProduct = storeById.get(product.externalProductId) ?? null;
        if (!storeProduct) {
          return [];
        }

        return {
          ...product,
          storeProduct,
          displayPrice: storeProduct.displayPrice,
        };
      });

      return {
        products: availableProducts,
        unavailableProductIds: missingProductIds,
        backendProductCount: products.length,
      };
    },
    staleTime: 60 * 1000,
  });

  return {
    products: query.data?.products ?? [],
    unavailableProductIds: query.data?.unavailableProductIds ?? [],
    backendProductCount: query.data?.backendProductCount ?? 0,
    platform,
    isLoadingProducts: query.isLoading || query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? translate("Unable to load subscription products.")
          : null,
    refetchProducts: query.refetch,
  };
};
