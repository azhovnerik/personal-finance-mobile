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

export const mockUser: UserApp = {
  id: "user-1",
  name: "Олена",
  email: "olena@example.com",
  baseCurrency: "UAH",
};

export const mockAccounts: Account[] = [
  {
    id: "acc-1",
    name: "Основной счет",
    description: "Карточный счет для ежедневных расходов",
    userId: mockUser.id,
    type: "BANK_ACCOUNT",
    currency: "UAH",
  },
  {
    id: "acc-2",
    name: "Карта путешествий",
    description: "Резерв для поездок",
    userId: mockUser.id,
    type: "CARD",
    currency: "UAH",
  },
  {
    id: "acc-3",
    name: "Наличные",
    description: "Кошелек",
    userId: mockUser.id,
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
  name: "Продукты",
  description: "Супермаркет и кафе",
  userId: mockUser.id,
  type: "EXPENSES",
  disabled: false,
  icon: "shopping-cart",
};

const categoryHome: Category = {
  id: "cat-2",
  name: "Дом",
  description: "Коммунальные и быт",
  userId: mockUser.id,
  type: "EXPENSES",
  disabled: false,
  icon: "home",
};

const categoryTransport: Category = {
  id: "cat-3",
  name: "Транспорт",
  description: "Такси и транспорт",
  userId: mockUser.id,
  type: "EXPENSES",
  disabled: false,
  icon: "truck",
};

const categorySalary: Category = {
  id: "cat-4",
  name: "Зарплата",
  description: "Основной доход",
  userId: mockUser.id,
  type: "INCOME",
  disabled: false,
  icon: "wallet",
};

const categoryFreelance: Category = {
  id: "cat-5",
  name: "Фриланс",
  description: "Проектные выплаты",
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
    user: mockUser,
    comment: "Супермаркет",
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
    user: mockUser,
    comment: "Такси",
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
    user: mockUser,
    comment: "Проект",
  },
];

const expenseBreakdown: CategoryBreakdown[] = [
  { categoryId: categoryGroceries.id, name: "Продукты", icon: "shopping-cart", amount: 16800 },
  { categoryId: categoryHome.id, name: "Дом и быт", icon: "home", amount: 10350 },
  { categoryId: categoryTransport.id, name: "Транспорт", icon: "truck", amount: 7100 },
];

const incomeBreakdown: CategoryBreakdown[] = [
  { categoryId: categorySalary.id, name: "Зарплата", icon: "wallet", amount: 64000 },
  { categoryId: categoryFreelance.id, name: "Фриланс", icon: "briefcase", amount: 18500 },
];

const topExpenseCategories: CategoryBreakdown[] = [
  { categoryId: categoryGroceries.id, name: "Продукты", icon: "shopping-cart", amount: 16800 },
  { categoryId: categoryHome.id, name: "Дом и быт", icon: "home", amount: 10350 },
  { categoryId: categoryTransport.id, name: "Транспорт", icon: "truck", amount: 7100 },
];

const recentTransactions: RecentTransactionItem[] = [
  {
    id: "rt-1",
    dateLabel: "Сегодня, 12:40",
    categoryName: "Продукты",
    accountName: "Основной счет",
    amount: 2350,
    direction: "DECREASE",
    categoryType: "EXPENSES",
    currency: "UAH",
    amountInBase: 2350,
  },
  {
    id: "rt-2",
    dateLabel: "Вчера, 19:10",
    categoryName: "Сбережения",
    accountName: "Карта путешествий",
    amount: 4000,
    direction: "DECREASE",
    categoryType: "EXPENSES",
    currency: "UAH",
    amountInBase: 4000,
  },
  {
    id: "rt-3",
    dateLabel: "28 фев",
    categoryName: "Зарплата",
    accountName: "Основной счет",
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
    { label: "Нед 1", amount: 11200 },
    { label: "Нед 2", amount: 9800 },
    { label: "Нед 3", amount: 12300 },
    { label: "Нед 4", amount: 13600 },
  ],
  incomeTrend: [
    { label: "Нед 1", amount: 18000 },
    { label: "Нед 2", amount: 22000 },
    { label: "Нед 3", amount: 19500 },
    { label: "Нед 4", amount: 23000 },
  ],
  budgetProgress: [
    {
      budgetId: "budget-1",
      monthLabel: "Март 2024",
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
      monthLabel: "Апрель 2024",
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
    month: "Март 2024",
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
    month: "Апрель 2024",
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
    name: "Доход",
    type: "INCOME",
    disabled: false,
    subcategories: [
      {
        id: "cat-income-1-1",
        name: "Зарплата",
        type: "INCOME",
        disabled: false,
      },
      {
        id: "cat-income-1-2",
        name: "Бонусы",
        type: "INCOME",
        disabled: false,
      },
    ],
  },
  {
    id: "cat-income-2",
    name: "Фриланс",
    type: "INCOME",
    disabled: false,
    subcategories: [
      {
        id: "cat-income-2-1",
        name: "Проекты",
        type: "INCOME",
        disabled: false,
      },
      {
        id: "cat-income-2-2",
        name: "Консалтинг",
        type: "INCOME",
        disabled: false,
      },
    ],
  },
  {
    id: "cat-expense-1",
    name: "Расходы",
    type: "EXPENSES",
    disabled: false,
    subcategories: [
      {
        id: "cat-expense-1-1",
        name: "Продукты",
        type: "EXPENSES",
        disabled: false,
      },
      {
        id: "cat-expense-1-2",
        name: "Кафе",
        type: "EXPENSES",
        disabled: false,
      },
    ],
  },
  {
    id: "cat-expense-2",
    name: "Дом и быт",
    type: "EXPENSES",
    disabled: false,
    subcategories: [
      {
        id: "cat-expense-2-1",
        name: "Коммунальные",
        type: "EXPENSES",
        disabled: false,
      },
      {
        id: "cat-expense-2-2",
        name: "Ремонт",
        type: "EXPENSES",
        disabled: false,
      },
    ],
  },
];
