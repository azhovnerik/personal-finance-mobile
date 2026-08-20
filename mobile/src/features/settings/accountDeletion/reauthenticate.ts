import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
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
  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }
  if (isCancelledResponse(response)) {
    return null;
  }
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error(translate("Google did not return an ID token."));
  }
  return response.data.idToken;
};

export const requestAppleDeletionCredential = async (): Promise<AppleDeletionCredential | null> => {
  if (Platform.OS !== "ios") {
    return null;
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
      return null;
    }
    throw error;
  }
};
