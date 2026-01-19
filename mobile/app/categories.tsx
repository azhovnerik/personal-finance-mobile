import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";
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
            <Text variant="title">Categories</Text>
            <Text variant="caption">Manage income and expense groups</Text>
          </View>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Create category</Text>
          <Input placeholder="Category name" />
          <Input placeholder="Type (income/expense)" />
          <Input placeholder="Parent (optional)" />
          <Button title="Create category" />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text variant="subtitle">Income</Text>
              <Chip label="Income" isActive />
            </View>
            <Button title="Create category" variant="outline" tone="primary" size="sm" />
          </View>
          <View style={styles.list}>
            {incomeCategories.map((category) => (
              <View key={category.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <Text>{category.name}</Text>
                  <Button title="Create subcategory" variant="outline" tone="info" size="sm" />
                </View>
                <View style={styles.subcategoryRow}>
                  {(category.subcategories ?? []).map((subcategory) => (
                    <Chip key={subcategory.id} label={subcategory.name} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text variant="subtitle">Expenses</Text>
              <Chip label="Expenses" isActive />
            </View>
            <Button title="Create category" variant="outline" tone="primary" size="sm" />
          </View>
          <View style={styles.list}>
            {expenseCategories.map((category) => (
              <View key={category.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <Text>{category.name}</Text>
                  <Button title="Create subcategory" variant="outline" tone="info" size="sm" />
                </View>
                <View style={styles.subcategoryRow}>
                  {(category.subcategories ?? []).map((subcategory) => (
                    <Chip key={subcategory.id} label={subcategory.name} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>
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
  sectionCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  subcategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
