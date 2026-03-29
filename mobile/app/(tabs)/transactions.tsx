import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {Card, Chip, DateInput, ScreenContainer, Select, Text, colors, spacing} from "../../src/shared/ui";
import { mockUser } from "../../src/shared/mocks";
import { TransactionFilters, useTransactions } from "../../src/features/transactions/useTransactions";
import { useAccounts } from "../../src/features/accounts/useAccounts";

const toYmd = (d: Date) => {
    // локальная дата в YYYY-MM-DD без UTC-сдвига
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getDefaultPeriod = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        startDate: toYmd(startOfMonth),
        endDate: toYmd(now), // “включительно” для UI — просто сегодня
    };
};

export default function TransactionsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ accountId?: string }>();
    const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
    const baseCurrency = mockUser.baseCurrency ?? "UAH";
    const [filters, setFilters] = useState<TransactionFilters>({
        ...defaultPeriod,
        type: "ALL",
        accountId: null,
    });
    const { transactions } = useTransactions(filters);
    const { accounts } = useAccounts();

    useEffect(() => {
        if (params.accountId === undefined) {
            return;
        }
        setFilters((prev) => ({
            ...prev,
            accountId: params.accountId === "__all__" ? null : params.accountId,
        }));
    }, [params.accountId]);

    const typeOptions = [
        {value: "ALL", label: "Все типы"},
        {value: "INCOME", label: "Доход"},
        {value: "EXPENSE", label: "Расход"},
    ];

    const selectedAccountLabel = useMemo(() => {
        if (!filters.accountId) {
            return "Все счета";
        }
        const selected = accounts.find((account) => account.id === filters.accountId);
        return selected?.name ?? "Все счета";
    }, [accounts, filters.accountId]);

    const periodLabel = useMemo(() => {
        if (filters.startDate && filters.endDate) {
            return `${filters.startDate} – ${filters.endDate}`;
        }
        if (filters.startDate) {
            return `From ${filters.startDate}`;
        }
        if (filters.endDate) {
            return `Until ${filters.endDate}`;
        }
        return "All time";
    }, [filters.endDate, filters.startDate]);

    const openEditScreen = (transaction: unknown) => {
        const payload = encodeURIComponent(JSON.stringify(transaction));
        router.push({ pathname: "/transactions/edit", params: { transaction: payload } });
    };

    const formatListDate = (value: string) => {
        const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (directMatch) {
            return directMatch[1];
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const getCategoryLabel = (transaction: unknown) => {
        const dto = transaction as {
            category?:
                | string
                | { name?: string | null; title?: string | null; label?: string | null }
                | null;
            categoryName?: string | null;
            categoryTitle?: string | null;
        };

        if (typeof dto.category === "string" && dto.category.trim().length > 0) {
            return dto.category;
        }

        if (dto.category && typeof dto.category === "object") {
            const nested = dto.category.name ?? dto.category.title ?? dto.category.label;
            if (nested && nested.trim().length > 0) {
                return nested;
            }
        }

        if (dto.categoryName && dto.categoryName.trim().length > 0) {
            return dto.categoryName;
        }

        if (dto.categoryTitle && dto.categoryTitle.trim().length > 0) {
            return dto.categoryTitle;
        }

        return "Без категории";
    };

    return (
        <ScreenContainer>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text variant="title">Transactions</Text>
                        <Text variant="caption">Period: {periodLabel}</Text>
                    </View>
                    <Chip label={baseCurrency} isActive/>
                </View>

                <Card style={styles.filterCard}>
                    <View style={styles.filterRow}>
                        <DateInput
                            placeholder="Start date"
                            value={filters.startDate}
                            onChange={(value) => setFilters((prev) => ({...prev, startDate: value}))}
                        />
                        <DateInput
                            placeholder="End date"
                            value={filters.endDate}
                            onChange={(value) => setFilters((prev) => ({...prev, endDate: value}))}
                        />
                    </View>
                    <View style={styles.filterRow}>
                        <Select
                            placeholder="Type"
                            value={filters.type}
                            options={typeOptions}
                            onChange={(value) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    type: value as TransactionFilters["type"],
                                }))
                            }
                        />
                        <Pressable
                            style={styles.accountFilterButton}
                            onPress={() =>
                                router.push({
                                    pathname: "/transactions/filter-account",
                                    params: { selectedAccountId: filters.accountId ?? "__all__" },
                                })
                            }
                        >
                            <Text numberOfLines={1} style={styles.accountFilterButtonText}>
                                {selectedAccountLabel}
                            </Text>
                        </Pressable>
                    </View>
                </Card>

                <View style={styles.list}>
                    {transactions.map((transaction) => (
                        <Card key={transaction.id} style={styles.transactionCard}>
                            <Pressable style={styles.transactionRow} onPress={() => openEditScreen(transaction)}>
                                <Text variant="caption" style={styles.dateText}>
                                    {formatListDate(transaction.date)}
                                </Text>
                                <Text numberOfLines={1} style={styles.categoryText}>
                                    {getCategoryLabel(transaction)}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.amountText,
                                        transaction.type === "INCOME" || transaction.direction === "INCREASE"
                                            ? styles.positiveValue
                                            : styles.negativeValue,
                                    ]}
                                >
                                    {transaction.amount} {transaction.currency ?? baseCurrency}
                                </Text>
                            </Pressable>
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
        gap: spacing.sm,
    },
    filterCard: {
        gap: spacing.sm,
    },
    filterRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    accountFilterButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        justifyContent: "center",
    },
    accountFilterButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    list: {
        gap: spacing.sm,
    },
    transactionCard: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    transactionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    dateText: {
        width: 88,
        color: colors.textSecondary,
    },
    categoryText: {
        flex: 1,
        minWidth: 0,
    },
    amountText: {
        marginLeft: spacing.xs,
        textAlign: "right",
        fontWeight: "600",
    },
    negativeValue: {
        color: colors.danger,
        fontWeight: "600",
    },
    positiveValue: {
        color: colors.success,
        fontWeight: "600",
    },
});
