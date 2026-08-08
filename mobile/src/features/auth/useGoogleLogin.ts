import { localizeSystemMessage, translate } from "../../localization";
import { useCallback, useState } from "react";
import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "react-native-nitro-google-signin";

import { ApiError, loginWithGoogle, persistAuthTokenFromResponse } from "./api";
import { configureGoogleSignIn } from "./googleSignIn";
import type { AuthResponse } from "./types";

export const useGoogleLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (): Promise<AuthResponse | null> => {
    if (Platform.OS !== "ios") {
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      configureGoogleSignIn();

      let response = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(response)) {
        response = await GoogleOneTapSignIn.createAccount();
      }
      if (isNoSavedCredentialFoundResponse(response)) {
        response = await GoogleOneTapSignIn.presentExplicitSignIn();
      }
      if (isCancelledResponse(response)) {
        return null;
      }
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error(translate("Google did not return an ID token."));
      }

      const authResponse = await loginWithGoogle(response.data.idToken);
      await persistAuthTokenFromResponse(authResponse);
      return authResponse;
    } catch (rawError) {
      if (isErrorWithCode(rawError) && rawError.code === statusCodes.SIGN_IN_CANCELLED) {
        return null;
      }

      const apiError = rawError as ApiError;
      setError(localizeSystemMessage(apiError.message, "Unable to sign in with Google. Try again."));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    isLoading,
    error,
    isAvailable: Platform.OS === "ios",
  };
};
