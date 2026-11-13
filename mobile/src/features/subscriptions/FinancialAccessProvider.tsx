import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter, useSegments } from "expo-router";
import { Text, Button, colors, spacing } from "../../shared/ui";
import { translate } from "../../localization";
import { isPublicSubscriptionPath } from "./accessRoutes";
import { getToken } from "../../storage/auth";
import { useSubscriptionStatus } from "./useSubscriptionStatus";
import { subscribeFinancialSubscription } from "./financialAccessEvents";
import { hasSeenReadOnlyPrompt, markReadOnlyPromptSeen } from "./readOnlyPromptStorage";

const FinancialAccessContext = createContext<{ canWrite: boolean; isReadOnly: boolean; isLoading: boolean; allowWrite: () => boolean }>({ canWrite: false, isReadOnly: false, isLoading: true, allowWrite: () => false });
export const useFinancialAccess = () => useContext(FinancialAccessContext);

export const FinancialAccessProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const returnAfterPurchase = useRef(false);
  const previousPath = useRef(pathname);
  const promptedPeriod = useRef<string | null>(null);
  const publicPath = isPublicSubscriptionPath(pathname, segments[0]);
  const onboardingPath = pathname.startsWith("/onboarding");
  const status = useSubscriptionStatus(hasToken === true && !publicPath);
  const canWrite = hasToken === true && !publicPath && (status.statusResponse?.canWriteFinancialData ?? status.statusResponse?.premiumActive ?? false);
  const initialTrialPending = status.statusResponse?.initialTrialPending === true;
  const isReadOnly = !initialTrialPending && hasToken === true && !publicPath && status.statusResponse !== null && !canWrite;
  const readOnly = isReadOnly && !onboardingPath;
  const isLoading = hasToken === null || (hasToken && !publicPath && !status.statusResponse && status.isLoadingStatus);
  const showBanner = readOnly && pathname !== "/subscriptions";
  const period = status.statusResponse?.readOnlyPeriodKey;

  useEffect(() => {
    let active = true;
    void getToken().then((token) => { if (active) setHasToken(Boolean(token)); });
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (hasToken && onboardingPath && status.statusResponse && !canWrite && !initialTrialPending) router.replace("/(tabs)");
  }, [hasToken, onboardingPath, status.statusResponse, canWrite, initialTrialPending, router]);

  useEffect(() => subscribeFinancialSubscription(() => {
    if (!hasToken || publicPath) return;
    setShowOffer(true);
    void status.refresh();
  }), [hasToken, publicPath, status.refresh]);

  useEffect(() => {
    if (!readOnly || !period || publicPath || pathname === "/subscriptions" || promptedPeriod.current === period) return;
    let active = true;
    void hasSeenReadOnlyPrompt(period).then((seen) => {
      if (active && !seen) { promptedPeriod.current = period; setShowOffer(true); }
    });
    return () => { active = false; };
  }, [readOnly, period, publicPath, pathname]);

  useEffect(() => {
    if (pathname === "/subscriptions" && previousPath.current !== pathname && readOnly) returnAfterPurchase.current = true;
    if (previousPath.current === "/subscriptions" && pathname !== "/subscriptions") returnAfterPurchase.current = false;
    previousPath.current = pathname;
    if (status.statusResponse) setShowStatus(false);
    if (canWrite) {
      setShowOffer(false);
      if (returnAfterPurchase.current && pathname === "/subscriptions") {
        returnAfterPurchase.current = false;
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
      }
    }
    if (!hasToken || publicPath) {
      setShowOffer(false);
      setShowStatus(false);
      returnAfterPurchase.current = false;
    }
  }, [canWrite, readOnly, pathname, router, hasToken, publicPath, status.statusResponse]);

  const allowWrite = useCallback(() => {
    if (canWrite) return true;
    if (!hasToken || publicPath) return false;
    if (initialTrialPending) {
      router.push("/onboarding");
      return false;
    }
    if (!status.statusResponse) {
      setShowStatus(true);
      if (!status.isRefreshingStatus) void status.refresh();
      return false;
    }
    setShowOffer(true);
    return false;
  }, [canWrite, hasToken, publicPath, status.statusResponse, status.refresh, status.isRefreshingStatus, initialTrialPending, router]);
  const dismiss = () => {
    if (period) void markReadOnlyPromptSeen(period);
    setShowOffer(false);
  };
  const subscribe = () => {
    dismiss();
    returnAfterPurchase.current = true;
    if (pathname !== "/subscriptions") router.push("/subscriptions");
  };

  return (
    <FinancialAccessContext.Provider value={{ canWrite, isReadOnly, isLoading, allowWrite }}>
      <View style={styles.container}>
        {showBanner ? (
          <SafeAreaView edges={["top"]} style={styles.banner}>
            <Pressable onPress={subscribe} style={styles.bannerContent}>
              <Text variant="caption">{translate("Your data is available in read-only mode.")}</Text>
              <Text variant="caption">{translate("Subscribe")}</Text>
            </Pressable>
          </SafeAreaView>
        ) : null}
        <SafeAreaInsetsContext.Provider value={showBanner ? { ...insets, top: 0 } : insets}>
          {children}
        </SafeAreaInsetsContext.Provider>
      </View>
      <Modal visible={showStatus} transparent animationType="fade" onRequestClose={() => setShowStatus(false)}>
        <View style={styles.overlay}>
          <View style={styles.offer}>
            <Text>{status.error
              ? translate("Unable to load subscription status.")
              : translate("Loading subscription status...")}</Text>
            <Button title={translate("Retry")} disabled={status.isRefreshingStatus} onPress={() => void status.refresh()} />
            <Button title={translate("Continue viewing")} variant="outline" onPress={() => setShowStatus(false)} />
          </View>
        </View>
      </Modal>
      <Modal visible={showOffer} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.overlay}>
          <View style={styles.offer}>
            <Text variant="title">{translate("Continue tracking your finances")}</Text>
            <Text>{translate("Subscribe to add, edit or delete financial data. You can still view and export your saved data on the website.")}</Text>
            <Button title={translate("Subscribe")} onPress={subscribe} />
            <Button title={translate("Continue viewing")} variant="outline" onPress={dismiss} />
          </View>
        </View>
      </Modal>
    </FinancialAccessContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { backgroundColor: colors.card },
  bannerContent: { padding: spacing.sm, flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  overlay: { flex: 1, justifyContent: "center", padding: spacing.lg, backgroundColor: "rgba(0,0,0,0.45)" },
  offer: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, gap: spacing.lg },
});
