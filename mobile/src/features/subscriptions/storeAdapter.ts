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
  type AndroidSubscriptionOfferInput,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
} from "react-native-iap";

import type { StoreProduct, StorePurchasePayload } from "./types";
import {
  StoreAccountUnavailableError,
  StoreDuplicatePurchaseError,
  StoreProductMismatchError,
  StorePurchaseCancelledError,
} from "./types";

const PURCHASE_TIMEOUT_MS = 120_000;

let connectionPromise: Promise<boolean> | null = null;
let purchaseUpdateSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;

type PendingPurchaseRequest = {
  productId: string;
  subscriptionGroupId: string | null;
  resolve: (payload: StorePurchasePayload) => void;
  reject: (error: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ObservedPurchaseHandler = (payload: StorePurchasePayload) => Promise<void>;

let pendingPurchaseRequest: PendingPurchaseRequest | null = null;
let observedPurchaseHandler: ObservedPurchaseHandler | null = null;
let observedPurchaseErrorHandler: ((error: unknown) => void) | null = null;
const inFlightObservedPurchases = new Set<string>();
const completedObservedPurchases = new Set<string>();
const manuallyClaimedPurchases = new Set<string>();
let observedPurchaseQueue: Promise<void> = Promise.resolve();

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

const iosPendingProductId = (raw: Record<string, unknown>) => {
  const renewalInfo = raw.renewalInfoIOS;
  if (!renewalInfo || typeof renewalInfo !== "object") {
    return null;
  }

  const typedRenewalInfo = renewalInfo as Record<string, unknown>;
  return maybeString(typedRenewalInfo.pendingUpgradeProductId)
    ?? maybeString(typedRenewalInfo.autoRenewPreference);
};

const iosSubscriptionGroupIdFromProduct = (product: StoreProduct | null | undefined) => {
  if (!product?.raw || typeof product.raw !== "object") {
    return null;
  }

  const raw = product.raw as Record<string, unknown>;
  const directGroupId = maybeString(raw.subscriptionGroupIdIOS);
  if (directGroupId) {
    return directGroupId;
  }

  const subscriptionInfo = raw.subscriptionInfoIOS;
  if (!subscriptionInfo || typeof subscriptionInfo !== "object") {
    return null;
  }
  return maybeString((subscriptionInfo as Record<string, unknown>).subscriptionGroupId);
};

const iosTransactionReason = (raw: Record<string, unknown>) =>
  maybeString(raw.transactionReasonIOS) ?? maybeString(raw.reasonStringRepresentationIOS);

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
      pendingProductId: iosPendingProductId(raw),
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

const isDuplicatePurchase = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return error instanceof StoreDuplicatePurchaseError
    || code === "duplicate-purchase"
    || code === "DuplicatePurchase"
    || code === "DUPLICATE_PURCHASE";
};

const normalizeStoreError = (error: unknown) => {
  if (isUserCancelled(error)) {
    return new StorePurchaseCancelledError();
  }
  if (isDuplicatePurchase(error)) {
    return new StoreDuplicatePurchaseError();
  }
  if (isStoreAccountUnavailable(error)) {
    return new StoreAccountUnavailableError();
  }
  return error;
};

const isExpiredIosSubscriptionPurchase = (purchase: Purchase) => {
  if (Platform.OS !== "ios") {
    return false;
  }
  const expirationDate = (purchase as unknown as Record<string, unknown>).expirationDateIOS;
  const expirationTimestamp = typeof expirationDate === "number"
    ? expirationDate
    : typeof expirationDate === "string"
      ? Number(expirationDate)
      : Number.NaN;
  return Number.isFinite(expirationTimestamp) && expirationTimestamp <= Date.now();
};

const observedPurchaseKey = (payload: StorePurchasePayload) =>
  payload.transactionId ?? payload.orderId ?? payload.purchaseToken ?? `${payload.platform}:${payload.externalProductId}`;

const dispatchObservedPurchase = (payload: StorePurchasePayload) => {
  const handler = observedPurchaseHandler;
  if (!handler) {
    return;
  }

  const key = observedPurchaseKey(payload);
  if (
    manuallyClaimedPurchases.has(key) ||
    inFlightObservedPurchases.has(key) ||
    completedObservedPurchases.has(key)
  ) {
    return;
  }
  inFlightObservedPurchases.add(key);

  observedPurchaseQueue = observedPurchaseQueue
    .catch(() => undefined)
    .then(() => handler(payload))
    .then(() => {
      completedObservedPurchases.add(key);
    })
    .catch((error) => observedPurchaseErrorHandler?.(error))
    .finally(() => inFlightObservedPurchases.delete(key));
};

const settlePendingPurchase = (
  callback: (pending: PendingPurchaseRequest) => void,
) => {
  const pending = pendingPurchaseRequest;
  if (!pending) {
    return;
  }
  pendingPurchaseRequest = null;
  clearTimeout(pending.timeoutId);
  callback(pending);
};

const handlePurchaseUpdate = (updatedPurchase: Purchase) => {
  const pending = pendingPurchaseRequest;
  const raw = updatedPurchase as unknown as Record<string, unknown>;
  const pendingProductId = iosPendingProductId(raw);
  const matchesRequestedProduct = pending
    && (
      pending.productId === updatedPurchase.productId
      || pending.productId === pendingProductId
    );
  if (
    pending
    && matchesRequestedProduct
    && !isExpiredIosSubscriptionPurchase(updatedPurchase)
  ) {
    const payload = toStorePurchasePayload(updatedPurchase);
    manuallyClaimedPurchases.add(observedPurchaseKey(payload));
    settlePendingPurchase((request) => request.resolve(payload));
    return;
  }

  const payload = toStorePurchasePayload(updatedPurchase);
  const isMismatchedIosPurchase = Platform.OS === "ios"
    && pending
    && pending.subscriptionGroupId !== null
    && pending.subscriptionGroupId === maybeString(raw.subscriptionGroupIdIOS)
    && iosTransactionReason(raw)?.toUpperCase() === "PURCHASE"
    && !isExpiredIosSubscriptionPurchase(updatedPurchase);

  dispatchObservedPurchase(payload);
  if (isMismatchedIosPurchase) {
    settlePendingPurchase((request) =>
      request.reject(new StoreProductMismatchError(request.productId, updatedPurchase.productId)),
    );
  }
};

const handlePurchaseError = (error: PurchaseError | Error | unknown) => {
  const normalizedError = normalizeStoreError(error);
  const pending = pendingPurchaseRequest;
  if (!pending) {
    observedPurchaseErrorHandler?.(normalizedError);
    return;
  }

  if (normalizedError instanceof StoreDuplicatePurchaseError) {
    void getLatestAvailablePurchaseForDuplicate(pending.productId)
      .then((availablePurchase) => {
        settlePendingPurchase((request) => {
          if (availablePurchase) {
            request.resolve(toStorePurchasePayload(availablePurchase));
            return;
          }
          request.reject(normalizedError);
        });
      })
      .catch((restoreError) => {
        settlePendingPurchase((request) => request.reject(normalizeStoreError(restoreError)));
      });
    return;
  }

  settlePendingPurchase((request) => request.reject(normalizedError));
};

const ensurePurchaseListeners = () => {
  if (!purchaseUpdateSubscription) {
    purchaseUpdateSubscription = purchaseUpdatedListener(handlePurchaseUpdate);
  }
  if (!purchaseErrorSubscription) {
    purchaseErrorSubscription = purchaseErrorListener(handlePurchaseError);
  }
};

const purchaseTimestamp = (purchase: Purchase) => {
  const raw = purchase as unknown as Record<string, unknown>;
  const expirationDate = raw.expirationDateIOS;
  const transactionDate = raw.transactionDate;

  if (typeof expirationDate === "number") {
    return expirationDate;
  }
  if (typeof expirationDate === "string") {
    return Number(expirationDate) || 0;
  }
  if (typeof transactionDate === "number") {
    return transactionDate;
  }
  if (typeof transactionDate === "string") {
    return Number(transactionDate) || 0;
  }
  return 0;
};

const latestPurchaseForProduct = (purchases: Purchase[], productId: string) =>
  purchases
    .filter((purchase) => purchase.productId === productId)
    .sort((left, right) => purchaseTimestamp(right) - purchaseTimestamp(left))[0] ?? null;

const getLatestAvailablePurchase = async (productId: string, onlyIncludeActiveItemsIOS = true) => {
  const purchases = await getAvailablePurchases(
    Platform.OS === "ios" ? { onlyIncludeActiveItemsIOS } : undefined,
  );
  return latestPurchaseForProduct(purchases ?? [], productId);
};

const getLatestAvailablePurchaseForDuplicate = async (productId: string) =>
  getLatestAvailablePurchase(productId, true);

const getAndroidSubscriptionOffer = (
  product: StoreProduct | null | undefined,
): AndroidSubscriptionOfferInput | null => {
  if (!product) {
    return null;
  }

  const raw = product.raw as
    | {
        subscriptionOffers?: { offerToken?: unknown; sku?: unknown }[] | null;
        subscriptionOfferDetailsAndroid?: { offerToken?: unknown }[] | null;
      }
    | null
    | undefined;

  const standardizedOffer = raw?.subscriptionOffers?.find(
    (offer) => offer && typeof offer.offerToken === "string" && offer.offerToken.trim(),
  );
  if (standardizedOffer && typeof standardizedOffer.offerToken === "string") {
    return { sku: product.id, offerToken: standardizedOffer.offerToken };
  }

  const legacyOffer = raw?.subscriptionOfferDetailsAndroid?.find(
    (offer) => offer && typeof offer.offerToken === "string" && offer.offerToken.trim(),
  );
  if (legacyOffer && typeof legacyOffer.offerToken === "string") {
    return { sku: product.id, offerToken: legacyOffer.offerToken };
  }

  return null;
};

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

export const purchase = async (productId: string, product?: StoreProduct): Promise<StorePurchasePayload> => {
  await ensureConnection();
  ensurePurchaseListeners();

  return new Promise((resolve, reject) => {
    if (pendingPurchaseRequest) {
      reject(new Error("Another store purchase is already in progress."));
      return;
    }

    const timeoutId = setTimeout(() => {
      settlePendingPurchase((request) =>
        request.reject(new Error("Покупка не была подтверждена магазином. Попробуйте еще раз.")),
      );
    }, PURCHASE_TIMEOUT_MS);
    pendingPurchaseRequest = {
      productId,
      subscriptionGroupId: iosSubscriptionGroupIdFromProduct(product),
      resolve,
      reject,
      timeoutId,
    };

    const androidSubscriptionOffer =
      Platform.OS === "android" ? getAndroidSubscriptionOffer(product) : null;

    if (Platform.OS === "android" && !androidSubscriptionOffer) {
      settlePendingPurchase((request) =>
        request.reject(new Error("Missing Android subscription offer token for selected product.")),
      );
      return;
    }

    void requestPurchase({
      request: {
        apple: {
          sku: productId,
          quantity: 1,
        },
        google: {
          skus: [productId],
          subscriptionOffers: androidSubscriptionOffer ? [androidSubscriptionOffer] : undefined,
        },
      },
      type: "subs",
    })
      .catch(handlePurchaseError);
  });
};

export const observeStorePurchases = (
  onPurchase: ObservedPurchaseHandler,
  onError?: (error: unknown) => void,
) => {
  observedPurchaseHandler = onPurchase;
  observedPurchaseErrorHandler = onError ?? null;

  void ensureConnection()
    .then(ensurePurchaseListeners)
    .catch((error) => observedPurchaseErrorHandler?.(normalizeStoreError(error)));

  return () => {
    if (observedPurchaseHandler === onPurchase) {
      observedPurchaseHandler = null;
      observedPurchaseErrorHandler = null;
    }
  };
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
  manuallyClaimedPurchases.delete(observedPurchaseKey(payload));
};

export const releasePurchase = (payload: StorePurchasePayload) => {
  manuallyClaimedPurchases.delete(observedPurchaseKey(payload));
};
