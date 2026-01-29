import {Modal, Pressable, ScrollView, StyleSheet, View} from "react-native";
import {useMemo, useState} from "react";

import {
    Button,
    Card,
    Chip,
    DateInput,
    ScreenContainer,
    Select,
    Text,
    colors,
    spacing,
} from "../../src/shared/ui";
import {mockCategoryTree, mockUser} from "../../src/shared/mocks";
import {TransactionFilters, useTransactions} from "../../src/features/transactions/useTransactions";
import {useAccounts} from "../../src/features/accounts/useAccounts";

const FILTERS = [
    {label: "All types", active: true},
    {label: "Income", active: false},
    {label: "Expenses", active: false},
    {label: "All accounts", active: false},
];

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
    const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
    const baseCurrency = mockUser.baseCurrency ?? "UAH";
    const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>({
        ...defaultPeriod,
        type: "ALL",
        accountId: null,
    });
    const { transactions, deleteTransaction } = useTransactions(appliedFilters);
    const { accounts } = useAccounts();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(appliedFilters);
    const [formState, setFormState] = useState({
        date: null as string | null,
        categoryId: null as string | null,
        accountId: null as string | null,
    });

    const categoryOptions = useMemo(() => {
        const options: Array<{value: string; label: string}> = [];
        mockCategoryTree.forEach((category) => {
            if (category.subcategories?.length) {
                category.subcategories.forEach((subcategory) => {
                    options.push({value: subcategory.id, label: subcategory.name});
                });
            } else {
                options.push({value: category.id, label: category.name});
            }
        });
        return options;
    }, []);

    const accountOptions = useMemo(() => {
        return accounts.map((account) => ({value: account.id, label: account.name}));
    }, [accounts]);

    const typeOptions = [
        {value: "ALL", label: "Все типы"},
        {value: "INCOME", label: "Доход"},
        {value: "EXPENSE", label: "Расход"},
    ];

    const periodLabel = useMemo(() => {
        if (appliedFilters.startDate && appliedFilters.endDate) {
            return `${appliedFilters.startDate} – ${appliedFilters.endDate}`;
        }
        if (appliedFilters.startDate) {
            return `From ${appliedFilters.startDate}`;
        }
        if (appliedFilters.endDate) {
            return `Until ${appliedFilters.endDate}`;
        }
        return "All time";
    }, [appliedFilters.endDate, appliedFilters.startDate]);

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
                    <Text variant="subtitle">Filters</Text>
                    <View style={styles.filterRow}>
                        <DateInput
                            placeholder="Start date"
                            value={draftFilters.startDate}
                            onChange={(value) => setDraftFilters((prev) => ({...prev, startDate: value}))}
                        />
                        <DateInput
                            placeholder="End date"
                            value={draftFilters.endDate}
                            onChange={(value) => setDraftFilters((prev) => ({...prev, endDate: value}))}
                        />
                    </View>
                    <View style={styles.filterRow}>
                        <Select
                            placeholder="Type"
                            value={draftFilters.type}
                            options={typeOptions}
                            onChange={(value) =>
                                setDraftFilters((prev) => ({
                                    ...prev,
                                    type: value as TransactionFilters["type"],
                                }))
                            }
                        />
                        <Select
                            placeholder="Account"
                            value={draftFilters.accountId}
                            options={accountOptions}
                            onChange={(value) => setDraftFilters((prev) => ({...prev, accountId: value}))}
                        />
                    </View>
                    <Button
                        title="Apply"
                        size="sm"
                        onPress={() => setAppliedFilters(draftFilters)}
                    />
                </Card>

                <View style={styles.filterChips}>
                    {FILTERS.map((filter) => (
                        <Chip key={filter.label} label={filter.label} isActive={filter.active}/>
                    ))}
                </View>

                <View style={styles.actionRow}>
                    {/*<Button title="Add new transaction" size="sm" onPress={() => setIsFormOpen(true)}/>*/}
                    <Button title="Export to xls" variant="outline" tone="primary" size="sm"/>
                </View>

                <View style={styles.list}>
                    {transactions.map((transaction) => (
                        <Card key={transaction.id} style={styles.transactionCard}>
                            <View style={styles.transactionHeader}>
                                <View>
                                    <Text>{transaction.date}</Text>
                                    <Text variant="caption">
                                        {transaction.account?.name ?? "Unknown account"}
                                    </Text>
                                </View>
                                <Text style={styles.amountText}>
                                    {transaction.amount}
                                </Text>
                            </View>
                            <View style={styles.transactionMeta}>
                                <Chip label={transaction.type} isActive/>
                            </View>
                            <Text variant="caption">{transaction.category?.name + "(" + transaction.comment + ")"}</Text>
                            <Text variant="caption">{transaction.currency}</Text>
                            <View style={styles.actionRowInline}>
                                <Button title="Edit" variant="outline" tone="primary" size="sm"/>
                                <Button
                                    title="Delete"
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => deleteTransaction(transaction.id)}
                                />
                            </View>
                        </Card>
                    ))}
                </View>
            </ScrollView>

            <Modal transparent animationType="fade" visible={isFormOpen} onRequestClose={() => setIsFormOpen(false)}>
                <Pressable style={styles.formBackdrop} onPress={() => setIsFormOpen(false)}>
                    <Pressable style={styles.formCard}>
                        <Text variant="subtitle">Добавить транзакцию</Text>
                        <DateInput
                            placeholder="Date"
                            value={formState.date}
                            onChange={(value) => setFormState((prev) => ({...prev, date: value}))}
                        />
                        <Select
                            placeholder="Category"
                            value={formState.categoryId}
                            options={categoryOptions}
                            onChange={(value) => setFormState((prev) => ({...prev, categoryId: value}))}
                        />
                        <Select
                            placeholder="Account"
                            value={formState.accountId}
                            options={accountOptions}
                            onChange={(value) => setFormState((prev) => ({...prev, accountId: value}))}
                        />
                        <View style={styles.formActions}>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                size="sm"
                                onPress={() => setIsFormOpen(false)}
                            />
                            <Button title="Save" size="sm" onPress={() => setIsFormOpen(false)}/>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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
    filterChips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    actionRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    list: {
        gap: spacing.sm,
    },
    transactionCard: {
        gap: spacing.sm,
    },
    transactionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    amountText: {
        marginLeft: 12,
        textAlign: "right",
    },
    transactionMeta: {
        flexDirection: "row",
        gap: spacing.xs,
    },
    actionRowInline: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    formBackdrop: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        justifyContent: "center",
        padding: spacing.lg,
    },
    formCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    formActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
        marginTop: spacing.sm,
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
