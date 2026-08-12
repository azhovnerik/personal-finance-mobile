import { Redirect, useLocalSearchParams } from "expo-router";

export default function PasswordSetupRedirect() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const query = typeof token === "string" ? `?token=${encodeURIComponent(token)}&mode=password-setup` : "?mode=password-setup";

  return <Redirect href={`/auth/reset-password${query}`} />;
}
