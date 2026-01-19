import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  DateInput,
  Input,
  Select,
  Text,
  colors,
  spacing,
} from "../../src/shared/ui";
import { mockAccounts, mockTransactions, mockUser } from "../../src/shared/mocks";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    amount: "0",
    categoryId: null as string | null,
    note: "",
    date: "2026-01-19",
    accountId: null as string | null,
  });

  const accountOptions = useMemo(() => {
    return mockAccounts.map((account) => ({ value: account.id, label: account.name }));
  }, []);

  const categories = useMemo(
    () => [
      {
        id: "cat-food",
        name: "Еда и напитки",
        icon: "food",
        color: "#f4543a",
        subcategories: [
          { id: "cat-food-cafe", name: "Кафе и рестораны", icon: "food", color: "#f4543a" },
          { id: "cat-food-groceries", name: "Продукты", icon: "basket", color: "#f4543a" },
        ],
      },
      {
        id: "cat-shopping",
        name: "Покупки",
        icon: "bag",
        color: "#4aa8ff",
        subcategories: [
          { id: "cat-shopping-home", name: "Дом и быт", icon: "home", color: "#4aa8ff" },
          { id: "cat-shopping-clothes", name: "Одежда", icon: "shirt", color: "#4aa8ff" },
        ],
      },
      {
        id: "cat-home",
        name: "Жильё",
        icon: "home",
        color: "#f5a524",
        subcategories: [
          { id: "cat-home-rent", name: "Аренда", icon: "home", color: "#f5a524" },
          { id: "cat-home-utility", name: "Коммунальные", icon: "home", color: "#f5a524" },
        ],
      },
      {
        id: "cat-transport",
        name: "Транспорт",
        icon: "car",
        color: "#9aa3b2",
        subcategories: [
          { id: "cat-transport-taxi", name: "Такси", icon: "car", color: "#9aa3b2" },
          { id: "cat-transport-fuel", name: "Топливо", icon: "fuel", color: "#9aa3b2" },
        ],
      },
      {
        id: "cat-income",
        name: "Доходы",
        icon: "finance",
        color: "#22c55e",
        subcategories: [
          { id: "cat-income-salary", name: "Зарплата", icon: "finance", color: "#22c55e" },
          { id: "cat-income-freelance", name: "Фриланс", icon: "finance", color: "#22c55e" },
        ],
      },
      {
        id: "cat-auto",
        name: "Автомобиль",
        icon: "auto",
        color: "#a855f7",
        subcategories: [
          { id: "cat-auto-service", name: "Сервис", icon: "auto", color: "#a855f7" },
          { id: "cat-auto-insurance", name: "Страховка", icon: "auto", color: "#a855f7" },
        ],
      },
      {
        id: "cat-fun",
        name: "Жизнь и развлечения",
        icon: "party",
        color: "#84cc16",
      },
      {
        id: "cat-communication",
        name: "Связь, ПК",
        icon: "tech",
        color: "#6366f1",
      },
      {
        id: "cat-finance",
        name: "Финансовые расходы",
        icon: "finance",
        color: "#14b8a6",
      },
    ],
    [],
  );

  const flatCategories = useMemo(() => {
    return categories.flatMap((category) => {
      if (!category.subcategories) {
        return [category];
      }
      return [category, ...category.subcategories];
    });
  }, [categories]);

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

  const selectedCategory = useMemo(() => {
    return flatCategories.find((category) => category.id === formState.categoryId) ?? null;
  }, [flatCategories, formState.categoryId]);

  const activeCategory = useMemo(() => {
    return categories.find((category) => category.id === activeCategoryId) ?? null;
  }, [activeCategoryId, categories]);

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

  const handleCategoryPress = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (category?.subcategories?.length) {
      setActiveCategoryId(categoryId);
      setIsSubcategoryOpen(true);
      return;
    }
    const fallbackCategory = flatCategories.find((item) => item.id === categoryId);
    if (fallbackCategory) {
      setFormState((prev) => ({ ...prev, categoryId: fallbackCategory.id }));
    }
    setIsCategoryOpen(false);
  };

  const handleSubcategoryPress = (subcategoryId: string) => {
    setFormState((prev) => ({ ...prev, categoryId: subcategoryId }));
    setIsSubcategoryOpen(false);
    setIsCategoryOpen(false);
  };

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

  const keypadRows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", "000", "."],
  ];

  return (
    <>
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Главная" }} />
          <Tabs.Screen name="transactions" options={{ title: "Транзакции" }} />
          <Tabs.Screen
            name="add"
            options={{
              title: "",
              tabBarLabel: "",
              tabBarButton: () => (
                <Pressable style={styles.addButtonWrapper} onPress={() => setIsAddOpen(true)}>
                  <View style={styles.addButton}>
                    <Text style={styles.addButtonLabel}>+</Text>
                  </View>
                </Pressable>
              ),
            }}
          />
          <Tabs.Screen name="budgets" options={{ title: "Бюджеты" }} />
          <Tabs.Screen name="accounts" options={{ title: "Счета" }} />
          <Tabs.Screen name="more" options={{ title: "Ещё" }} />
        </Tabs>
      </View>

      <Modal animationType="slide" transparent={false} visible={isAddOpen} onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={() => setIsAddOpen(false)}>
              <Text style={styles.modalAction}>Отмена</Text>
            </Pressable>
            <Text variant="subtitle">Добавить транзакцию</Text>
            <View style={styles.modalActionSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.amountRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>{mockUser.baseCurrency ?? "UAH"}</Text>
              </View>
              <View style={styles.amountInput}>
                <Text variant="caption">Сумма</Text>
                <Input
                  keyboardType="numeric"
                  value={formState.amount}
                  onChangeText={updateAmount}
                />
              </View>
            </View>

            <Pressable style={styles.categoryField} onPress={() => setIsCategoryOpen(true)}>
              <View style={[styles.categoryIcon, { backgroundColor: selectedCategory?.color ?? colors.border }]}>
                <Text style={styles.categoryIconText}>
                  {iconForCategory(selectedCategory?.icon ?? "default")}
                </Text>
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
            <Button title="Сохранить" size="lg" onPress={() => setIsAddOpen(false)} />
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
            {keypadRows.map((row) => (
              <View key={row.join("-")} style={styles.keypadRow}>
                {row.map((key) => {
                  const onPress =
                    key === "."
                      ? appendDecimal
                      : () => {
                          appendDigit(key);
                        };
                  return (
                    <Pressable key={key} style={styles.keypadKey} onPress={onPress}>
                      <Text style={styles.keypadKeyText}>{key}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Pressable style={[styles.keypadKey, styles.keypadDone]} onPress={() => setIsAddOpen(false)}>
              <Text style={[styles.keypadKeyText, styles.keypadDoneText]}>ГОТОВО</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isCategoryOpen}
        onRequestClose={() => setIsCategoryOpen(false)}
      >
        <SafeAreaView style={styles.categoryModal}>
          <View style={styles.categoryHeader}>
            <Pressable onPress={() => setIsCategoryOpen(false)}>
              <Text style={styles.modalAction}>Назад</Text>
            </Pressable>
            <Text variant="subtitle">Категории</Text>
            <Pressable>
              <Text style={styles.modalAction}>Редактировать</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.categoryContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Самые частые</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topCategoryRow}>
              {topCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.topCategoryItem}
                  onPress={() => handleCategoryPress(category.id)}
                >
                  <View style={[styles.topCategoryIcon, { backgroundColor: category.color }]}>
                    <Text style={styles.categoryIconText}>{iconForCategory(category.icon)}</Text>
                  </View>
                  <Text style={styles.topCategoryLabel} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Все категории</Text>
            <View style={styles.categoryList}>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.categoryRow}
                  onPress={() => handleCategoryPress(category.id)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <Text style={styles.categoryIconText}>{iconForCategory(category.icon)}</Text>
                  </View>
                  <Text style={styles.categoryLabel}>{category.name}</Text>
                  {category.subcategories?.length ? <Text style={styles.categoryChevron}>›</Text> : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isSubcategoryOpen}
        onRequestClose={() => setIsSubcategoryOpen(false)}
      >
        <SafeAreaView style={styles.categoryModal}>
          <View style={styles.categoryHeader}>
            <Pressable onPress={() => setIsSubcategoryOpen(false)}>
              <Text style={styles.modalAction}>Назад</Text>
            </Pressable>
            <Text variant="subtitle">{activeCategory?.name ?? "Подкатегории"}</Text>
            <View style={styles.modalActionSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.categoryContent} showsVerticalScrollIndicator={false}>
            <View style={styles.categoryList}>
              {activeCategory?.subcategories?.map((subcategory) => (
                <Pressable
                  key={subcategory.id}
                  style={styles.categoryRow}
                  onPress={() => handleSubcategoryPress(subcategory.id)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: subcategory.color }]}>
                    <Text style={styles.categoryIconText}>{iconForCategory(subcategory.icon)}</Text>
                  </View>
                  <Text style={styles.categoryLabel}>{subcategory.name}</Text>
                </Pressable>
              )) ?? null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    height: 74,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  addButtonWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2ecc71",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addButtonLabel: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
  },
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
  categoryModal: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  topCategoryRow: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  topCategoryItem: {
    width: 72,
    alignItems: "center",
    gap: spacing.xs,
  },
  topCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  topCategoryLabel: {
    fontSize: 12,
    textAlign: "center",
    color: colors.textPrimary,
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
