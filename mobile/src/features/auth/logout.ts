import { clearAuthSession } from "./api";
import { signOutGoogleSession } from "./googleSignIn";

export const logout = async (): Promise<void> => {
  try {
    await signOutGoogleSession();
  } finally {
    await clearAuthSession();
  }
};
