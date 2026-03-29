import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { useAccounts } from "../../src/features/accounts/useAccounts";

const ALL_ACCOUNTS_ID = "__all__";

export default function FilterAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ selectedAccountId?: string }>();
  const { accounts } = useAccounts();

  const selectedAccountId = params.selectedAccountId ?? ALL_ACCOUNTS_ID;

  const handleSelect = (accountId: string) => {
    router.replace({
      pathname: "/(tabs)/transactions",
      params: { accountId },
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerAction}>Назад</Text>
          </Pressable>
          <Text variant="subtitle">Выбор счета</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable
            style={[styles.accountRow, selectedAccountId === ALL_ACCOUNTS_ID && styles.accountRowActive]}
            onPress={() => handleSelect(ALL_ACCOUNTS_ID)}
          >
            <Text style={selectedAccountId === ALL_ACCOUNTS_ID ? styles.accountTextActive : styles.accountText}>
              Все счета
            </Text>
          </Pressable>

          {accounts.map((account) => {
            const accountId = account.id;
            if (!accountId) {
              return null;
            }
            const isActive = selectedAccountId === accountId;
            return (
              <Pressable
                key={accountId}
                style={[styles.accountRow, isActive && styles.accountRowActive]}
                onPress={() => handleSelect(accountId)}
              >
                <Text style={isActive ? styles.accountTextActive : styles.accountText}>{account.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  accountRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  accountRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  accountText: {
    color: colors.textPrimary,
  },
  accountTextActive: {
    color: colors.surface,
    fontWeight: "700",
  },
});
