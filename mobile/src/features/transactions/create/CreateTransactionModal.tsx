import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, DateInput, Input, Select, Text, colors, spacing } from "../../../shared/ui";
import { mockTransactions, mockUser } from "../../../shared/mocks";
import { useAccounts } from "../../accounts/useAccounts";
import { useCategories } from "../../categories/useCategories";
import {
  CategoryReactDto,
  CategoryType,
  CurrencyCode,
  TransactionDirection,
  TransactionDto,
  TransactionType,
} from "../../../shared/api/dto";
import client from "../../../shared/lib/api/client";
import { notifyTransactionsChanged } from "../../../shared/lib/events/transactions";
import { getToken, removeToken } from "../../../storage/auth";

import { CategoryPickerModal } from "./CategoryPickerModal";

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

const KEYPAD_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0", "000", "."],
];

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

const iconForCategory = (icon: string) => {
  switch (icon) {
    case "basket":
      return "🛒";
    case "food":
      return "🍽️";
    case "bag":
      return "🛍️";
    case "home":
      return "🏠";
    case "car":
      return "🚕";
    case "fuel":
      return "⛽";
    case "auto":
      return "🚗";
    case "party":
      return "🎉";
    case "tech":
      return "💻";
    case "finance":
      return "💸";
    case "shirt":
      return "👕";
    default:
      return "💰";
  }
};

const flattenCategories = (categories: CategoryReactDto[]) =>
  categories.flatMap((category) => (category.subcategories ? [category, ...category.subcategories] : [category]));

export const CreateTransactionModal = ({ visible, onClose }: CreateTransactionModalProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [formState, setFormState] = useState<TransactionFormState>(() => getInitialFormState());
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const useMocks = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";

  const { accounts } = useAccounts();
  const { categories, refresh } = useCategories({ type: "EXPENSES" }, { enabled: isCategoryPickerOpen });

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts]
  );

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  const categoryFrequency = useMemo(() => {
    const counts = new Map<string, number>();
    mockTransactions.forEach((transaction) => {
      counts.set(transaction.category.name, (counts.get(transaction.category.name) ?? 0) + 1);
    });
    return counts;
  }, []);

  const topCategories = useMemo(() => {
    const sorted = [...flatCategories].sort((a, b) => {
      const countA = categoryFrequency.get(a.name) ?? 0;
      const countB = categoryFrequency.get(b.name) ?? 0;
      return countB - countA;
    });
    return sorted.slice(0, 5);
  }, [categoryFrequency, flatCategories]);

  const selectedCategory = useMemo(
    () => flatCategories.find((category) => category.id === formState.categoryId) ?? null,
    [flatCategories, formState.categoryId]
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === formState.accountId) ?? null,
    [accounts, formState.accountId],
  );

  const updateAmount = (value: string) => {
    setFormState((prev) => ({ ...prev, amount: value }));
  };

  const appendDigit = (value: string) => {
    setFormState((prev) => {
      const next = prev.amount === "0" ? value : `${prev.amount}${value}`;
      return { ...prev, amount: next };
    });
  };

  const appendDecimal = () => {
    setFormState((prev) => {
      if (prev.amount.includes(".")) {
        return prev;
      }
      return { ...prev, amount: `${prev.amount}.` };
    });
  };

  const clearAmount = () => {
    updateAmount("0");
  };

  const deleteLast = () => {
    setFormState((prev) => {
      const next = prev.amount.length > 1 ? prev.amount.slice(0, -1) : "0";
      return { ...prev, amount: next };
    });
  };

  const handleOpenCategoryPicker = () => {
    Keyboard.dismiss();
    setIsCategoryPickerOpen(true);
    void refresh();
  };

  const handleCloseCategoryPicker = () => {
    setIsCategoryPickerOpen(false);
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormState((prev) => ({ ...prev, categoryId }));
  };

  const resetForm = () => {
    setFormState(getInitialFormState());
    setIsCategoryPickerOpen(false);
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

          <Pressable style={styles.categoryField} onPress={handleOpenCategoryPicker}>
            <View style={[styles.categoryIcon, { backgroundColor: selectedCategory?.color ?? colors.border }]}>
              <Text style={styles.categoryIconText}>{iconForCategory(selectedCategory?.icon ?? "default")}</Text>
            </View>
            <View style={styles.categoryLabelWrapper}>
              <Text style={selectedCategory ? styles.categoryLabel : styles.categoryPlaceholder}>
                {selectedCategory?.name ?? "Выберите категорию"}
              </Text>
            </View>
            <Text style={styles.categoryChevron}>›</Text>
          </Pressable>

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

        <View style={styles.keypad}>
          <View style={styles.keypadTopRow}>
            <Text style={styles.keypadPreview}>{formState.amount}</Text>
            <View style={styles.keypadTopActions}>
              <Pressable style={[styles.keypadAction, styles.keypadClear]} onPress={clearAmount}>
                <Text style={styles.keypadActionText}>C</Text>
              </Pressable>
              <Pressable style={[styles.keypadAction, styles.keypadDelete]} onPress={deleteLast}>
                <Text style={styles.keypadActionText}>⌫</Text>
              </Pressable>
            </View>
          </View>
          {KEYPAD_ROWS.map((row) => (
            <View key={row.join("-")} style={styles.keypadRow}>
              {row.map((key) => {
                const onPress = key === "." ? appendDecimal : () => appendDigit(key);
                return (
                  <Pressable key={key} style={styles.keypadKey} onPress={onPress}>
                    <Text style={styles.keypadKeyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Pressable style={[styles.keypadKey, styles.keypadDone]} onPress={onClose}>
            <Text style={[styles.keypadKeyText, styles.keypadDoneText]}>ГОТОВО</Text>
          </Pressable>
        </View>

        <CategoryPickerModal
          visible={isCategoryPickerOpen}
          categories={categories}
          flatCategories={flatCategories}
          topCategories={topCategories}
          iconForCategory={iconForCategory}
          onClose={handleCloseCategoryPicker}
          onSelect={handleCategorySelect}
        />
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
  categoryField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: {
    fontSize: 16,
  },
  categoryLabelWrapper: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryPlaceholder: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  categoryChevron: {
    fontSize: 20,
    color: colors.textSecondary,
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
  keypad: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#1f1f1f",
    padding: spacing.md,
    gap: spacing.sm,
  },
  keypadTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  keypadTopActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  keypadPreview: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "600",
  },
  keypadAction: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  keypadClear: {
    backgroundColor: "#2a2a2a",
  },
  keypadDelete: {
    backgroundColor: "#2f2f2f",
  },
  keypadActionText: {
    color: "#38d169",
    fontWeight: "700",
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  keypadKey: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyText: {
    color: "#38d169",
    fontSize: 18,
    fontWeight: "600",
  },
  keypadDone: {
    marginTop: spacing.sm,
    backgroundColor: "#38d169",
  },
  keypadDoneText: {
    color: colors.surface,
    fontWeight: "700",
  },
});
