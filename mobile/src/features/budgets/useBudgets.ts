import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BudgetDetailedDto, BudgetDto, BudgetCategoryDetailedDto } from "../../shared/api/dto";
import { getToken, removeToken } from "../../storage/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4010";
const BUDGETS_QUERY_KEY = ["budgets"];

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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
};

const normalizeBudgetList = (payload: unknown): BudgetDto[] => {
  if (Array.isArray(payload)) {
    return payload as BudgetDto[];
  }

  const obj = asRecord(payload);
  if (!obj) {
    return [];
  }

  const listCandidates: unknown[] = [
    obj.budgets,
    obj.data,
    obj.items,
    obj.content,
    asRecord(obj.result)?.budgets,
    asRecord(obj.result)?.data,
    asRecord(obj.page)?.content,
  ];

  for (const candidate of listCandidates) {
    if (Array.isArray(candidate)) {
      return candidate as BudgetDto[];
    }
  }

  return [];
};

const normalizeBudgetDetails = (payload: unknown): BudgetDetailedDto | null => {
  const candidateList: unknown[] = [
    payload,
    asRecord(payload)?.data,
    asRecord(payload)?.budget,
    asRecord(asRecord(payload)?.result)?.budget,
    asRecord(payload)?.result,
  ];

  for (const candidate of candidateList) {
    const obj = asRecord(candidate);
    if (obj?.id && typeof obj.id === "string") {
      return obj as unknown as BudgetDetailedDto;
    }
  }

  return null;
};

const useUnauthorizedHandler = () => {
  const router = useRouter();
  return useMemo(() => {
    return async () => {
      await removeToken();
      router.replace("/login");
    };
  }, [router]);
};

const fetchBudgets = async (handleUnauthorized: () => Promise<void>): Promise<BudgetDto[]> => {
  const token = await getToken();
  if (!token) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/budgets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  if (!response.ok) {
    throw new Error(await parseMessage(response, `Не удалось загрузить бюджеты (HTTP ${response.status}).`));
  }

  const payload = (await response.json()) as unknown;
  return normalizeBudgetList(payload);
};

const fetchBudgetDetails = async (
  id: string,
  handleUnauthorized: () => Promise<void>,
): Promise<BudgetDetailedDto> => {
  const token = await getToken();
  if (!token) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/budgets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  if (!response.ok) {
    throw new Error(await parseMessage(response, `Не удалось загрузить бюджет (HTTP ${response.status}).`));
  }

  const payload = (await response.json()) as unknown;
  const details = normalizeBudgetDetails(payload);
  if (!details) {
    throw new Error("Некорректный формат ответа бюджета.");
  }
  return details;
};

type BudgetCategoryMutationPayload = {
  budgetId: string;
  category: BudgetCategoryDetailedDto;
  amount: number;
  comment?: string | null;
};

const buildBudgetCategoryMutationBody = (payload: BudgetCategoryMutationPayload) => ({
  id: payload.category.id,
  budgetId: payload.budgetId,
  category: payload.category.category,
  type: payload.category.type,
  amount: payload.amount,
  comment: payload.comment ?? null,
  currency: payload.category.currency ?? null,
});

const updateBudgetCategory = async (
  payload: BudgetCategoryMutationPayload,
  handleUnauthorized: () => Promise<void>,
) => {
  const token = await getToken();
  if (!token) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  const response = await fetch(`${API_BASE_URL}/api/v2/budgets/${payload.budgetId}/category/edit`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBudgetCategoryMutationBody(payload)),
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  if (!response.ok) {
    throw new Error(
      await parseMessage(response, `Не удалось обновить бюджетную категорию (HTTP ${response.status}).`),
    );
  }
};

const deleteBudgetCategory = async (
  payload: { budgetId: string; category: BudgetCategoryDetailedDto },
  handleUnauthorized: () => Promise<void>,
) => {
  const token = await getToken();
  if (!token) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  const response = await fetch(`${API_BASE_URL}/api/v2/budgets/${payload.budgetId}/category/delete`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: payload.category.id,
      budgetId: payload.budgetId,
    }),
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  if (!response.ok) {
    throw new Error(await parseMessage(response, `Не удалось удалить бюджетную категорию (HTTP ${response.status}).`));
  }
};

const addBudgetCategory = async (
  payload: BudgetCategoryMutationPayload,
  handleUnauthorized: () => Promise<void>,
) => {
  const token = await getToken();
  if (!token) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  const response = await fetch(`${API_BASE_URL}/api/v2/budgets/${payload.budgetId}/category/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...buildBudgetCategoryMutationBody(payload),
      id: undefined,
    }),
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  if (!response.ok) {
    throw new Error(await parseMessage(response, `Не удалось добавить бюджетную категорию (HTTP ${response.status}).`));
  }
};

export const useBudgets = () => {
  const handleUnauthorized = useUnauthorizedHandler();
  const query = useQuery({
    queryKey: BUDGETS_QUERY_KEY,
    queryFn: () => fetchBudgets(handleUnauthorized),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const refresh = useMemo(() => {
    return async () => {
      await query.refetch();
    };
  }, [query]);

  const errorMessage = query.error instanceof Error ? query.error.message : null;

  return {
    budgets: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    error: errorMessage,
    refresh,
  };
};

export const useBudgetDetails = (id: string | undefined) => {
  const handleUnauthorized = useUnauthorizedHandler();
  const query = useQuery({
    queryKey: ["budget-details", id],
    queryFn: () => fetchBudgetDetails(id!, handleUnauthorized),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const refresh = useMemo(() => {
    return async () => {
      if (!id) {
        return;
      }
      await query.refetch();
    };
  }, [id, query]);

  const errorMessage = query.error instanceof Error ? query.error.message : null;

  return {
    budget: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    error: errorMessage,
    refresh,
  };
};

const createBudget = async (month: string, handleUnauthorized: () => Promise<void>) => {
  const token = await getToken();
  if (!token) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/budgets/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ month }),
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }
  if (!response.ok) {
    throw new Error(await parseMessage(response, `Не удалось создать бюджет (HTTP ${response.status}).`));
  }
};

export const useBudgetActions = () => {
  const handleUnauthorized = useUnauthorizedHandler();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (month: string) => createBudget(month, handleUnauthorized),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
    },
  });

  return {
    createBudget: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    error: createMutation.error instanceof Error ? createMutation.error.message : null,
  };
};

export const useBudgetCategoryActions = () => {
  const handleUnauthorized = useUnauthorizedHandler();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (payload: BudgetCategoryMutationPayload) => updateBudgetCategory(payload, handleUnauthorized),
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["budget-details", payload.budgetId] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (payload: BudgetCategoryMutationPayload) => addBudgetCategory(payload, handleUnauthorized),
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["budget-details", payload.budgetId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { budgetId: string; category: BudgetCategoryDetailedDto }) =>
      deleteBudgetCategory(payload, handleUnauthorized),
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["budget-details", payload.budgetId] });
    },
  });

  return {
    addCategory: addMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error:
      (addMutation.error instanceof Error ? addMutation.error.message : null) ??
      (updateMutation.error instanceof Error ? updateMutation.error.message : null) ??
      (deleteMutation.error instanceof Error ? deleteMutation.error.message : null),
  };
};
