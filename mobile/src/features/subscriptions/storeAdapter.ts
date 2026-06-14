import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction,
  getStorefront,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
} from "react-native-iap";

import type { StoreProduct, StorePurchasePayload } from "./types";
import { StoreAccountUnavailableError, StorePurchaseCancelledError } from "./types";

let connectionPromise: Promise<boolean> | null = null;

const ensureConnection = async () => {
  if (!connectionPromise) {
    connectionPromise = initConnection().then(Boolean);
  }
  await connectionPromise;
};

const toPlatform = () => {
  if (Platform.OS === "ios") {
    return "IOS" as const;
  }
  if (Platform.OS === "android") {
    return "ANDROID" as const;
  }
  throw new Error("Store purchases are available only on iOS and Android.");
};

const maybeString = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

const toStoreProduct = (product: ProductOrSubscription): StoreProduct => ({
  id: product.id,
  title: product.displayName ?? product.title,
  description: product.description,
  displayPrice: product.displayPrice,
  currency: product.currency ?? null,
  raw: product,
});

export const toStorePurchasePayload = (purchase: Purchase): StorePurchasePayload => {
  const platform = toPlatform();
  const raw = purchase as unknown as Record<string, unknown>;

  if (platform === "IOS") {
    return {
      platform,
      externalProductId: purchase.productId,
      transactionId: maybeString(raw.transactionId) ?? purchase.id,
      originalTransactionId: maybeString(raw.originalTransactionIdentifierIOS) ?? maybeString(raw.transactionId) ?? purchase.id,
      signedTransactionInfo: maybeString(purchase.purchaseToken) ?? maybeString(raw.jwsRepresentationIOS),
      raw: purchase,
    };
  }

  return {
    platform,
    externalProductId: purchase.productId,
    purchaseToken: maybeString(purchase.purchaseToken),
    orderId: maybeString(raw.transactionId) ?? purchase.id,
    packageName: maybeString(raw.packageNameAndroid) ?? "com.anonymous.mobile",
    raw: purchase,
  };
};

const isUserCancelled = (error: PurchaseError | Error | unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return ["E_USER_CANCELLED", "USER_CANCELLED", "USER_CANCELED", "E_CANCELLED"].includes(code);
};

const collectErrorParts = (
  value: unknown,
  parts: string[],
  seen: Set<object>,
  depth = 0,
) => {
  if (depth > 4 || value === null || value === undefined) {
    return;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    parts.push(String(value));
    return;
  }

  if (value instanceof Error) {
    parts.push(value.name, value.message);
  }

  if (typeof value !== "object") {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      continue;
    }

    parts.push(key);
    collectErrorParts((value as Record<string, unknown>)[key], parts, seen, depth + 1);
  }
};

const errorText = (error: unknown): string => {
  const parts: string[] = [];
  collectErrorParts(error, parts, new Set());
  return parts.join(" ");
};

const isStoreAccountUnavailable = (error: unknown) => {
  const text = errorText(error).toLowerCase();
  return (
    text.includes("No active account") ||
    text.includes("no active account") ||
    (text.includes("asderror") && text.includes("509")) ||
    (text.includes("code") && text.includes("509"))
  );
};

const normalizeStoreError = (error: unknown) => {
  if (isUserCancelled(error)) {
    return new StorePurchaseCancelledError();
  }
  if (isStoreAccountUnavailable(error)) {
    return new StoreAccountUnavailableError();
  }
  return error;
};

const firstPurchase = (result: Purchase | Purchase[] | null | undefined) =>
  Array.isArray(result) ? result[0] : result;

export const loadStoreProducts = async (productIds: string[]) => {
  if (!productIds.length) {
    return [];
  }

  await ensureConnection();
  let products = await fetchProducts({
    skus: productIds,
    type: "subs",
  });

  if (Platform.OS === "ios" && !products?.length) {
    products = await fetchProducts({
      skus: productIds,
      type: "all",
    });
  }

  return (products ?? []).map(toStoreProduct);
};

export const getStorefrontCode = async () => {
  await ensureConnection();
  try {
    return await getStorefront();
  } catch {
    return "";
  }
};

export const purchase = async (productId: string): Promise<StorePurchasePayload> => {
  await ensureConnection();

  return new Promise((resolve, reject) => {
    let settled = false;
    let updatedSubscription: { remove: () => void } = { remove: () => undefined };
    let errorSubscription: { remove: () => void } = { remove: () => undefined };
    const cleanup = () => {
      updatedSubscription.remove();
      errorSubscription.remove();
    };
    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    updatedSubscription = purchaseUpdatedListener((updatedPurchase) => {
      if (updatedPurchase.productId !== productId) {
        return;
      }
      settle(() => resolve(toStorePurchasePayload(updatedPurchase)));
    });

    errorSubscription = purchaseErrorListener((error) => {
      settle(() => reject(normalizeStoreError(error)));
    });

    requestPurchase({
      request: {
        apple: {
          sku: productId,
          quantity: 1,
        },
        google: {
          skus: [productId],
        },
      },
      type: "subs",
    })
      .then((result) => {
        const directPurchase = firstPurchase(result);
        if (directPurchase) {
          settle(() => resolve(toStorePurchasePayload(directPurchase)));
        }
      })
      .catch((error) => {
        settle(() => reject(normalizeStoreError(error)));
      });
  });
};

export const restore = async () => {
  await ensureConnection();
  try {
    const purchases = await getAvailablePurchases(
      Platform.OS === "ios" ? { onlyIncludeActiveItemsIOS: true } : undefined,
    );
    return (purchases ?? []).map(toStorePurchasePayload);
  } catch (error) {
    throw normalizeStoreError(error);
  }
};

export const finish = async (payload: StorePurchasePayload) => {
  await finishTransaction({
    purchase: payload.raw as Purchase,
    isConsumable: false,
  });
};
