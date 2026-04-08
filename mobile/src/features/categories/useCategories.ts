import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import client from "../../shared/lib/api/client";
import { getToken, removeToken } from "../../storage/auth";
import { mockCategories } from "../../shared/mocks";
import { CategoryDto, CategoryReactDto, CategoryType } from "../../shared/api/dto";
import { CategoryIconOption, FALLBACK_CATEGORY_ICONS, normalizeCategoryIcon } from "./categoryIcons";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;
export const CATEGORY_ICONS_QUERY_KEY = ["categories", "icons"] as const;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4010";

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
    isRefreshing: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

type UseCategoryIconsResult = {
    icons: CategoryIconOption[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

export type CategoryMutationPayload = {
    name: string;
    type: CategoryType;
    parentId?: string | null;
    icon?: string | null;
    description?: string | null;
    disabled?: boolean;
};

const parseMessage = async (response: Response, fallback: string) => {
    try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) {
            return body.message;
        }
    } catch {
        // ignore parse errors
    }
    return fallback;
};

const getAuthorizedHeaders = async (router: ReturnType<typeof useRouter>) => {
    const token = await getToken();
    if (!token) {
        await removeToken();
        router.replace("/login");
        throw new Error("Сессия истекла. Войдите снова.");
    }
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};

const normalizeCategoryMutationPayload = (payload: CategoryMutationPayload): CategoryMutationPayload => ({
    ...payload,
    icon: normalizeCategoryIcon(payload.icon),
});

export const useCategories = (filters?: CategoriesFilters, options?: UseCategoriesOptions): UseCategoriesResult => {
    const router = useRouter();
    const useMocks = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";
    const enabled = options?.enabled ?? true;

    const queryParams = useMemo(() => toQueryFilters(filters), [filters]);

    const query = useQuery({
        queryKey: [...CATEGORIES_QUERY_KEY, queryParams ?? {}],
        enabled,
        refetchOnMount: "always",
        refetchOnReconnect: true,
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

    const refresh = useCallback(async () => {
        await query.refetch();
    }, [query.refetch]);

    return {
        categories: query.data ?? [],
        isLoading: query.isLoading,
        isRefreshing: query.isFetching,
        error: errorMessage,
        refresh,
    };
};

export const useCategoryIcons = (options?: UseCategoriesOptions): UseCategoryIconsResult => {
    const router = useRouter();
    const useMocks = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";
    const enabled = options?.enabled ?? true;

    const query = useQuery({
        queryKey: CATEGORY_ICONS_QUERY_KEY,
        enabled,
        refetchOnMount: "always",
        refetchOnReconnect: true,
        queryFn: async () => {
            if (useMocks) {
                return FALLBACK_CATEGORY_ICONS;
            }

            const token = await getToken();
            if (!token) {
                await removeToken();
                router.replace("/login");
                throw new Error("Сессия истекла. Войдите снова.");
            }

            const response = await fetch(`${API_BASE_URL}/api/v2/categories/icons`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error(await parseMessage(response, `Не удалось загрузить иконки категорий (HTTP ${response.status}).`));
            }

            const payload = (await response.json()) as CategoryIconOption[];
            return payload
                .map((icon) => {
                    const normalizedKey = normalizeCategoryIcon(icon.key);
                    return normalizedKey ? { ...icon, key: normalizedKey } : null;
                })
                .filter(Boolean) as CategoryIconOption[];
        },
    });

    const errorMessage = useMemo(() => {
        if (!query.error) return null;
        return query.error instanceof Error
            ? query.error.message
            : "Не удалось загрузить иконки категорий.";
    }, [query.error]);

    const refresh = useCallback(async () => {
        await query.refetch();
    }, [query.refetch]);

    return {
        icons: query.data && query.data.length > 0 ? query.data : FALLBACK_CATEGORY_ICONS,
        isLoading: query.isLoading,
        error: errorMessage,
        refresh,
    };
};

export const useCategoryActions = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (payload: CategoryMutationPayload) => {
            const response = await fetch(`${API_BASE_URL}/api/v2/categories`, {
                method: "POST",
                headers: await getAuthorizedHeaders(router),
                body: JSON.stringify(normalizeCategoryMutationPayload(payload)),
            });

            if (!response.ok) {
                throw new Error(await parseMessage(response, `Не удалось создать категорию (HTTP ${response.status}).`));
            }
            return (await response.json()) as CategoryDto;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: CategoryMutationPayload }) => {
            const response = await fetch(`${API_BASE_URL}/api/v2/categories/${id}`, {
                method: "PUT",
                headers: await getAuthorizedHeaders(router),
                body: JSON.stringify(normalizeCategoryMutationPayload(payload)),
            });

            if (!response.ok) {
                throw new Error(await parseMessage(response, `Не удалось обновить категорию (HTTP ${response.status}).`));
            }
            return (await response.json()) as CategoryDto;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_BASE_URL}/api/v2/categories/${id}`, {
                method: "DELETE",
                headers: await getAuthorizedHeaders(router),
            });

            if (!response.ok) {
                throw new Error(await parseMessage(response, `Не удалось удалить категорию (HTTP ${response.status}).`));
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        },
    });

    const actionError =
        createMutation.error instanceof Error ? createMutation.error.message :
            updateMutation.error instanceof Error ? updateMutation.error.message :
                deleteMutation.error instanceof Error ? deleteMutation.error.message :
                    null;

    return {
        createCategory: createMutation.mutateAsync,
        updateCategory: updateMutation.mutateAsync,
        deleteCategory: deleteMutation.mutateAsync,
        isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
        actionError,
    };
};
