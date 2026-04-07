import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { Button, Card, Chip, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";
import { CategoryReactDto, CategoryType } from "../src/shared/api/dto";
import { useCategories } from "../src/features/categories/useCategories";
import {
  findCategoryByPath,
  getCategoryChildren,
  getCategoryChildrenCount,
  getCategoryIcon,
  isCategoryGroup,
} from "../src/features/categories/categoryTree";

const sortByName = (left: CategoryReactDto, right: CategoryReactDto) =>
  left.name.localeCompare(right.name, "uk");

const sortTree = (items: CategoryReactDto[]): CategoryReactDto[] =>
  [...items]
    .sort(sortByName)
    .map((item) => ({
      ...item,
      subcategories: item.subcategories ? sortTree(item.subcategories) : item.subcategories,
    }));

const flattenLeaves = (items: CategoryReactDto[]): CategoryReactDto[] =>
  items.flatMap((item) => {
    if (isCategoryGroup(item) && getCategoryChildren(item).length > 0) {
      return flattenLeaves(getCategoryChildren(item));
    }
    return [item];
  });

type CategoriesScreenProps = {
  showBackButton?: boolean;
};

export function CategoriesScreen({ showBackButton = true }: CategoriesScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; path?: string }>();
  const [selectedType, setSelectedType] = useState<CategoryType>("EXPENSES");
  const [navigationStack, setNavigationStack] = useState<string[]>([]);

  const { categories, isLoading, isRefreshing, error, refresh } = useCategories({ type: selectedType });

  const sortedCategories = useMemo(() => sortTree(categories), [categories]);

  const leafCount = useMemo(
    () => flattenLeaves(sortedCategories).length,
    [sortedCategories],
  );

  const currentLevel = useMemo(() => {
    const { parent, children } = findCategoryByPath(sortedCategories, navigationStack);
    return {
      currentParent: parent,
      visibleCategories: children,
    };
  }, [navigationStack, sortedCategories]);

  const { currentParent, visibleCategories } = currentLevel;

  useEffect(() => {
    const routeType = params.type === "INCOME" || params.type === "EXPENSES" ? params.type : null;
    const routePath = typeof params.path === "string" && params.path.trim()
      ? params.path.split(",").filter(Boolean)
      : null;

    if (routeType) {
      setSelectedType(routeType);
    }
    if (routePath) {
      setNavigationStack(routePath);
    }
  }, [params.path, params.type]);

  const currentLevelTitle = useMemo(() => {
    if (navigationStack.length === 0) {
      return selectedType === "EXPENSES" ? "Расходы" : "Доходы";
    }
    return currentParent?.name ?? (selectedType === "EXPENSES" ? "Расходы" : "Доходы");
  }, [currentParent?.name, navigationStack.length, selectedType]);

  const openCategoryLevel = (item: CategoryReactDto) => {
    if (navigationStack.length >= 1) {
      return;
    }
    if (!isCategoryGroup(item) || getCategoryChildren(item).length === 0) {
      return;
    }
    setNavigationStack((prev) => [...prev, item.id]);
  };

  const goBackLevel = () => {
    setNavigationStack((prev) => prev.slice(0, -1));
  };

  const openCreateScreen = () => {
    router.push({
      pathname: "/category-edit",
      params: {
        mode: "create",
        type: selectedType,
        parentId: currentParent?.id ?? "",
        parentName: currentParent?.name ?? "",
        parentPath: navigationStack.join(","),
      },
    });
  };

  const openEditScreen = (item: CategoryReactDto) => {
    const categoryPath = [...navigationStack, item.id].join(",");
    router.push({
      pathname: "/category-edit",
      params: {
        mode: "edit",
        category: encodeURIComponent(JSON.stringify(item)),
        parentId: currentParent?.id ?? "",
        parentName: currentParent?.name ?? "",
        categoryPath,
      },
    });
  };

  const renderCategoryRow = (item: CategoryReactDto) => {
    const isGroup = isCategoryGroup(item);
    const canDrillDown = isGroup && navigationStack.length < 1;
    const childrenCount = getCategoryChildrenCount(item);
    return (
      <View key={item.id} style={[styles.treeRow, isGroup ? styles.groupRow : styles.categoryRow]}>
        <Pressable
          style={styles.treePressArea}
          onPress={() => {
            if (canDrillDown) {
              openCategoryLevel(item);
              return;
            }
            openEditScreen(item);
          }}
        >
          <View style={styles.treeMain}>
            <View style={[styles.categoryIcon, isGroup ? styles.groupIcon : undefined]}>
              <Text style={styles.categoryIconText}>{isGroup ? "▦" : getCategoryIcon(item.icon)}</Text>
            </View>
            <View style={styles.treeTextColumn}>
              <Text style={[styles.treeName, isGroup ? styles.groupName : undefined]}>{item.name}</Text>
              {isGroup ? (
                <Text style={styles.groupHint}>{childrenCount} категорий</Text>
              ) : null}
            </View>
            {isGroup ? <Chip label="Группа" /> : null}
            {item.disabled ? <Chip label="Disabled" /> : null}
          </View>
        </Pressable>
        {canDrillDown ? (
          <Pressable style={styles.editButton} onPress={() => openEditScreen(item)}>
            <Text style={styles.editButtonText}>⋯</Text>
          </Pressable>
        ) : (
          <View style={styles.leafDot} />
        )}
        {canDrillDown ? (
          <Pressable style={styles.drillButton} onPress={() => openCategoryLevel(item)}>
            <Text style={styles.treeChevron}>›</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const onSwitchType = (type: CategoryType) => {
    setSelectedType(type);
    setNavigationStack([]);
  };

  const canCreateInCurrentLevel = navigationStack.length <= 1;

  const renderCategoriesList = () => {
    if (isLoading) {
      return <Text variant="caption">Загрузка категорий...</Text>;
    }

    if (!isLoading && error) {
      return (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Повторить" size="sm" onPress={() => void refresh()} />
        </View>
      );
    }

    if (!isLoading && !error && visibleCategories.length === 0) {
      return <Text variant="caption">Категории не найдены.</Text>;
    }

    return (
      <View style={styles.treeList}>
        {navigationStack.length > 0 ? (
          <Pressable style={styles.levelBackRow} onPress={goBackLevel}>
            <Text style={styles.levelBackText}>‹ Назад</Text>
            <Text style={styles.levelBackHint}>{currentLevelTitle}</Text>
          </Pressable>
        ) : null}
        {visibleCategories.map((category) => renderCategoryRow(category))}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <View>
            <Text variant="title">Категории</Text>
            <Text variant="caption">Runtime дерево категорий</Text>
          </View>
          {showBackButton ? (
            <Button title="Назад" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
          ) : null}
        </View>

        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tabItem, selectedType === "EXPENSES" ? styles.tabItemActive : undefined]}
            onPress={() => onSwitchType("EXPENSES")}
          >
            <Text style={selectedType === "EXPENSES" ? styles.tabTextActive : styles.tabText}>Расходы</Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, selectedType === "INCOME" ? styles.tabItemActive : undefined]}
            onPress={() => onSwitchType("INCOME")}
          >
            <Text style={selectedType === "INCOME" ? styles.tabTextActive : styles.tabText}>Доходы</Text>
          </Pressable>
        </View>

        <Card style={styles.crudCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text variant="subtitle">Новая категория</Text>
              <Text variant="caption">
                {canCreateInCurrentLevel
                  ? currentParent
                    ? `Родитель: ${currentParent.name}`
                    : "Корневой уровень"
                  : "Максимальная глубина категорий — 2 уровня"}
              </Text>
            </View>
            {canCreateInCurrentLevel ? (
              <Button title="Создать" size="sm" variant="outline" onPress={openCreateScreen} />
            ) : null}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">{currentLevelTitle}</Text>
            <Chip label={`${leafCount} leaf`} />
          </View>
          {renderCategoriesList()}
        </Card>
      </ScrollView>

    </ScreenContainer>
  );
}

export default CategoriesScreen;

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionCard: {
    gap: spacing.sm,
  },
  crudCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  tabsRow: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.heading,
    fontWeight: "700",
  },
  errorState: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  treeList: {
    gap: spacing.xs,
  },
  levelBackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  levelBackText: {
    color: colors.primary,
    fontWeight: "600",
  },
  levelBackHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  treeRow: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: spacing.xs,
  },
  categoryRow: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupRow: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  treePressArea: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.sm,
  },
  treeMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  treeTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  groupIcon: {
    backgroundColor: colors.primary,
  },
  categoryIconText: {
    fontSize: 15,
    color: colors.surface,
  },
  treeName: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
  groupName: {
    fontWeight: "700",
  },
  groupHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  treeChevron: {
    color: colors.textSecondary,
    fontSize: 18,
    paddingRight: spacing.xs,
  },
  editButton: {
    minHeight: 48,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  drillButton: {
    minHeight: 48,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: "700",
  },
  leafDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
  },
});
