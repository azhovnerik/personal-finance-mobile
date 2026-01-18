import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Chip, Input, ScreenContainer, Text, spacing } from "../src/shared/ui";
import { mockCategoryTree } from "../src/shared/mocks";

const incomeCategories = mockCategoryTree.filter((category) => category.type === "INCOME");
const expenseCategories = mockCategoryTree.filter((category) => category.type === "EXPENSES");

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Категории</Text>
            <Text variant="caption">Доходы и расходы с подкатегориями</Text>
          </View>
          <Button title="Назад" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Добавить категорию</Text>
          <Input placeholder="Название категории" />
          <Input placeholder="Тип (доход/расход)" />
          <Input placeholder="Подкатегория (опционально)" />
          <Button title="Сохранить" />
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Категории дохода</Text>
          <Text variant="caption">Редактирование и удаление</Text>
        </View>
        <View style={styles.list}>
          {incomeCategories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text>{category.name}</Text>
                <View style={styles.actionRow}>
                  <Button title="Изменить" variant="secondary" size="sm" />
                  <Button title="Удалить" variant="ghost" size="sm" />
                </View>
              </View>
              <View style={styles.subcategoryRow}>
                {(category.subcategories ?? []).map((subcategory) => (
                  <Chip key={subcategory.id} label={subcategory.name} />
                ))}
                <Chip label="+ Подкатегория" isActive />
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Категории расхода</Text>
          <Text variant="caption">Группы для планирования бюджета</Text>
        </View>
        <View style={styles.list}>
          {expenseCategories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text>{category.name}</Text>
                <View style={styles.actionRow}>
                  <Button title="Изменить" variant="secondary" size="sm" />
                  <Button title="Удалить" variant="ghost" size="sm" />
                </View>
              </View>
              <View style={styles.subcategoryRow}>
                {(category.subcategories ?? []).map((subcategory) => (
                  <Chip key={subcategory.id} label={subcategory.name} />
                ))}
                <Chip label="+ Подкатегория" isActive />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

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
  formCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  list: {
    gap: spacing.sm,
  },
  categoryCard: {
    gap: spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  subcategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
