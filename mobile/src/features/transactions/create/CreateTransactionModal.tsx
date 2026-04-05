import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, DateInput, Input, Select, Text, colors, spacing } from "../../../shared/ui";
import { mockTransactions, mockUser } from "../../../shared/mocks";
import { useAccounts } from "../../accounts/useAccounts";
import {
  Account,
  Category,
  CategoryType,
  CurrencyCode,
  TransactionDirection,
  TransactionDto,
  TransactionType,
} from "../../../shared/api/dto";
import client from "../../../shared/lib/api/client";
import { notifyTransactionsChanged } from "../../../shared/lib/events/transactions";
import { getToken, removeToken } from "../../../storage/auth";

import { AmountKeypad } from "../components/AmountKeypad";
import { CategoryPickerField } from "../../categories/components/CategoryPickerField";

type CreateTransactionModalProps = {
  visible: boolean;
  onClose: () => void;
};

type TransactionFormState = {
  amount: string;
  categoryId: string | null;
  note: string;
  date: string;
  accountId: string | null;
};

const toYmd = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const toBackendDateTime = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const now = new Date();
  const localDate = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );

  return formatDateTime(localDate);
};

const getInitialFormState = (): TransactionFormState => ({
  amount: "0",
  categoryId: null,
  note: "",
  date: toYmd(new Date()),
  accountId: null,
});

const toCategory = (category: Category): Category => ({
  id: category.id,
  name: category.name,
  type: category.type,
  disabled: category.disabled,
});

const toAccount = (
  account:
    | TransactionDto["account"]
    | { id?: string; name: string; type: Account["type"]; currency?: Account["currency"] | null }
    | null
    | undefined,
): Account | null => {
  if (!account?.id) {
    return null;
  }
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency ?? null,
  };
};

export const CreateTransactionModal = ({ visible, onClose }: CreateTransactionModalProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [formState, setFormState] = useState<TransactionFormState>(() => getInitialFormState());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const useMocks = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";

  const { accounts } = useAccounts();

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => Boolean(account.id))
        .map((account) => ({ value: account.id!, label: account.name })),
    [accounts],
  );

  const selectedAccount = useMemo(
    () => toAccount(accounts.find((account) => account.id === formState.accountId)),
    [accounts, formState.accountId],
  );

  const updateAmount = (value: string) => {
    setFormState((prev) => ({ ...prev, amount: value }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormState((prev) => ({ ...prev, categoryId }));
  };

  const resetForm = () => {
    setFormState(getInitialFormState());
    setSelectedCategory(null);
    setErrorMessage(null);
  };

  const directionForCategoryType = (type: CategoryType): TransactionDirection =>
    type === "INCOME" ? "INCREASE" : "DECREASE";

  const transactionTypeForCategoryType = (type: CategoryType): TransactionType =>
    type === "INCOME" ? "INCOME" : "EXPENSE";

  const generateId = () => {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random()}`;
  };

  const handleUnauthorized = async () => {
    await removeToken();
    router.replace("/login");
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setErrorMessage(null);

    if (!formState.categoryId || !formState.accountId) {
      setErrorMessage("Выберите категорию и счет.");
      return;
    }

    if (!selectedCategory || selectedCategory.disabled) {
      setErrorMessage("Категория недоступна.");
      return;
    }

    if (!selectedAccount) {
      setErrorMessage("Счет недоступен.");
      return;
    }

    const normalizedAmount = formState.amount.replace(",", ".");
    const amountValue = Number(normalizedAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setErrorMessage("Введите корректную сумму.");
      return;
    }

    const direction = directionForCategoryType(selectedCategory.type);
    const type = transactionTypeForCategoryType(selectedCategory.type);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
    const currency: CurrencyCode = selectedAccount.currency ?? mockUser.baseCurrency ?? "UAH";
    const comment = formState.note.trim();

    if (useMocks) {
      const mockTransaction: TransactionDto = {
        id: generateId(),
        date: formState.date,
        category: selectedCategory,
        account: selectedAccount,
        direction,
        type,
        amount: amountValue,
        amountInBase: amountValue,
        currency,
        comment: comment.length > 0 ? comment : null,
      };
      mockTransactions.unshift(mockTransaction);
      notifyTransactionsChanged();
      resetForm();
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        await handleUnauthorized();
        setErrorMessage("Сессия истекла. Войдите снова.");
        return;
      }

      const payload = {
        date: toBackendDateTime(formState.date),
        timezone,
        categoryId: formState.categoryId,
        accountId: formState.accountId,
        direction,
        type,
        changeBalanceId: null,
        amount: amountValue,
        amountInBase: amountValue,
        currency,
        comment: comment.length > 0 ? comment : undefined,
        transfer: null,
      };

      const { data, error: apiError } = await client.POST("/api/v2/transactions" as any, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const status = (apiError as { status?: number } | undefined)?.status;
      if (status === 401) {
        await handleUnauthorized();
        setErrorMessage("Сессия истекла. Войдите снова.");
        return;
      }

      if (apiError || !data) {
        const apiMessage = (apiError as { data?: { message?: string } } | undefined)?.data?.message;
        setErrorMessage(apiMessage ?? "Не удалось сохранить транзакцию.");
        return;
      }

      notifyTransactionsChanged();
      resetForm();
      onClose();
    } catch {
      setErrorMessage("Не удалось сохранить транзакцию.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={onClose}>
            <Text style={styles.modalAction}>Отмена</Text>
          </Pressable>
          <Text variant="subtitle">Добавить транзакцию</Text>
          <View style={styles.modalActionSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.amountRow}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyText}>{mockUser.baseCurrency ?? "UAH"}</Text>
            </View>
            <View style={styles.amountInput}>
              <Text variant="caption">Сумма</Text>
              <Input keyboardType="numeric" value={formState.amount} onChangeText={updateAmount} />
            </View>
          </View>

          <CategoryPickerField
            value={formState.categoryId}
            onChange={handleCategorySelect}
            onResolvedCategoryChange={(category) => setSelectedCategory(category ? toCategory(category) : null)}
            defaultType="EXPENSES"
            placeholder="Выберите категорию"
          />

          <Input
            placeholder="Примечание"
            value={formState.note}
            onChangeText={(value) => setFormState((prev) => ({ ...prev, note: value }))}
          />

          <DateInput
            placeholder="Дата"
            value={formState.date}
            onChange={(value) => setFormState((prev) => ({ ...prev, date: value }))}
          />

          <Select
            placeholder="Счет"
            value={formState.accountId}
            options={accountOptions}
            onChange={(value) => setFormState((prev) => ({ ...prev, accountId: value }))}
          />

          <Pressable style={styles.detailsToggle}>
            <Text style={styles.detailsText}>Добавить детали</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.modalFooter}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <Button
            title={isSaving ? "Сохраняем..." : "Сохранить"}
            size="lg"
            disabled={isSaving}
            onPress={handleSave}
            style={isSaving ? styles.buttonDisabled : undefined}
          />
        </View>

        <AmountKeypad value={formState.amount} onChange={updateAmount} onDone={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modalActionSpacer: {
    width: 60,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  currencyBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  currencyText: {
    fontWeight: "600",
  },
  amountInput: {
    flex: 1,
    gap: spacing.xs,
  },
  detailsToggle: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  detailsText: {
    color: "#2ecc71",
    fontWeight: "600",
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
