import {Modal, Pressable, ScrollView, StyleSheet, View} from "react-native";
import {useCallback, useMemo, useState} from "react";

import {
    Button,
    Card,
    Chip,
    DateInput,
    Input,
    ScreenContainer,
    Select,
    Text,
    colors,
    spacing,
} from "../../src/shared/ui";
import {mockCategoryTree, mockUser} from "../../src/shared/mocks";
import {
    TransactionAddPayload,
    TransactionFilters,
    useTransactions,
} from "../../src/features/transactions/useTransactions";
import {useAccounts} from "../../src/features/accounts/useAccounts";
import {Category, TransactionDirection, TransactionType} from "../../src/shared/api/dto";

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

const formatTimePart = (value: number) => String(value).padStart(2, "0");

const toTransactionDateTime = (date: string) => {
    const now = new Date();
    const hours = formatTimePart(now.getHours());
    const minutes = formatTimePart(now.getMinutes());
    const seconds = formatTimePart(now.getSeconds());
    return `${date} ${hours}:${minutes}:${seconds}`;
};

const DEFAULT_TYPE: TransactionType = "EXPENSE";
const DEFAULT_DIRECTION: TransactionDirection = "DECREASE";
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";

export default function TransactionsScreen() {
    const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
    const baseCurrency = mockUser.baseCurrency ?? "UAH";
    const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>({
        ...defaultPeriod,
        type: "ALL",
        accountId: null,
    });
    const { transactions, createTransaction } = useTransactions(appliedFilters);
    const { accounts } = useAccounts();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(appliedFilters);
    const [formState, setFormState] = useState({
        date: defaultPeriod.endDate,
        categoryId: null as string | null,
        accountId: null as string | null,
        amount: "",
        type: DEFAULT_TYPE as TransactionType,
        direction: DEFAULT_DIRECTION as TransactionDirection,
        comment: "",
        timezone: DEFAULT_TIMEZONE,
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { categoryOptions, categoryLookup } = useMemo(() => {
        const options: Array<{value: string; label: string}> = [];
        const lookup = new Map<string, Category>();
        mockCategoryTree.forEach((category) => {
            if (category.subcategories?.length) {
                category.subcategories.forEach((subcategory) => {
                    options.push({value: subcategory.id, label: subcategory.name});
                    lookup.set(subcategory.id, {
                        id: subcategory.id,
                        name: subcategory.name,
                        type: subcategory.type,
                        disabled: subcategory.disabled,
                        parentId: category.id,
                        icon: subcategory.icon ?? null,
                        categoryTemplateId: subcategory.categoryTemplateId ?? null,
                    });
                });
            } else {
                options.push({value: category.id, label: category.name});
                lookup.set(category.id, {
                    id: category.id,
                    name: category.name,
                    type: category.type,
                    disabled: category.disabled,
                    icon: category.icon ?? null,
                    categoryTemplateId: category.categoryTemplateId ?? null,
                });
            }
        });
        return {categoryOptions: options, categoryLookup: lookup};
    }, []);

    const accountOptions = useMemo(() => {
        return accounts.map((account) => ({value: account.id, label: account.name}));

    }, [accounts]);

    const accountLookup = useMemo(() => {
        return new Map(accounts.map((account) => [account.id, account] as const));
    }, [accounts]);

    const typeOptions = [
        {value: "ALL", label: "Все типы"},
        {value: "INCOME", label: "Доход"},
        {value: "EXPENSE", label: "Расход"},
    ];

    const transactionTypeOptions: Array<{value: TransactionType; label: string}> = [
        {value: "EXPENSE", label: "Расход"},
        {value: "INCOME", label: "Доход"},
        {value: "CHANGE_BALANCE", label: "Корректировка"},
        {value: "TRANSFER", label: "Перевод"},
    ];

    const directionOptions: Array<{value: TransactionDirection; label: string}> = [
        {value: "DECREASE", label: "Списание"},
        {value: "INCREASE", label: "Пополнение"},
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

    const resetFormState = useCallback(() => {
        setFormState({
            date: defaultPeriod.endDate,
            categoryId: null,
            accountId: null,
            amount: "",
            type: DEFAULT_TYPE,
            direction: DEFAULT_DIRECTION,
            comment: "",
            timezone: DEFAULT_TIMEZONE,
        });
    }, [defaultPeriod.endDate]);

    const closeForm = useCallback(() => {
        setIsFormOpen(false);
        setFormError(null);
        setIsSubmitting(false);
        resetFormState();
    }, [resetFormState]);

    const handleOpenForm = useCallback(() => {
        setFormError(null);
        setIsFormOpen(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (isSubmitting) {
            return;
        }

        const parsedAmount = Number(formState.amount.replace(",", "."));
        if (!formState.date || !formState.categoryId || !formState.accountId || !parsedAmount || parsedAmount <= 0) {
            setFormError("Заполните дату, категорию, счет и сумму больше нуля.");
            return;
        }

        const account = accountLookup.get(formState.accountId);
        const category = categoryLookup.get(formState.categoryId);
        const payload: TransactionAddPayload = {
            date: toTransactionDateTime(formState.date),
            timezone: formState.timezone,
            categoryId: formState.categoryId,
            accountId: formState.accountId,
            direction: formState.direction,
            type: formState.type,
            amount: parsedAmount,
            amountInBase: parsedAmount,
            currency: account?.currency ?? baseCurrency,
            comment: formState.comment.trim() ? formState.comment.trim() : null,
        };

        setIsSubmitting(true);
        const result = await createTransaction(payload, {category, account});
        setIsSubmitting(false);

        if (!result.success) {
            setFormError(result.error ?? "Не удалось создать транзакцию.");
            return;
        }

        closeForm();
    }, [
        accountLookup,
        baseCurrency,
        categoryLookup,
        closeForm,
        createTransaction,
        formState.accountId,
        formState.amount,
        formState.categoryId,
        formState.comment,
        formState.date,
        formState.direction,
        formState.timezone,
        formState.type,
        isSubmitting,
    ]);

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
                                setDraftFilters((prev) => ({...prev, type: value as TransactionFilters["type"]}))
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
                    <Button title="Add new transaction" size="sm" onPress={handleOpenForm}/>
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
                                {/*<Text*/}
                                {/*    style={*/}
                                {/*        transaction.direction === "DECREASE" ? styles.negativeValue : styles.positiveValue*/}
                                {/*    }*/}
                                {/*>*/}
                                {/*    {transaction.direction === "DECREASE" ? "-" : "+"}*/}
                                {/*    {formatCurrency(transaction.amount, transaction.currency ?? baseCurrency)}*/}
                                {/*</Text>*/}
                            </View>
                            <View style={styles.transactionMeta}>
                                <Chip label={transaction.type} isActive/>
                                <Chip label={transaction.direction}/>
                            </View>
                            <Text variant="caption">{transaction.category?.name}</Text>
                            <Text variant="caption">{transaction.comment}</Text>
                            <View style={styles.actionRowInline}>
                                <Button title="Edit" variant="outline" tone="primary" size="sm"/>
                                <Button title="Delete" variant="ghost" size="sm"/>
                            </View>
                        </Card>
                    ))}
                </View>
            </ScrollView>

            <Modal transparent animationType="fade" visible={isFormOpen} onRequestClose={closeForm}>
                <Pressable style={styles.formBackdrop} onPress={closeForm}>
                    <Pressable style={styles.formCard}>
                        <Text variant="subtitle">Добавить транзакцию</Text>
                        <Text variant="caption" style={styles.helperText}>
                            Часовой пояс: {formState.timezone}
                        </Text>
                        <DateInput
                            placeholder="Date"
                            value={formState.date}
                            onChange={(value) => setFormState((prev) => ({...prev, date: value}))}
                        />
                        <Input
                            placeholder="Amount"
                            value={formState.amount}
                            keyboardType="decimal-pad"
                            onChangeText={(value) => setFormState((prev) => ({...prev, amount: value}))}
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
                        <View style={styles.formRow}>
                            <Select
                                placeholder="Type"
                                value={formState.type}
                                options={transactionTypeOptions}
                                onChange={(value) => setFormState((prev) => ({...prev, type: value as TransactionType}))}
                            />
                            <Select
                                placeholder="Direction"
                                value={formState.direction}
                                options={directionOptions}
                                onChange={(value) =>
                                    setFormState((prev) => ({...prev, direction: value as TransactionDirection}))
                                }
                            />
                        </View>
                        <Input
                            placeholder="Comment"
                            value={formState.comment}
                            onChangeText={(value) => setFormState((prev) => ({...prev, comment: value}))}
                        />
                        {formError ? (
                            <Text variant="caption" style={styles.errorText}>
                                {formError}
                            </Text>
                        ) : null}
                        <View style={styles.formActions}>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                size="sm"
                                onPress={closeForm}
                            />
                            <Button title={isSubmitting ? "Saving..." : "Save"} size="sm" onPress={handleSave}/>
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
    formRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    formActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    helperText: {
        color: colors.textSecondary,
    },
    errorText: {
        color: colors.danger,
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
