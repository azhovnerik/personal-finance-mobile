import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { AccountDto } from "../../src/shared/api/dto";
import { useAccounts } from "../../src/features/accounts/useAccounts";
import { AmountKeypad } from "../../src/features/transactions/components/AmountKeypad";

export default function AccountBalanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ account?: string }>();
  const { updateBalance, isSaving, actionError } = useAccounts();
  const [account, setAccount] = useState<AccountDto | null>(null);
  const [balanceValue, setBalanceValue] = useState("0");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(true);

  useEffect(() => {
    if (!params.account) {
      setLocalError("Нет данных о счете.");
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(params.account)) as AccountDto;
      setAccount(parsed);
      setBalanceValue(String(parsed.balance ?? 0));
    } catch {
      setLocalError("Не удалось открыть счет.");
    }
  }, [params.account]);

  const handleSave = async () => {
    setIsAmountKeypadOpen(false);
    if (!account?.id) {
      setLocalError("Нет ID счета.");
      return;
    }
    const parsed = Number.parseFloat(balanceValue.replace(",", "."));
    if (Number.isNaN(parsed)) {
      setLocalError("Введите корректный баланс.");
      return;
    }
    setLocalError(null);
    const ok = await updateBalance(account.id, parsed);
    if (ok) {
      router.back();
    }
  };

  const handleAmountPress = () => {
    Keyboard.dismiss();
    setIsAmountKeypadOpen(true);
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerAction}>Отмена</Text>
          </Pressable>
          <Text variant="subtitle">Изменить баланс</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text variant="caption">Счет: {account?.name ?? "—"}</Text>
          <Pressable onPress={handleAmountPress}>
            <Input
              placeholder="Новый баланс"
              keyboardType="numeric"
              value={balanceValue}
              editable={false}
              showSoftInputOnFocus={false}
              onPressIn={handleAmountPress}
            />
          </Pressable>
        </View>

        <View style={styles.footer}>
          {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          <Button
            title={isSaving ? "Сохраняем..." : "Сохранить баланс"}
            disabled={isSaving}
            onPress={handleSave}
          />
        </View>

        {isAmountKeypadOpen ? (
          <AmountKeypad
            value={balanceValue}
            onChange={setBalanceValue}
            onDone={() => setIsAmountKeypadOpen(false)}
          />
        ) : null}
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
  footer: {
    marginTop: "auto",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
});
