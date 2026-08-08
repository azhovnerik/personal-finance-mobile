import { useEffect, useState } from "react";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { LocalizationProvider } from "../src/localization/LocalizationProvider";
import { useSubscriptionStatus } from "../src/features/subscriptions/useSubscriptionStatus";
import { useStorePurchaseObserver } from "../src/features/subscriptions/useStorePurchaseObserver";
import { getToken } from "../src/storage/auth";

const isSubscriptionExemptPath = (pathname: string, firstSegment: string | undefined) =>
  (pathname === "/" && firstSegment !== "(tabs)") ||
  pathname.startsWith("/login") ||
  pathname.startsWith("/auth/") ||
  pathname.startsWith("/onboarding") ||
  pathname.startsWith("/subscriptions");

const SubscriptionGate = () => {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const exempt = isSubscriptionExemptPath(pathname, segments[0]);
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

const StorePurchaseObserver = () => {
  useStorePurchaseObserver();
  return null;
};

const LocalizedApp = () => {
  return (
    <>
      <StorePurchaseObserver />
      <SubscriptionGate />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
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
      <LocalizationProvider>
        <LocalizedApp />
      </LocalizationProvider>
    </QueryClientProvider>
  );
}
