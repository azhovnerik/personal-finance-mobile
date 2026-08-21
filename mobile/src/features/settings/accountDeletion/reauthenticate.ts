import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "react-native-nitro-google-signin";

import { translate } from "../../../localization";
import { createAppleLoginNonce } from "../../auth/api";
import { configureGoogleSignIn } from "../../auth/googleSignIn";
import type { AppleDeletionCredential } from "./types";

export const requestGoogleDeletionCredential = async (): Promise<string | null> => {
  if (Platform.OS !== "ios") {
    return null;
  }
  configureGoogleSignIn();
  try {
    const response = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (isCancelledResponse(response)) {
      throw new Error(translate("Unable to sign in with Google. Try again."));
    }
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new Error(translate("Google did not return an ID token."));
    }
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error(translate("Unable to sign in with Google. Try again."));
    }
    throw error;
  }
};

export const requestAppleDeletionCredential = async (): Promise<AppleDeletionCredential | null> => {
  if (Platform.OS !== "ios") {
    return null;
  }
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new Error(translate("Apple Sign-In is not available on this device."));
  }
  const { nonce } = await createAppleLoginNonce();
  try {
    const credential = await AppleAuthentication.signInAsync({
      nonce,
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken || !credential.authorizationCode) {
      throw new Error(translate("Apple did not return credentials required for account deletion."));
    }
    return {
      identityToken: credential.identityToken,
      nonce,
      authorizationCode: credential.authorizationCode,
    };
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") {
      throw new Error(translate("Apple Sign-In was cancelled."));
    }
    throw error;
  }
};
