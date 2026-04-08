import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, DateInput, Input, ScreenContainer, Select, Text, colors, spacing } from "../../src/shared/ui";
import { useAccounts } from "../../src/features/accounts/useAccounts";
import {
  Account,
  Category,
  CategoryType,
  TransactionDirection,
  TransactionDto,
  TransactionType,
} from "../../src/shared/api/dto";
import { mockUser } from "../../src/shared/mocks";
import { useTransactions } from "../../src/features/transactions/useTransactions";
import { AmountKeypad } from "../../src/features/transactions/components/AmountKeypad";
import { CategoryPickerField } from "../../src/features/categories/components/CategoryPickerField";
import { CategoryIcon } from "../../src/features/categories/components/CategoryIcon";

type TransactionFormState = {
  date: string | null;
  categoryId: string | null;
  accountId: string | null;
  amount: string;
  comment: string;
};

const directionForCategoryType = (type: CategoryType): TransactionDirection =>
  type === "INCOME" ? "INCREASE" : "DECREASE";

const transactionTypeForCategoryType = (type: CategoryType): TransactionType =>
  type === "INCOME" ? "INCOME" : "EXPENSE";

const toCategory = (category: Category): Category => ({
  id: category.id,
  name: category.name,
  type: category.type,
  disabled: category.disabled,
  icon: category.icon ?? null,
});

const toAccount = (account: TransactionDto["account"] | { id?: string; name: string; type: Account["type"]; currency?: Account["currency"] | null } | null | undefined): Account | null => {
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

const formatDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeDateOnly = (value: string) => {
  const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractTimePart = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const matched = value.match(/(\d{2}:\d{2}:\d{2})/);
  return matched ? matched[1] : null;
};

const toBackendDateTime = (date: string, previousDateTime?: string | null) => {
  const [year, month, day] = normalizeDateOnly(date).split("-").map(Number);
  const preservedTime = extractTimePart(previousDateTime);
  const now = new Date();
  const [hours, minutes, seconds] = preservedTime
    ? preservedTime.split(":").map(Number)
    : [now.getHours(), now.getMinutes(), now.getSeconds()];
  const localDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
  );

  return formatDateTime(localDate);
};

export default function EditTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ transaction?: string }>();

  const [initialTransaction, setInitialTransaction] = useState<TransactionDto | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>({
    date: null,
    categoryId: null,
    accountId: null,
    amount: "",
    comment: "",
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { accounts } = useAccounts();
  const { editTransaction, deleteTransaction, error: saveError } = useTransactions();

  useEffect(() => {
    if (!params.transaction) {
      setLocalError("Нет данных о транзакции.");
      return;
    }

    try {
      const decoded = decodeURIComponent(params.transaction);
      const parsed = JSON.parse(decoded) as TransactionDto;
      setInitialTransaction(parsed);
      setFormState({
        date: parsed.date ? normalizeDateOnly(parsed.date) : null,
        categoryId: parsed.category?.id ?? null,
        accountId: parsed.account?.id ?? null,
        amount: String(parsed.amount ?? ""),
        comment: parsed.comment ?? "",
      });
    } catch {
      setLocalError("Не удалось открыть транзакцию.");
    }
  }, [params.transaction]);

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => Boolean(account.id))
        .map((account) => ({ value: account.id!, label: account.name })),
    [accounts],
  );

  const displayedCategory = selectedCategory ?? initialTransaction?.category ?? null;

  const handleCategorySelect = (categoryId: string) => {
    setFormState((prev) => ({ ...prev, categoryId }));
  };

  const handleAmountPress = () => {
    Keyboard.dismiss();
    setIsAmountKeypadOpen(true);
  };

  const updateAmount = (value: string) => {
    setFormState((prev) => ({ ...prev, amount: value }));
  };

  const handleSave = async () => {
    if (!initialTransaction || !initialTransaction.id) {
      setLocalError("Не удалось сохранить транзакцию.");
      return;
    }

    const parsedAmount = Number.parseFloat(formState.amount.replace(",", "."));
    if (Number.isNaN(parsedAmount)) {
      setLocalError("Введите корректную сумму.");
      return;
    }

    const nextAccount =
      toAccount(accounts.find((account) => account.id === formState.accountId)) ??
      toAccount(initialTransaction.account);
    if (!nextAccount) {
      setLocalError("Счет недоступен.");
      return;
    }
    const nextCategory = selectedCategory ? toCategory(selectedCategory) : initialTransaction.category;

    const nextCategoryType = selectedCategory?.type ?? initialTransaction.category?.type ?? "EXPENSES";
    const selectedDate = formState.date ?? normalizeDateOnly(initialTransaction.date);
    const currency = nextAccount.currency ?? initialTransaction.currency ?? mockUser.baseCurrency ?? "UAH";

    const nextTransaction: TransactionDto = {
      ...initialTransaction,
      date: selectedDate,
      account: nextAccount,
      category: nextCategory,
      amount: parsedAmount,
      comment: formState.comment || null,
      direction: directionForCategoryType(nextCategoryType),
      type: transactionTypeForCategoryType(nextCategoryType),
      currency,
    };

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
    const comment = formState.comment.trim();
    const payload = {
      id: initialTransaction.id,
      date: toBackendDateTime(selectedDate, initialTransaction.date),
      timezone,
      categoryId: formState.categoryId ?? initialTransaction.category?.id ?? null,
      accountId: formState.accountId ?? initialTransaction.account?.id ?? null,
      direction: nextTransaction.direction,
      type: nextTransaction.type,
      changeBalanceId: null,
      amount: parsedAmount,
      amountInBase: parsedAmount,
      currency,
      comment: comment.length > 0 ? comment : undefined,
      transfer: null,
    };

    setIsSaving(true);
    setIsAmountKeypadOpen(false);
    setLocalError(null);
    const success = await editTransaction(initialTransaction.id, payload, nextTransaction);
    setIsSaving(false);

    if (success) {
      router.back();
    }
  };

  const handleDelete = () => {
    if (!initialTransaction?.id) {
      setLocalError("Не удалось удалить транзакцию.");
      return;
    }
    const transactionId = initialTransaction.id;

    Alert.alert("Удалить транзакцию?", "Транзакция будет удалена без возможности восстановления.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setIsDeleting(true);
            setIsAmountKeypadOpen(false);
            setLocalError(null);
            const success = await deleteTransaction(transactionId);
            setIsDeleting(false);

            if (success) {
              router.back();
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.modalAction}>Отмена</Text>
          </Pressable>
          <Text variant="subtitle">Редактировать транзакцию</Text>
          <View style={styles.modalActionSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.amountRow}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyText}>{initialTransaction?.currency ?? mockUser.baseCurrency ?? "UAH"}</Text>
            </View>
            <View style={styles.amountInput}>
              <Text variant="caption">Сумма</Text>
              <Pressable onPress={handleAmountPress}>
                <Input
                  keyboardType="numeric"
                  value={formState.amount}
                  onPressIn={handleAmountPress}
                  showSoftInputOnFocus={false}
                  editable={false}
                />
              </Pressable>
            </View>
          </View>

          <Card style={styles.categorySummaryCard}>
            <View style={styles.categorySummaryRow}>
              <View style={styles.categorySummaryIcon}>
                <CategoryIcon name={displayedCategory?.icon} size={34} />
              </View>
              <View style={styles.categorySummaryText}>
                <Text variant="caption">Категория</Text>
                <Text numberOfLines={1} style={styles.categorySummaryName}>
                  {displayedCategory?.name ?? "Без категории"}
                </Text>
              </View>
            </View>
          </Card>

          <CategoryPickerField
            value={formState.categoryId}
            onChange={handleCategorySelect}
            onOpen={() => setIsAmountKeypadOpen(false)}
            onResolvedCategoryChange={(category) => setSelectedCategory(category ? toCategory(category) : null)}
            defaultType={(displayedCategory?.type as CategoryType | undefined) ?? "EXPENSES"}
            displayCategory={
              displayedCategory
                ? {
                    name: displayedCategory.name,
                    icon: displayedCategory.icon ?? null,
                    color: selectedCategory ? null : null,
                  }
                : null
            }
            placeholder="Выберите категорию"
          />

          <Input
            placeholder="Примечание"
            value={formState.comment}
            onFocus={() => setIsAmountKeypadOpen(false)}
            onChangeText={(value) => setFormState((prev) => ({ ...prev, comment: value }))}
          />

          <DateInput
            placeholder="Дата"
            value={formState.date}
            onChange={(value) => {
              setIsAmountKeypadOpen(false);
              setFormState((prev) => ({ ...prev, date: value }));
            }}
          />

          <Select
            placeholder="Счет"
            value={formState.accountId}
            options={accountOptions}
            onChange={(value) => {
              setIsAmountKeypadOpen(false);
              setFormState((prev) => ({ ...prev, accountId: value }));
            }}
          />
        </ScrollView>

        <View style={styles.footer}>
          {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          <Button
            title={isSaving ? "Сохраняем..." : "Сохранить"}
            size="lg"
            disabled={isSaving || isDeleting}
            onPress={() => void handleSave()}
            style={isSaving || isDeleting ? styles.buttonDisabled : undefined}
          />
          <Button
            title={isDeleting ? "Удаляем..." : "Удалить транзакцию"}
            variant="outline"
            tone="danger"
            size="lg"
            disabled={isSaving || isDeleting}
            onPress={handleDelete}
            style={isSaving || isDeleting ? styles.buttonDisabled : undefined}
          />
        </View>
        {isAmountKeypadOpen ? (
          <AmountKeypad
            value={formState.amount}
            onChange={updateAmount}
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
  modalAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modalActionSpacer: {
    width: 60,
  },
  content: {
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
  categorySummaryCard: {
    gap: spacing.xs,
  },
  categorySummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categorySummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  categorySummaryText: {
    flex: 1,
    minWidth: 0,
  },
  categorySummaryName: {
    color: colors.textPrimary,
    fontWeight: "600",
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
  buttonDisabled: {
    opacity: 0.7,
  },
});
