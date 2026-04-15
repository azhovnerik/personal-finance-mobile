import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import type {
  AccountSummary,
  BudgetProgressItem,
  CategoryBreakdown,
  CurrencyCode,
  DashboardSummary,
  RecentTransactionItem,
  TrendPoint,
} from "../../shared/api/dto";
import { API_BASE_URL } from "../../shared/lib/api/config";
import { getToken, removeToken } from "../../storage/auth";

export type DashboardSummaryFilters = {
  startDate?: string | null;
  endDate?: string | null;
};

type ErrorPayload = {
  message?: string;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const toStringValue = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

const normalizeCategoryBreakdown = (value: unknown): CategoryBreakdown[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      categoryId: toStringValue(item.categoryId),
      name: toStringValue(item.name, "Без категории"),
      icon: typeof item.icon === "string" ? item.icon : null,
      amount: toNumber(item.amount),
    }));
};

const normalizeTrend = (value: unknown): TrendPoint[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      label: toStringValue(item.label),
      amount: toNumber(item.amount),
    }));
};

const normalizeAccounts = (value: unknown): AccountSummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: toStringValue(item.id),
      name: toStringValue(item.name, "Счет"),
      type: toStringValue(item.type, "CASH") as AccountSummary["type"],
      balance: toNumber(item.balance),
      balanceInBase: item.balanceInBase == null ? null : toNumber(item.balanceInBase),
      currency: (typeof item.currency === "string" ? item.currency : null) as CurrencyCode | null,
    }));
};

const normalizeBudgetProgress = (value: unknown): BudgetProgressItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      budgetId: toStringValue(item.budgetId),
      monthLabel: toStringValue(item.monthLabel, "Current"),
      plannedExpense: toNumber(item.plannedExpense),
      actualExpense: toNumber(item.actualExpense),
      plannedIncome: item.plannedIncome == null ? null : toNumber(item.plannedIncome),
      actualIncome: item.actualIncome == null ? null : toNumber(item.actualIncome),
      expenseCompletionPercent: Math.max(0, Math.min(100, Math.round(toNumber(item.expenseCompletionPercent)))),
      incomeCompletionPercent: Math.max(0, Math.min(100, Math.round(toNumber(item.incomeCompletionPercent)))),
      baseCurrency: (typeof item.baseCurrency === "string" ? item.baseCurrency : null) as CurrencyCode | null,
    }));
};

const normalizeRecentTransactions = (value: unknown): RecentTransactionItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: toStringValue(item.id),
      dateLabel: toStringValue(item.dateLabel),
      categoryName: toStringValue(item.categoryName, "Без категории"),
      accountName: toStringValue(item.accountName, "Без счета"),
      amount: toNumber(item.amount),
      direction: toStringValue(item.direction, "DECREASE") as RecentTransactionItem["direction"],
      categoryType: toStringValue(item.categoryType, "EXPENSES") as RecentTransactionItem["categoryType"],
      currency: (typeof item.currency === "string" ? item.currency : null) as CurrencyCode | null,
      amountInBase: item.amountInBase == null ? null : toNumber(item.amountInBase),
    }));
};

const normalizeSummary = (payload: unknown, fallbackPeriod?: DashboardSummaryFilters): DashboardSummary => {
  const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    startDate: toStringValue(obj.startDate, fallbackPeriod?.startDate ?? ""),
    endDate: toStringValue(obj.endDate, fallbackPeriod?.endDate ?? ""),
    accounts: normalizeAccounts(obj.accounts),
    totalBalance: toNumber(obj.totalBalance),
    totalIncome: toNumber(obj.totalIncome),
    totalExpenses: toNumber(obj.totalExpenses),
    expenseBreakdown: normalizeCategoryBreakdown(obj.expenseBreakdown),
    incomeBreakdown: normalizeCategoryBreakdown(obj.incomeBreakdown),
    topExpenseCategories: normalizeCategoryBreakdown(obj.topExpenseCategories),
    expenseTrend: normalizeTrend(obj.expenseTrend),
    incomeTrend: normalizeTrend(obj.incomeTrend),
    budgetProgress: normalizeBudgetProgress(obj.budgetProgress),
    recentTransactions: normalizeRecentTransactions(obj.recentTransactions),
    baseCurrency: toStringValue(obj.baseCurrency, "UAH") as CurrencyCode,
  };
};

const fetchDashboardSummary = async (
  filters: DashboardSummaryFilters,
  onUnauthorized: () => Promise<void>,
): Promise<DashboardSummary> => {
  const token = await getToken();
  if (!token) {
    await onUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const params = new URLSearchParams();
  if (filters.startDate) {
    params.append("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.append("endDate", filters.endDate);
  }

  const queryPart = params.toString();
  const url = `${API_BASE_URL}/api/v2/dashboard/summary${queryPart ? `?${queryPart}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    await onUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  if (!response.ok) {
    let message = `Не удалось загрузить dashboard (HTTP ${response.status}).`;
    try {
      const payload = (await response.json()) as ErrorPayload;
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as unknown;
  return normalizeSummary(payload, filters);
};

export const useDashboardSummary = (filters: DashboardSummaryFilters) => {
  const router = useRouter();

  const handleUnauthorized = useCallback(async () => {
    await removeToken();
    router.replace("/login");
  }, [router]);

  const query = useQuery({
    queryKey: ["dashboard-summary", filters.startDate ?? null, filters.endDate ?? null],
    queryFn: () => fetchDashboardSummary(filters, handleUnauthorized),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const refresh = useMemo(() => {
    return async () => {
      await query.refetch();
    };
  }, [query]);

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
};
