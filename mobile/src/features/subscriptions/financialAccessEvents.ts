const listeners = new Set<() => void>();

export const requestFinancialSubscription = () => listeners.forEach((listener) => listener());
export const subscribeFinancialSubscription = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

// Handles expiry during an open form, including calls made by the generated SDK.
export const financialFetch: typeof fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  if (response.status === 403) {
    try {
      const payload = await response.clone().json();
      if (payload?.code === "SUBSCRIPTION_REQUIRED") requestFinancialSubscription();
    } catch { /* Preserve the original response and its error handling. */ }
  }
  return response;
};
