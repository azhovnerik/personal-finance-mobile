import { CategoryReactDto } from "../../shared/api/dto";

type CategoryTreeNode<TChild = unknown> = {
  subcategories?: TChild[];
  isGroup?: boolean | null;
  selectable?: boolean | null;
  childrenCount?: number | null;
};

export const getCategoryChildren = <T extends CategoryTreeNode<T>>(category: T): T[] => category.subcategories ?? [];

export const getCategoryChildrenCount = (category: CategoryTreeNode) =>
  category.childrenCount ?? category.subcategories?.length ?? 0;

export const isCategoryGroup = (category: CategoryTreeNode) =>
  category.isGroup ?? getCategoryChildrenCount(category) > 0;

export const isCategorySelectable = (category: CategoryTreeNode) =>
  Boolean(category.selectable ?? !isCategoryGroup(category)) && !isCategoryGroup(category);

export const findCategoryInTree = (
  categories: CategoryReactDto[],
  categoryId: string | null | undefined,
): CategoryReactDto | null => {
  if (!categoryId) {
    return null;
  }

  for (const category of categories) {
    if (category.id === categoryId) {
      return category;
    }

    const childMatch = findCategoryInTree(getCategoryChildren(category), categoryId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
};

export const findCategoryByPath = (categories: CategoryReactDto[], path: string[]) => {
  let children = categories;
  let parent: CategoryReactDto | null = null;

  for (const categoryId of path) {
    const match = children.find((category) => category.id === categoryId);
    if (!match) {
      break;
    }

    parent = match;
    children = getCategoryChildren(match);
  }

  return {
    parent,
    children,
  };
};
