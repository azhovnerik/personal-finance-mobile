import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyResetPasswordRedirect() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const query = typeof token === "string" ? `?token=${encodeURIComponent(token)}` : "";

  return <Redirect href={`/auth/reset-password${query}`} />;
}
