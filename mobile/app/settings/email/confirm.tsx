import { Redirect, useLocalSearchParams } from "expo-router";

export default function ConfirmEmailChangeRedirect() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const query = typeof token === "string" ? `?token=${encodeURIComponent(token)}&mode=email-change` : "?mode=email-change";

  return <Redirect href={`/auth/verify${query}`} />;
}
