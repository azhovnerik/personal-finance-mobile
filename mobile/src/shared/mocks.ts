import {
    Account,
    AccountDto,
    AccountSummary,
    BudgetCategoryDetailedDto,
    BudgetDetailedDto,
    Category,
    CategoryBreakdown,
    CategoryReactDto,
    DashboardSummary,
    RecentTransactionItem,
    TransactionDto,
    UserApp,
} from "./api/dto";
import {useMemo} from "react";

export const mockUser: UserApp = {
    id: "user-1",
    name: "Olena",
    email: "olena@example.com",
    baseCurrency: "UAH",
};

export const mockAccounts: Account[] = [
    {
        id: "acc-1",
        name: "Main account",
        description: "Card account for daily expenses",
        type: "BANK_ACCOUNT",
        currency: "UAH",
    },
    {
        id: "acc-2",
        name: "Travel card",
        description: "Travel reserve",
        type: "CARD",
        currency: "UAH",
    },
    {
        id: "acc-3",
        name: "Cash",
        description: "Wallet",
        type: "CASH",
        currency: "UAH",
    },
];

export const mockAccountDtos: AccountDto[] = [
    {
        ...mockAccounts[0],
        balance: 42600,
        balanceInBase: 42600,
    },
    {
        ...mockAccounts[1],
        balance: 18900,
        balanceInBase: 18900,
    },
    {
        ...mockAccounts[2],
        balance: 2200,
        balanceInBase: 2200,
    },
];

const categoryGroceries: Category = {
    id: "cat-1",
    name: "Groceries",
    description: "Supermarkets and cafes",
    userId: mockUser.id,
    type: "EXPENSES",
    disabled: false,
    icon: "shopping-cart",
};

const categoryHome: Category = {
    id: "cat-2",
    name: "Home",
    description: "Utilities and household",
    userId: mockUser.id,
    type: "EXPENSES",
    disabled: false,
    icon: "home",
};

const categoryTransport: Category = {
    id: "cat-3",
    name: "Transport",
    description: "Taxi and transport",
    userId: mockUser.id,
    type: "EXPENSES",
    disabled: false,
    icon: "truck",
};

const categorySalary: Category = {
    id: "cat-4",
    name: "Salary",
    description: "Primary income",
    userId: mockUser.id,
    type: "INCOME",
    disabled: false,
    icon: "wallet",
};

const categoryFreelance: Category = {
    id: "cat-5",
    name: "Freelance",
    description: "Project payments",
    userId: mockUser.id,
    type: "INCOME",
    disabled: false,
    icon: "briefcase",
};

export const mockTransactions: TransactionDto[] = [
    {
        id: "txn-1",
        date: "2024-03-12",
        category: categoryGroceries,
        account: mockAccounts[0],
        direction: "DECREASE",
        type: "EXPENSE",
        amount: 2350,
        amountInBase: 2350,
        currency: "UAH",
        comment: "Supermarket",
    },
    {
        id: "txn-2",
        date: "2024-03-12",
        category: categoryTransport,
        account: mockAccounts[1],
        direction: "DECREASE",
        type: "EXPENSE",
        amount: 480,
        amountInBase: 480,
        currency: "UAH",
        comment: "Taxi",
    },
    {
        id: "txn-3",
        date: "2024-03-11",
        category: categoryFreelance,
        account: mockAccounts[0],
        direction: "INCREASE",
        type: "INCOME",
        amount: 9200,
        amountInBase: 9200,
        currency: "UAH",
        comment: "Project",
    },
];

export const mockCategories: CategoryReactDto[] = [
    {
        id: "cat-food",
        name: "Food and drinks",
        type: "EXPENSES",
        disabled: false,
        icon: "food",
        color: "#f4543a",
        subcategories: [
            {
                id: "cat-food-cafe",
                name: "Cafes and restaurants",
                type: "EXPENSES",
                disabled: false,
                icon: "food",
                color: "#f4543a",
            },
            {
                id: "cat-food-groceries",
                name: "Groceries",
                type: "EXPENSES",
                disabled: false,
                icon: "basket",
                color: "#f4543a",
            },
        ],
    },
    {
        id: "cat-shopping",
        name: "Shopping",
        type: "EXPENSES",
        disabled: false,
        icon: "bag",
        color: "#4aa8ff",
        subcategories: [
            {
                id: "cat-shopping-home",
                name: "Home and household",
                type: "EXPENSES",
                disabled: false,
                icon: "home",
                color: "#4aa8ff",
            },
            {
                id: "cat-shopping-clothes",
                name: "Clothing",
                type: "EXPENSES",
                disabled: false,
                icon: "shirt",
                color: "#4aa8ff",
            },
        ],
    },
    {
        id: "cat-home",
        name: "Housing",
        type: "EXPENSES",
        disabled: false,
        icon: "home",
        color: "#f5a524",
        subcategories: [
            {
                id: "cat-home-rent",
                name: "Rent",
                type: "EXPENSES",
                disabled: false,
                icon: "home",
                color: "#f5a524",
            },
            {
                id: "cat-home-utility",
                name: "Utilities",
                type: "EXPENSES",
                disabled: false,
                icon: "home",
                color: "#f5a524",
            },
        ],
    },
    {
        id: "cat-transport",
        name: "Transport",
        type: "EXPENSES",
        disabled: false,
        icon: "car",
        color: "#9aa3b2",
        subcategories: [
            {
                id: "cat-transport-taxi",
                name: "Taxi",
                type: "EXPENSES",
                disabled: false,
                icon: "car",
                color: "#9aa3b2",
            },
            {
                id: "cat-transport-fuel",
                name: "Fuel",
                type: "EXPENSES",
                disabled: false,
                icon: "fuel",
                color: "#9aa3b2",
            },
        ],
    },
    {
        id: "cat-income",
        name: "Income",
        type: "INCOME",
        disabled: false,
        icon: "finance",
        color: "#22c55e",
        subcategories: [
            {
                id: "cat-income-salary",
                name: "Salary",
                type: "INCOME",
                disabled: false,
                icon: "finance",
                color: "#22c55e",
            },
            {
                id: "cat-income-freelance",
                name: "Freelance",
                type: "INCOME",
                disabled: false,
                icon: "finance",
                color: "#22c55e",
            },
        ],
    },
    {
        id: "cat-auto",
        name: "Car",
        type: "EXPENSES",
        disabled: false,
        icon: "auto",
        color: "#a855f7",
        subcategories: [
            {
                id: "cat-auto-service",
                name: "Service",
                type: "EXPENSES",
                disabled: false,
                icon: "auto",
                color: "#a855f7",
            },
            {
                id: "cat-auto-insurance",
                name: "Insurance",
                type: "EXPENSES",
                disabled: false,
                icon: "auto",
                color: "#a855f7",
            },
        ],
    },
    {
        id: "cat-fun",
        name: "Lifestyle and entertainment",
        type: "EXPENSES",
        disabled: false,
        icon: "party",
        color: "#84cc16",
    },
    {
        id: "cat-communication",
        name: "Communications and computers",
        type: "EXPENSES",
        disabled: false,
        icon: "tech",
        color: "#6366f1",
    },
    {
        id: "cat-finance",
        name: "Financial expenses",
        type: "EXPENSES",
        disabled: false,
        icon: "finance",
        color: "#14b8a6",
    },
]

const expenseBreakdown: CategoryBreakdown[] = [
    {categoryId: categoryGroceries.id, name: "Groceries", icon: "shopping-cart", amount: 16800},
    {categoryId: categoryHome.id, name: "Home and household", icon: "home", amount: 10350},
    {categoryId: categoryTransport.id, name: "Transport", icon: "truck", amount: 7100},
];

const incomeBreakdown: CategoryBreakdown[] = [
    {categoryId: categorySalary.id, name: "Salary", icon: "wallet", amount: 64000},
    {categoryId: categoryFreelance.id, name: "Freelance", icon: "briefcase", amount: 18500},
];

const topExpenseCategories: CategoryBreakdown[] = [
    {categoryId: categoryGroceries.id, name: "Groceries", icon: "shopping-cart", amount: 16800},
    {categoryId: categoryHome.id, name: "Home and household", icon: "home", amount: 10350},
    {categoryId: categoryTransport.id, name: "Transport", icon: "truck", amount: 7100},
];

const recentTransactions: RecentTransactionItem[] = [
    {
        id: "rt-1",
        dateLabel: "Today, 12:40",
        categoryName: "Groceries",
        accountName: "Main account",
        amount: 2350,
        direction: "DECREASE",
        categoryType: "EXPENSES",
        currency: "UAH",
        amountInBase: 2350,
    },
    {
        id: "rt-2",
        dateLabel: "Yesterday, 19:10",
        categoryName: "Savings",
        accountName: "Travel card",
        amount: 4000,
        direction: "DECREASE",
        categoryType: "EXPENSES",
        currency: "UAH",
        amountInBase: 4000,
    },
    {
        id: "rt-3",
        dateLabel: "Feb 28",
        categoryName: "Salary",
        accountName: "Main account",
        amount: 32000,
        direction: "INCREASE",
        categoryType: "INCOME",
        currency: "UAH",
        amountInBase: 32000,
    },
];

const accountSummaries: AccountSummary[] = [
    {
        id: mockAccounts[0].id,
        name: mockAccounts[0].name,
        type: mockAccounts[0].type,
        balance: 42600,
        balanceInBase: 42600,
        currency: "UAH",
    },
    {
        id: mockAccounts[1].id,
        name: mockAccounts[1].name,
        type: mockAccounts[1].type,
        balance: 18900,
        balanceInBase: 18900,
        currency: "UAH",
    },
    {
        id: mockAccounts[2].id,
        name: mockAccounts[2].name,
        type: mockAccounts[2].type,
        balance: 2200,
        balanceInBase: 2200,
        currency: "UAH",
    },
];

export const mockDashboardSummary: DashboardSummary = {
    startDate: "2024-03-01",
    endDate: "2024-03-31",
    accounts: accountSummaries,
    totalBalance: 164250,
    totalIncome: 82500,
    totalExpenses: 46900,
    expenseBreakdown,
    incomeBreakdown,
    topExpenseCategories,
    expenseTrend: [
        {label: "Week 1", amount: 11200},
        {label: "Week 2", amount: 9800},
        {label: "Week 3", amount: 12300},
        {label: "Week 4", amount: 13600},
    ],
    incomeTrend: [
        {label: "Week 1", amount: 18000},
        {label: "Week 2", amount: 22000},
        {label: "Week 3", amount: 19500},
        {label: "Week 4", amount: 23000},
    ],
    budgetProgress: [
        {
            budgetId: "budget-1",
            monthLabel: "March 2024",
            plannedExpense: 20000,
            actualExpense: 12450,
            plannedIncome: 80000,
            actualIncome: 71500,
            expenseCompletionPercent: 62,
            incomeCompletionPercent: 89,
            baseCurrency: "UAH",
        },
        {
            budgetId: "budget-2",
            monthLabel: "April 2024",
            plannedExpense: 15000,
            actualExpense: 6120,
            plannedIncome: 60000,
            actualIncome: 42100,
            expenseCompletionPercent: 41,
            incomeCompletionPercent: 70,
            baseCurrency: "UAH",
        },
    ],
    recentTransactions,
    baseCurrency: "UAH",
};

const budgetExpenseCategories: BudgetCategoryDetailedDto[] = [
    {
        id: "bc-1",
        budgetId: "budget-1",
        category: categoryGroceries,
        type: "EXPENSES",
        planAmount: 8000,
        factAmount: 6200,
        leftover: 1800,
        currency: "UAH",
    },
    {
        id: "bc-2",
        budgetId: "budget-1",
        category: categoryHome,
        type: "EXPENSES",
        planAmount: 6000,
        factAmount: 3950,
        leftover: 2050,
        currency: "UAH",
    },
    {
        id: "bc-3",
        budgetId: "budget-1",
        category: categoryTransport,
        type: "EXPENSES",
        planAmount: 6000,
        factAmount: 2300,
        leftover: 3700,
        currency: "UAH",
    },
];

export const mockBudgets: BudgetDetailedDto[] = [
    {
        id: "budget-1",
        month: "March 2024",
        totalIncome: 82000,
        totalExpense: 20000,
        totalIncomeFact: 71500,
        totalIncomeLeftover: 10500,
        totalExpenseFact: 12450,
        totalExpenseLeftover: 7550,
        user: mockUser,
        baseCurrency: "UAH",
        expenseBudgetCategories: budgetExpenseCategories,
    },
    {
        id: "budget-2",
        month: "April 2024",
        totalIncome: 60000,
        totalExpense: 15000,
        totalIncomeFact: 42100,
        totalIncomeLeftover: 17900,
        totalExpenseFact: 6120,
        totalExpenseLeftover: 8880,
        user: mockUser,
        baseCurrency: "UAH",
        expenseBudgetCategories: [
            {
                id: "bc-4",
                budgetId: "budget-2",
                category: categoryGroceries,
                type: "EXPENSES",
                planAmount: 5000,
                factAmount: 3100,
                leftover: 1900,
                currency: "UAH",
            },
            {
                id: "bc-5",
                budgetId: "budget-2",
                category: categoryHome,
                type: "EXPENSES",
                planAmount: 4500,
                factAmount: 1800,
                leftover: 2700,
                currency: "UAH",
            },
        ],
    },
];

export const mockCategoryTree: CategoryReactDto[] = [
    {
        id: "cat-income-1",
        name: "Income",
        type: "INCOME",
        disabled: false,
        subcategories: [
            {
                id: "cat-income-1-1",
                name: "Salary",
                type: "INCOME",
                disabled: false,
            },
            {
                id: "cat-income-1-2",
                name: "Bonuses",
                type: "INCOME",
                disabled: false,
            },
        ],
    },
    {
        id: "cat-income-2",
        name: "Freelance",
        type: "INCOME",
        disabled: false,
        subcategories: [
            {
                id: "cat-income-2-1",
                name: "Projects",
                type: "INCOME",
                disabled: false,
            },
            {
                id: "cat-income-2-2",
                name: "Consulting",
                type: "INCOME",
                disabled: false,
            },
        ],
    },
    {
        id: "cat-expense-1",
        name: "Expenses",
        type: "EXPENSES",
        disabled: false,
        subcategories: [
            {
                id: "cat-expense-1-1",
                name: "Groceries",
                type: "EXPENSES",
                disabled: false,
            },
            {
                id: "cat-expense-1-2",
                name: "Cafe",
                type: "EXPENSES",
                disabled: false,
            },
        ],
    },
    {
        id: "cat-expense-2",
        name: "Home and household",
        type: "EXPENSES",
        disabled: false,
        subcategories: [
            {
                id: "cat-expense-2-1",
                name: "Utilities",
                type: "EXPENSES",
                disabled: false,
            },
            {
                id: "cat-expense-2-2",
                name: "Repairs",
                type: "EXPENSES",
                disabled: false,
            },
        ],
    },
];
