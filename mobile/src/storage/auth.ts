import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const ONBOARDING_BASE_CURRENCY_SELECTED_KEY = "onboarding_base_currency_selected";

const isSecureStoreAvailable = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

const getFallbackStorage = () => {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
};

export const getToken = async (): Promise<string | null> => {
  if (await isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  return getFallbackStorage()?.getItem(TOKEN_KEY) ?? null;
};

export const setToken = async (token: string): Promise<void> => {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }

  getFallbackStorage()?.setItem(TOKEN_KEY, token);
};

export const removeToken = async (): Promise<void> => {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }

  getFallbackStorage()?.removeItem(TOKEN_KEY);
};

export const removeOnboardingBaseCurrencySelected = async (): Promise<void> => {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(ONBOARDING_BASE_CURRENCY_SELECTED_KEY);
    return;
  }

  getFallbackStorage()?.removeItem(ONBOARDING_BASE_CURRENCY_SELECTED_KEY);
};

export const getOnboardingBaseCurrencySelected = async (): Promise<boolean> => {
  if (await isSecureStoreAvailable()) {
    return (await SecureStore.getItemAsync(ONBOARDING_BASE_CURRENCY_SELECTED_KEY)) === "true";
  }

  return getFallbackStorage()?.getItem(ONBOARDING_BASE_CURRENCY_SELECTED_KEY) === "true";
};

export const setOnboardingBaseCurrencySelected = async (): Promise<void> => {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(ONBOARDING_BASE_CURRENCY_SELECTED_KEY, "true");
    return;
  }

  getFallbackStorage()?.setItem(ONBOARDING_BASE_CURRENCY_SELECTED_KEY, "true");
};
