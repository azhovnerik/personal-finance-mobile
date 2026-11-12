import { useState } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { LocalizationProvider } from "../src/localization/LocalizationProvider";
import { FinancialAccessProvider } from "../src/features/subscriptions/FinancialAccessProvider";
import { useStorePurchaseObserver } from "../src/features/subscriptions/useStorePurchaseObserver";
import { DailyReminderObserver } from "../src/features/notifications/DailyReminderObserver";

const StorePurchaseObserver = () => {
  useStorePurchaseObserver();
  return null;
};

const LocalizedApp = () => {
  return (
    <FinancialAccessProvider>
      <StorePurchaseObserver />
      <DailyReminderObserver />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </FinancialAccessProvider>
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
