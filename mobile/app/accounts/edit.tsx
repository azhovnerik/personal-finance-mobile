import { Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Input, ScreenContainer, Select, Text, colors, spacing } from "../../src/shared/ui";
import { AccountDto, AccountType, CurrencyCode } from "../../src/shared/api/dto";
import { useAccounts } from "../../src/features/accounts/useAccounts";
import { AmountKeypad } from "../../src/features/transactions/components/AmountKeypad";

type AccountFormState = {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balance: string;
  description: string;
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: "CASH", label: "Наличные" },
  { value: "CARD", label: "Карта" },
  { value: "BANK_ACCOUNT", label: "Банковский счет" },
  { value: "DEBT", label: "Долг" },
];

const CURRENCY_OPTIONS = [
  { value: "UAH", label: "UAH" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "PLN", label: "PLN" },
];

const INITIAL_FORM: AccountFormState = {
  name: "",
  type: "CARD",
  currency: "UAH",
  balance: "0",
  description: "",
};

export default function EditAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ account?: string }>();
  const { isSaving, actionError, createAccount, updateAccount } = useAccounts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(INITIAL_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);

  useEffect(() => {
    if (!params.account) {
      setEditingId(null);
      setForm(INITIAL_FORM);
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(params.account)) as AccountDto;
      setEditingId(parsed.id ?? null);
      setForm({
        name: parsed.name ?? "",
        type: parsed.type ?? "CARD",
        currency: (parsed.currency ?? "UAH") as CurrencyCode,
        balance: String(parsed.balance ?? 0),
        description: parsed.description ?? "",
      });
    } catch {
      setLocalError("Не удалось открыть счет.");
    }
  }, [params.account]);

  const handleSave = async () => {
    setIsAmountKeypadOpen(false);
    setLocalError(null);
    const name = form.name.trim();
    if (!name) {
      setLocalError("Введите название счета.");
      return;
    }
    const balance = Number.parseFloat(form.balance.replace(",", "."));
    if (Number.isNaN(balance)) {
      setLocalError("Введите корректный баланс.");
      return;
    }

    const payload = {
      name,
      type: form.type,
      currency: form.currency,
      description: form.description.trim() || null,
      balance,
    };

    const ok = editingId
      ? await updateAccount(editingId, payload)
      : await createAccount(payload);
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
          <Text variant="subtitle">{editingId ? "Редактировать счет" : "Новый счет"}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Input
            placeholder="Название"
            value={form.name}
            onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          />
          <Select
            placeholder="Тип"
            value={form.type}
            options={ACCOUNT_TYPE_OPTIONS}
            onChange={(value) => setForm((prev) => ({ ...prev, type: value as AccountType }))}
          />
          <Select
            placeholder="Валюта"
            value={form.currency}
            options={CURRENCY_OPTIONS}
            onChange={(value) => setForm((prev) => ({ ...prev, currency: value as CurrencyCode }))}
          />
          <Input
            placeholder="Описание"
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          />
          {!editingId ? (
            <Pressable onPress={handleAmountPress}>
              <Input
                placeholder="Баланс"
                keyboardType="numeric"
                value={form.balance}
                editable={false}
                showSoftInputOnFocus={false}
                onPressIn={handleAmountPress}
              />
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          <Button
            title={isSaving ? "Сохраняем..." : editingId ? "Обновить" : "Создать"}
            disabled={isSaving}
            onPress={handleSave}
          />
        </View>

        {!editingId && isAmountKeypadOpen ? (
          <AmountKeypad
            value={form.balance}
            onChange={(value) => setForm((prev) => ({ ...prev, balance: value }))}
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
