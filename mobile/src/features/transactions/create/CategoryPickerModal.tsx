import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, colors, spacing } from "../../../shared/ui";
import { CategoryReactDto, CategoryType } from "../../../shared/api/dto";
import {
  findCategoryByPath,
  findCategoryInTree,
  getCategoryChildren,
  getCategoryChildrenCount,
  isCategoryGroup,
  isCategorySelectable,
} from "../../categories/categoryTree";

type CategoryPickerModalProps = {
  visible: boolean;
  categories: CategoryReactDto[];
  flatCategories: CategoryReactDto[];
  topCategories: CategoryReactDto[];
  iconForCategory: (icon: string) => string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  defaultType?: CategoryType;
  showTypeSwitch?: boolean;
  preferFlatList?: boolean;
};

export const CategoryPickerModal = ({
  visible,
  categories,
  flatCategories,
  topCategories,
  iconForCategory,
  onClose,
  onSelect,
  defaultType = "EXPENSES",
  showTypeSwitch = true,
  preferFlatList = false,
}: CategoryPickerModalProps) => {
  const insets = useSafeAreaInsets();
  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<CategoryType>(defaultType);

  const matchesSelectedType = (category: CategoryReactDto) => {
    const rawType = String(category.type).toUpperCase();
    const normalizedCategoryType = rawType === "EXPENSE" ? "EXPENSES" : rawType;
    return normalizedCategoryType === selectedType;
  };

  useEffect(() => {
    if (visible) {
      setSelectedType(defaultType);
      setNavigationStack([]);
      return;
    }
    if (!visible) {
      setNavigationStack([]);
    }
  }, [defaultType, visible]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => matchesSelectedType(category)),
    [categories, selectedType],
  );

  const filteredFlatCategories = useMemo(
    () => flatCategories.filter((category) => matchesSelectedType(category)),
    [flatCategories, selectedType],
  );

  const filteredTopCategories = useMemo(
    () => topCategories.filter((category) => matchesSelectedType(category)),
    [topCategories, selectedType],
  );

  const visibleCategories = useMemo(() => {
    if (preferFlatList) {
      return filteredFlatCategories;
    }
    if (navigationStack.length === 0) {
      return filteredCategories.length > 0 ? filteredCategories : filteredFlatCategories;
    }
    return findCategoryByPath(filteredCategories, navigationStack).children;
  }, [filteredCategories, filteredFlatCategories, navigationStack, preferFlatList]);

  const activeCategory = useMemo(
    () => findCategoryByPath(filteredCategories, navigationStack).parent,
    [filteredCategories, navigationStack],
  );

  const handleCategoryPress = (categoryId: string) => {
    const category = findCategoryInTree(filteredCategories, categoryId) ?? filteredFlatCategories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    if (isCategoryGroup(category) && getCategoryChildren(category).length > 0 && !preferFlatList) {
      setNavigationStack((prev) => [...prev, categoryId]);
      return;
    }

    if (isCategorySelectable(category)) {
      onSelect(category.id);
      onClose();
    }
  };

  const handleBack = () => {
    if (navigationStack.length > 0) {
      setNavigationStack((prev) => prev.slice(0, -1));
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.categoryOverlay}>
        <SafeAreaView style={styles.categoryModal}>
          <View style={[styles.categoryHeader, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={handleBack}>
              <Text style={styles.modalAction}>Назад</Text>
            </Pressable>
            <Text variant="subtitle">{activeCategory?.name ?? "Категории"}</Text>
            <Pressable>
              <Text style={styles.modalAction}>Редактировать</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.categoryContent} showsVerticalScrollIndicator={false}>
            {navigationStack.length === 0 ? (
              <>
              <Text style={styles.sectionTitle}>Самые частые</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topCategoryRow}>
                {filteredTopCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.topCategoryItem}
                    onPress={() => handleCategoryPress(category.id)}
                  >
                    <View style={[styles.topCategoryIcon, { backgroundColor: category.color ?? colors.border }]}>
                      <Text style={styles.categoryIconText}>{iconForCategory(category.icon ?? "default")}</Text>
                    </View>
                    <Text style={styles.topCategoryLabel} numberOfLines={2}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {showTypeSwitch ? (
                <View style={styles.typeSwitchWrap}>
                  <Pressable
                    style={[styles.typeSwitchButton, selectedType === "EXPENSES" && styles.typeSwitchButtonActive]}
                    onPress={() => {
                      setSelectedType("EXPENSES");
                      setNavigationStack([]);
                    }}
                  >
                    <Text style={selectedType === "EXPENSES" ? styles.typeSwitchTextActive : styles.typeSwitchText}>
                      Расход
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.typeSwitchButton, selectedType === "INCOME" && styles.typeSwitchButtonActive]}
                    onPress={() => {
                      setSelectedType("INCOME");
                      setNavigationStack([]);
                    }}
                  >
                    <Text style={selectedType === "INCOME" ? styles.typeSwitchTextActive : styles.typeSwitchText}>
                      Доход
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              </>
            ) : null}

            <Text style={styles.sectionTitle}>{navigationStack.length > 0 ? "Подкатегории" : "Все категории"}</Text>
            <View style={styles.categoryList}>
              {visibleCategories.map((category) => {
                const isGroup = isCategoryGroup(category);
                const childCount = getCategoryChildrenCount(category);
                return (
                  <Pressable
                    key={category.id}
                    style={[styles.categoryRow, isGroup ? styles.groupRow : undefined]}
                    onPress={() => handleCategoryPress(category.id)}
                  >
                    <View style={[styles.categoryIcon, isGroup ? styles.groupIcon : { backgroundColor: category.color ?? colors.border }]}>
                      <Text style={styles.categoryIconText}>{isGroup ? "▦" : iconForCategory(category.icon ?? "default")}</Text>
                    </View>
                    <View style={styles.categoryLabelColumn}>
                      <Text style={[styles.categoryLabel, isGroup ? styles.groupLabel : undefined]}>{category.name}</Text>
                      {isGroup ? <Text style={styles.groupHint}>{childCount} категорий</Text> : null}
                    </View>
                    {isGroup ? <Text style={styles.categoryChevron}>›</Text> : null}
                  </Pressable>
                );
              })}
              {visibleCategories.length === 0 ? (
                <Text style={styles.emptyText}>Категории не найдены для выбранного типа.</Text>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceMuted,
    zIndex: 10,
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  typeSwitchWrap: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  typeSwitchButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeSwitchText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  typeSwitchTextActive: {
    color: colors.surface,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 12,
  },
  topCategoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  topCategoryItem: {
    width: 84,
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "flex-start",
  },
  topCategoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  topCategoryLabel: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 30,
    width: "100%",
  },
  categoryList: {
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupRow: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primary,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  groupIcon: {
    backgroundColor: colors.primary,
  },
  categoryIconText: {
    fontSize: 16,
    color: colors.surface,
  },
  categoryLabelColumn: {
    flex: 1,
    minWidth: 0,
  },
  categoryLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  groupLabel: {
    fontWeight: "700",
  },
  groupHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  categoryChevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
