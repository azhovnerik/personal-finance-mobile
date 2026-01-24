import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import client from "../../shared/lib/api/client";
import { getToken, removeToken } from "../../storage/auth";
import { mockCategories } from "../../shared/mocks";
import { CategoryReactDto, CategoryType } from "../../shared/api/dto";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export type CategoriesFilters = {
    type?: CategoryType | null;
};

export type UseCategoriesOptions = {
    enabled?: boolean;
};

const toQueryFilters = (filters?: CategoriesFilters) => {
    if (!filters) return undefined;

    const query: Record<string, string> = {};
    if (filters.type) query.type = filters.type;

    return Object.keys(query).length > 0 ? query : undefined;
};

type UseCategoriesResult = {
    categories: CategoryReactDto[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

export const useCategories = (filters?: CategoriesFilters, options?: UseCategoriesOptions): UseCategoriesResult => {
    const router = useRouter();
    const useMocks = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";
    const enabled = options?.enabled ?? true;

    const queryParams = useMemo(() => toQueryFilters(filters), [filters]);

    const query = useQuery({
        queryKey: [...CATEGORIES_QUERY_KEY, queryParams ?? {}],
        enabled,
        queryFn: async () => {
            if (useMocks) {
                if (!filters?.type) return mockCategories;
                return mockCategories.filter((category) => category.type === filters.type);
            }

            const token = await getToken();
            if (!token) {
                await removeToken();
                router.replace("/login");
                throw new Error("Сессия истекла. Войдите снова.");
            }

            const { data, error } = await client.GET(
                "/api/v2/categories/tree" as any,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: queryParams ? { query: queryParams } : undefined,
                }
            );

            if (error || !data) {
                throw new Error("Не удалось загрузить категории.");
            }

            return data as CategoryReactDto[];
        },
    });

    const errorMessage = useMemo(() => {
        if (!query.error) return null;
        return query.error instanceof Error
            ? query.error.message
            : "Не удалось загрузить категории.";
    }, [query.error]);

    return {
        categories: query.data ?? [],
        isLoading: query.isLoading,
        error: errorMessage,
        refresh: async () => {
            await query.refetch();
        },
    };
};
