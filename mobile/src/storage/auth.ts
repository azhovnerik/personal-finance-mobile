import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

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
