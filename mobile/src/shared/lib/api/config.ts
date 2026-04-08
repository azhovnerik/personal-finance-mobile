import { Platform } from "react-native";

const DEFAULT_API_BASE_URL = "http://localhost:4010";
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

const isAndroidEmulator = () => {
  if (Platform.OS !== "android") {
    return false;
  }

  const constants = Platform.constants as {
    Brand?: string;
    Fingerprint?: string;
    Manufacturer?: string;
    Model?: string;
    Product?: string;
  };

  const fingerprint = constants.Fingerprint?.toLowerCase() ?? "";
  const model = constants.Model?.toLowerCase() ?? "";
  const brand = constants.Brand?.toLowerCase() ?? "";
  const manufacturer = constants.Manufacturer?.toLowerCase() ?? "";
  const product = constants.Product?.toLowerCase() ?? "";

  return (
    fingerprint.startsWith("generic") ||
    fingerprint.includes("emulator") ||
    model.includes("emulator") ||
    model.includes("sdk") ||
    manufacturer.includes("genymotion") ||
    (brand.startsWith("generic") && product.startsWith("generic"))
  );
};

const getPlatformApiBaseUrl = (url: string) => {
  if (!isAndroidEmulator()) {
    return url;
  }

  return url
    .replace("://localhost", `://${ANDROID_EMULATOR_HOST}`)
    .replace("://127.0.0.1", `://${ANDROID_EMULATOR_HOST}`);
};

export const API_BASE_URL = getPlatformApiBaseUrl(rawApiBaseUrl);
