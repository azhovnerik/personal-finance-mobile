import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { AccountDto } from "../../src/shared/api/dto";
import { useAccounts } from "../../src/features/accounts/useAccounts";
import { formatCurrency } from "../../src/shared/utils/format";

const parseAccountParam = (raw?: string): AccountDto | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(decodeURIComponent(raw)) as AccountDto;
  } catch {
    return null;
  }
};

export default function AccountDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ account?: string; accountId?: string }>();
  const { accounts, deleteAccount, isSaving, actionError } = useAccounts();
  const fallbackAccount = useMemo(() => parseAccountParam(params.account), [params.account]);
  const selectedAccount = useMemo(() => {
    const accountItems = Array.isArray(accounts) ? accounts : [];
    const byId = accountItems.find((account) => account.id === params.accountId);
    return byId ?? fallbackAccount;
  }, [accounts, fallbackAccount, params.accountId]);
  const baseCurrency = "UAH";

  const openEdit = () => {
    if (!selectedAccount) {
      return;
    }
    const payload = encodeURIComponent(JSON.stringify(selectedAccount));
    router.push({ pathname: "/accounts/edit", params: { account: payload } });
  };

  const openBalance = () => {
    if (!selectedAccount) {
      return;
    }
    const payload = encodeURIComponent(JSON.stringify(selectedAccount));
    router.push({ pathname: "/accounts/balance", params: { account: payload } });
  };

  const confirmDelete = () => {
    if (!selectedAccount?.id) {
      return;
    }
    Alert.alert(
      "Удалить счет?",
      selectedAccount.name ? `Счет "${selectedAccount.name}" будет удален.` : "Счет будет удален.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const ok = await deleteAccount(selectedAccount.id!);
              if (ok) {
                router.back();
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerAction}>Назад</Text>
          </Pressable>
          <Text variant="subtitle">Счет</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {selectedAccount ? (
            <Card style={styles.detailsCard}>
              <View style={styles.row}>
                <Text variant="caption" style={styles.label}>
                  Название
                </Text>
                <Text>{selectedAccount.name}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="caption" style={styles.label}>
                  Тип
                </Text>
                <Text>{selectedAccount.type}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="caption" style={styles.label}>
                  Валюта
                </Text>
                <Text>{selectedAccount.currency ?? baseCurrency}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="caption" style={styles.label}>
                  Баланс
                </Text>
                <Text
                  style={(selectedAccount.balance ?? 0) < 0 ? styles.negativeValue : styles.positiveValue}
                >
                  {formatCurrency(selectedAccount.balance ?? 0, selectedAccount.currency ?? baseCurrency)}
                </Text>
              </View>
              {selectedAccount.description ? (
                <View style={styles.row}>
                  <Text variant="caption" style={styles.label}>
                    Описание
                  </Text>
                  <Text>{selectedAccount.description}</Text>
                </View>
              ) : null}
            </Card>
          ) : (
            <Text style={styles.errorText}>Не удалось открыть счет.</Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          <View style={styles.actionsRow}>
            <Button
              title="Edit"
              onPress={openEdit}
              disabled={!selectedAccount || isSaving}
              style={styles.actionButton}
            />
            <Button
              title="Balance"
              onPress={openBalance}
              disabled={!selectedAccount || isSaving}
              style={styles.actionButton}
            />
            <Button
              title={isSaving ? "Удаление..." : "Delete"}
              variant="outline"
              tone="danger"
              onPress={confirmDelete}
              disabled={!selectedAccount || isSaving}
              style={styles.actionButton}
            />
          </View>
        </View>
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
    gap: spacing.md,
  },
  detailsCard: {
    gap: spacing.sm,
  },
  row: {
    gap: 4,
  },
  label: {
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
  },
});
