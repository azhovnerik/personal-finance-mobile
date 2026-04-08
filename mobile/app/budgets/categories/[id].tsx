import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../../src/shared/ui";
import { BudgetCategoryDetailedDto, CurrencyCode } from "../../../src/shared/api/dto";
import { formatCurrency } from "../../../src/shared/utils/format";
import { useBudgetCategoryActions, useBudgetDetails } from "../../../src/features/budgets/useBudgets";
import { AmountKeypad } from "../../../src/features/transactions/components/AmountKeypad";
import { CategoryIcon } from "../../../src/features/categories/components/CategoryIcon";

const resolveAmount = (value?: number | null, fallback?: number | null) => value ?? fallback ?? 0;

const renderCategoryName = (item: BudgetCategoryDetailedDto) => {
  const name = item.category?.name ?? "Без названия";
  return name;
};

export default function BudgetCategoryDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; budgetId?: string }>();
  const categoryId = typeof params.id === "string" ? params.id : undefined;
  const budgetId = typeof params.budgetId === "string" ? params.budgetId : undefined;

  const { budget, isLoading, isRefreshing, error, refresh } = useBudgetDetails(budgetId);
  const { updateCategory, deleteCategory, isUpdating, isDeleting, error: mutationError } = useBudgetCategoryActions();

  const targetCategory = useMemo(() => {
    if (!budget || !categoryId) {
      return null;
    }
    const income = budget.incomeBudgetCategories ?? [];
    const expense = budget.expenseBudgetCategories ?? [];
    return [...income, ...expense].find((item) => item.id === categoryId) ?? null;
  }, [budget, categoryId]);

  const [planAmountInput, setPlanAmountInput] = useState("0");
  const [commentInput, setCommentInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);

  useEffect(() => {
    if (!targetCategory) {
      return;
    }
    const initialAmount = resolveAmount(targetCategory.planAmountOriginal, targetCategory.planAmount);
    setPlanAmountInput(String(initialAmount));
    setCommentInput(targetCategory.comment ?? "");
  }, [targetCategory]);

  const baseCurrency = (budget?.baseCurrency ?? "UAH") as CurrencyCode;
  const categoryCurrency = (targetCategory?.currency ?? baseCurrency) as CurrencyCode;
  const factAmount = resolveAmount(targetCategory?.factAmountInBase, targetCategory?.factAmount);
  const leftover = resolveAmount(targetCategory?.leftoverInBase, targetCategory?.leftover);

  const parsePlanAmount = () => {
    const normalized = planAmountInput.replace(",", ".").trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  };

  const updateAmount = (value: string) => {
    setPlanAmountInput(value);
  };

  const onSave = async () => {
    if (!budgetId || !targetCategory || !targetCategory.id) {
      return;
    }

    const parsedAmount = parsePlanAmount();
    if (parsedAmount === null) {
      setFormError("Введите корректную плановую сумму больше 0.");
      return;
    }

    try {
      setFormError(null);
      await updateCategory({
        budgetId,
        category: targetCategory,
        amount: parsedAmount,
        comment: commentInput.trim() || null,
      });
      router.back();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось обновить бюджетную категорию.");
    }
  };

  const onDelete = () => {
    if (!budgetId || !targetCategory || !targetCategory.id) {
      return;
    }

    Alert.alert("Удалить категорию?", "Категория будет удалена из бюджета этого месяца.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setFormError(null);
              await deleteCategory({ budgetId, category: targetCategory });
              router.back();
            } catch (error) {
              setFormError(error instanceof Error ? error.message : "Не удалось удалить бюджетную категорию.");
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Назад</Text>
          </Pressable>
          <Text variant="heading">Категория бюджета</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? <Text variant="caption">Загрузка...</Text> : null}

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Повторить" size="sm" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {!isLoading && !error && !budgetId ? (
          <Card>
            <Text variant="caption">Не передан budgetId.</Text>
          </Card>
        ) : null}

        {!isLoading && !error && budgetId && !targetCategory ? (
          <Card>
            <Text variant="caption">Категория не найдена в бюджете.</Text>
          </Card>
        ) : null}

        {targetCategory ? (
          <>
            <Card style={styles.infoCard}>
              <View style={styles.categoryHeaderRow}>
                <View style={styles.categoryIcon}>
                  <CategoryIcon name={targetCategory.category?.icon} size={36} />
                </View>
                <Text numberOfLines={1} variant="subtitle" style={styles.categoryTitle}>
                  {renderCategoryName(targetCategory)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text>Тип</Text>
                <Text>{targetCategory.type === "INCOME" ? "Доход" : "Расход"}</Text>
              </View>
              <View style={styles.row}>
                <Text>Факт</Text>
                <Text>{formatCurrency(factAmount, categoryCurrency)}</Text>
              </View>
              <View style={styles.row}>
                <Text>Остаток</Text>
                <Text style={leftover < 0 ? styles.errorText : undefined}>{formatCurrency(leftover, categoryCurrency)}</Text>
              </View>
            </Card>

            <Card style={styles.formCard}>
              <Text variant="subtitle">Редактирование</Text>
              <View style={styles.field}>
                <Text variant="caption">Плановая сумма ({categoryCurrency})</Text>
                <Pressable onPress={() => setIsAmountKeypadOpen(true)}>
                  <Input
                    value={planAmountInput}
                    keyboardType="numeric"
                    placeholder="0"
                    onPressIn={() => setIsAmountKeypadOpen(true)}
                    showSoftInputOnFocus={false}
                    editable={false}
                  />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text variant="caption">Комментарий</Text>
                <Input
                  value={commentInput}
                  onChangeText={setCommentInput}
                  onFocus={() => setIsAmountKeypadOpen(false)}
                  placeholder="Комментарий"
                  multiline
                />
              </View>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              {mutationError ? <Text style={styles.errorText}>{mutationError}</Text> : null}

              <View style={styles.actions}>
                <Button
                  title={isUpdating ? "Сохранение..." : "Сохранить"}
                  onPress={() => void onSave()}
                  disabled={isUpdating || isDeleting}
                />
                <Button
                  title={isDeleting ? "Удаление..." : "Удалить"}
                  variant="outline"
                  tone="danger"
                  onPress={onDelete}
                  disabled={isUpdating || isDeleting}
                />
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
      {isAmountKeypadOpen ? (
        <AmountKeypad value={planAmountInput} onChange={updateAmount} onDone={() => setIsAmountKeypadOpen(false)} />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  errorCard: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  infoCard: {
    gap: spacing.sm,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  categoryTitle: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formCard: {
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
