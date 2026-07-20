type SubscriptionAnalyticsEvent =
  | "subscription_screen_opened"
  | "subscription_products_loaded"
  | "subscription_store_products_loaded"
  | "subscription_store_products_fallback_loaded"
  | "subscription_store_products_missing"
  | "subscription_purchase_started"
  | "subscription_purchase_store_success"
  | "subscription_purchase_validate_success"
  | "subscription_purchase_validate_failed"
  | "subscription_restore_started"
  | "subscription_restore_success"
  | "subscription_restore_failed";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const maskSensitive = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= 10) {
    return "***";
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

export const trackSubscriptionEvent = (event: SubscriptionAnalyticsEvent, payload: AnalyticsPayload = {}) => {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  const safePayload = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      key.toLowerCase().includes("token") || key.toLowerCase().includes("receipt")
        ? maskSensitive(value)
        : value,
    ]),
  );

  console.info(`[analytics] ${event}`, safePayload);
};
