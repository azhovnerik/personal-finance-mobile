import { Platform } from "react-native";
import { GoogleOneTapSignIn } from "react-native-nitro-google-signin";

let googleSignInConfigured = false;

export const configureGoogleSignIn = () => {
  if (googleSignInConfigured) {
    return;
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!webClientId || !iosClientId) {
    throw new Error("Google Sign-In is not configured for this build.");
  }

  GoogleOneTapSignIn.configure({
    webClientId,
    iosClientId,
  });
  googleSignInConfigured = true;
};

export const signOutGoogleSession = async (): Promise<void> => {
  if (Platform.OS !== "ios") {
    return;
  }

  configureGoogleSignIn();
  await GoogleOneTapSignIn.signOut();
};
