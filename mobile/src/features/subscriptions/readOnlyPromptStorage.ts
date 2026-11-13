import * as SecureStore from "expo-secure-store";

// SecureStore keys permit only alphanumerics, dots, dashes and underscores.
const storageKey = (period: string) => "readonly." + Array.from(period)
  .map((character) => character.charCodeAt(0).toString(16).padStart(4, "0")).join("");

export const hasSeenReadOnlyPrompt = async (period: string) => {
  const key = storageKey(period);
  try {
    if (await SecureStore.isAvailableAsync()) return (await SecureStore.getItemAsync(key)) === "1";
    return globalThis.localStorage?.getItem(key) === "1";
  } catch { return false; }
};

export const markReadOnlyPromptSeen = async (period: string) => {
  const key = storageKey(period);
  try {
    if (await SecureStore.isAvailableAsync()) await SecureStore.setItemAsync(key, "1");
    else globalThis.localStorage?.setItem(key, "1");
  } catch { /* Storage failure must not block access to saved data. */ }
};
