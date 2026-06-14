export type SubscriptionPlatform = "IOS" | "ANDROID" | "WEB";
export type SubscriptionProvider = "APPLE" | "GOOGLE" | "LIQPAY";
export type SubscriptionState = "ACTIVE" | "EXPIRED" | "PAST_DUE" | "CANCELLED" | "PENDING";
export type ManageAction = "APP_STORE" | "GOOGLE_PLAY" | "WEB" | "NONE";

export type BillingPeriod = "MONTHLY" | "YEARLY" | string;

export type SubscriptionProductDto = {
  productCode: string;
  title: string;
  description: string;
  provider: SubscriptionProvider;
  platform: SubscriptionPlatform;
  externalProductId: string;
  active: boolean;
  billingPeriod: BillingPeriod;
  price: string | number;
  currency: string;
};

export type SubscriptionProductsResponse = {
  products: SubscriptionProductDto[];
};

export type SubscriptionSourceDto = {
  provider: SubscriptionProvider;
  platform: SubscriptionPlatform;
  productCode: string;
  status: SubscriptionState;
  autoRenew: boolean;
  expiresAt: string | null;
  manageAction: ManageAction;
};

export type SubscriptionStatusResponse = {
  premiumActive: boolean;
  status: SubscriptionState;
  effectiveTo: string | null;
  autoRenew: boolean;
  sources: SubscriptionSourceDto[];
};

export type IosValidateRequest = {
  externalProductId: string;
  transactionId: string;
  originalTransactionId: string;
  signedTransactionInfo: string;
};

export type AndroidValidateRequest = {
  externalProductId: string;
  purchaseToken: string;
  orderId: string;
  packageName: string;
};

export type ValidateRequest = IosValidateRequest | AndroidValidateRequest;

export type ValidateResponse = {
  processed: boolean;
  productCode: string;
  premiumActive: boolean;
  status: SubscriptionState;
  effectiveTo: string | null;
};

export type RestorePurchaseRequest = Partial<IosValidateRequest & AndroidValidateRequest> & {
  externalProductId: string;
};

export type RestoreRequest = {
  platform: Extract<SubscriptionPlatform, "IOS" | "ANDROID">;
  purchases: RestorePurchaseRequest[];
};

export type RestoreResponse = {
  processedCount: number;
  restoredCount: number;
  premiumActive: boolean;
  status: SubscriptionState;
  effectiveTo: string | null;
};

export type ApiErrorResponse = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export class SubscriptionsApiError extends Error {
  code: string;
  details: Record<string, unknown> | null;
  status: number;

  constructor(message: string, options?: { code?: string | null; details?: Record<string, unknown> | null; status?: number }) {
    super(message);
    this.name = "SubscriptionsApiError";
    this.code = options?.code ?? "UNKNOWN";
    this.details = options?.details ?? null;
    this.status = options?.status ?? 0;
  }
}

export type StoreProduct = {
  id: string;
  title: string;
  description: string;
  displayPrice: string;
  currency: string | null;
  raw: unknown;
};

export type StorePurchasePayload = {
  platform: Extract<SubscriptionPlatform, "IOS" | "ANDROID">;
  externalProductId: string;
  transactionId?: string | null;
  originalTransactionId?: string | null;
  signedTransactionInfo?: string | null;
  purchaseToken?: string | null;
  orderId?: string | null;
  packageName?: string | null;
  raw: unknown;
};

export class StorePurchaseCancelledError extends Error {
  code: string;

  constructor(message = "Purchase cancelled") {
    super(message);
    this.name = "StorePurchaseCancelledError";
    this.code = "USER_CANCELLED";
  }
}

export class StoreAccountUnavailableError extends Error {
  code: string;

  constructor(message = "No active App Store account") {
    super(message);
    this.name = "StoreAccountUnavailableError";
    this.code = "STORE_ACCOUNT_UNAVAILABLE";
  }
}
