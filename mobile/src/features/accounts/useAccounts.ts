import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import type { Account } from "../../shared/api/dto";
import { mockAccounts } from "../../shared/mocks";
import { getToken, removeToken } from "../../storage/auth";

const ACCOUNTS_QUERY_KEY = ["accounts"];
const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4010";

type UseAccountsResult = {
    accounts: Account[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

const fetchAccounts = async (
    useMocks: boolean,
    onUnauthorized: () => Promise<void>,
): Promise<Account[]> => {
    if (useMocks) {
        return mockAccounts;
    }

    const token = await getToken();
    if (!token) {
        await onUnauthorized();
        throw new Error("Сессия истекла. Войдите снова.");
    }

    const response = await fetch(`${API_BASE_URL}/api/v2/accounts`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status === 401) {
        await onUnauthorized();
        throw new Error("Сессия истекла. Войдите снова.");
    }

    if (!response.ok) {
        throw new Error("Не удалось загрузить счета.");
    }

    const data = (await response.json()) as Account[];
    return data;
};

export const useAccounts = (): UseAccountsResult => {
    const router = useRouter();
    const useMocks =
        __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";

    const handleUnauthorized = async () => {
        await removeToken();
        router.replace("/login");
    };

    const query = useQuery({
        queryKey: ACCOUNTS_QUERY_KEY,
        queryFn: () => fetchAccounts(useMocks, handleUnauthorized),
    });

    const errorMessage = useMemo(() => {
        if (!query.error) {
            return null;
        }
        if (query.error instanceof Error) {
            return query.error.message;
        }
        return "Не удалось загрузить счета.";
    }, [query.error]);

    const refresh = useMemo(() => {
        return async () => {
            await query.refetch();
        };
    }, [query]);

    return {
        accounts: query.data ?? [],
        isLoading: query.isLoading,
        error: errorMessage,
        refresh,
    };
};

export { ACCOUNTS_QUERY_KEY };
