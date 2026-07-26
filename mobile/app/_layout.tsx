import { useEffect, useState } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSubscriptionStatus } from "../src/features/subscriptions/useSubscriptionStatus";
import { getToken } from "../src/storage/auth";

const isSubscriptionExemptPath = (pathname: string) =>
  pathname === "/" ||
  pathname.startsWith("/login") ||
  pathname.startsWith("/auth/") ||
  pathname.startsWith("/onboarding") ||
  pathname.startsWith("/subscriptions");

const SubscriptionGate = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const exempt = isSubscriptionExemptPath(pathname);
  const status = useSubscriptionStatus(hasToken && !exempt);

  useEffect(() => {
    void getToken().then((token) => setHasToken(Boolean(token)));
  }, [pathname]);

  useEffect(() => {
    if (
      hasToken &&
      !exempt &&
      !status.isLoadingStatus &&
      status.statusResponse &&
      !status.statusResponse.premiumActive
    ) {
      router.replace("/subscriptions");
    }
  }, [exempt, hasToken, router, status.isLoadingStatus, status.statusResponse]);

  return null;
};

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionGate />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </QueryClientProvider>
  );
}
