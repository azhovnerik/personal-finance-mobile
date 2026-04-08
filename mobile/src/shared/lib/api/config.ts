import { Platform } from "react-native";

const DEFAULT_API_BASE_URL = "http://localhost:4010";
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

const getPlatformApiBaseUrl = (url: string) => {
  if (Platform.OS !== "android") {
    return url;
  }

  return url
    .replace("://localhost", `://${ANDROID_EMULATOR_HOST}`)
    .replace("://127.0.0.1", `://${ANDROID_EMULATOR_HOST}`);
};

export const API_BASE_URL = getPlatformApiBaseUrl(rawApiBaseUrl);

