export type UUID = string;

export type AccountType = "CASH" | "CARD" | "BANK_ACCOUNT" | "DEBT";
export type CategoryType = "INCOME" | "EXPENSES" | "TRANSFER";
export type TransactionType = "EXPENSE" | "INCOME" | "CHANGE_BALANCE" | "TRANSFER";
export type TransactionDirection = "INCREASE" | "DECREASE";
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "UAH"
  | "PLN"
  | "CHF"
  | "CAD"
  | "AUD"
  | "SEK"
  | "NOK"
  | "JPY"
  | "CZK";

export interface UserApp {
  id?: UUID;
  name?: string;
  email?: string;
  baseCurrency?: CurrencyCode;
}

export interface Category {
  id: UUID;
  parentId?: UUID | null;
  name: string;
  description?: string | null;
  userId?: UUID | null;
  type: CategoryType;
  disabled: boolean;
  icon?: string | null;
  categoryTemplateId?: UUID | null;
}

export interface Account {
  id: UUID;
  name: string;
  description?: string | null;
  userId?: UUID | null;
  type: AccountType;
  currency?: CurrencyCode | null;
}

export interface CategoryDto {
  id?: UUID;
  parentId?: UUID | null;
  parentName?: string | null;
  name: string;
  description?: string | null;
  userId?: UUID | null;
  type: CategoryType;
  disabled: boolean;
  icon?: string | null;
  categoryTemplateId?: UUID | null;
}

export interface CategoryReactDto {
  id: UUID;
  name: string;
  description?: string | null;
  type: CategoryType;
  disabled: boolean;
  subcategories?: CategoryReactDto[];
  icon?: string | null;
  categoryTemplateId?: UUID | null;
}

export interface AccountDto {
  id?: UUID;
  userId?: UUID | null;
  name: string;
  description?: string | null;
  type: AccountType;
  balance?: number | null;
  balanceInBase?: number | null;
  currency?: CurrencyCode | null;
}

export interface TransferDto {
  id?: UUID;
  date?: number | null;
  comment?: string | null;
  userId?: UUID | null;
  fromAccount?: Account | null;
  toAccount?: Account | null;
}

export interface TransactionDto {
  id?: UUID;
  date: string;
  category: Category;
  account: Account;
  direction: TransactionDirection;
  type: TransactionType;
  changeBalanceId?: UUID | null;
  amount: number;
  amountInBase?: number | null;
  currency?: CurrencyCode | null;
  user?: UserApp | null;
  comment?: string | null;
  transfer?: TransferDto | null;
}

export interface ChangeBalanceDto {
  id?: UUID;
  date: string;
  account: Account;
  newBalance: number;
  user?: UserApp | null;
  comment?: string | null;
}

export interface BudgetDto {
  id?: UUID;
  month: string;
  totalIncome?: number | null;
  totalExpense?: number | null;
  user?: UserApp | null;
  baseCurrency?: CurrencyCode | null;
}

export interface BudgetCategoryDetailedDto {
  id?: UUID;
  budgetId: UUID;
  category: Category;
  type: CategoryType;
  planAmount: number;
  factAmount?: number | null;
  leftover?: number | null;
  comment?: string | null;
  currency?: CurrencyCode | null;
  planAmountInBase?: number | null;
  factAmountInBase?: number | null;
  leftoverInBase?: number | null;
  planAmountOriginal?: number | null;
}

export interface BudgetDetailedDto {
  id: UUID;
  month: string;
  totalIncome?: number | null;
  totalExpense?: number | null;
  totalIncomeFact?: number | null;
  totalIncomeLeftover?: number | null;
  totalExpenseFact?: number | null;
  totalExpenseLeftover?: number | null;
  user?: UserApp | null;
  baseCurrency?: CurrencyCode | null;
  incomeBudgetCategories?: BudgetCategoryDetailedDto[];
  expenseBudgetCategories?: BudgetCategoryDetailedDto[];
  incomeCategories?: CategoryDto[];
  expenseCategories?: CategoryDto[];
}

export interface AccountSummary {
  id: UUID;
  name: string;
  type: AccountType;
  balance: number;
  balanceInBase?: number | null;
  currency?: CurrencyCode | null;
}

export interface CategoryBreakdown {
  categoryId: UUID;
  name: string;
  icon?: string | null;
  amount: number;
}

export interface TrendPoint {
  label: string;
  amount: number;
}

export interface BudgetProgressItem {
  budgetId: UUID;
  monthLabel: string;
  plannedExpense: number;
  actualExpense: number;
  plannedIncome?: number | null;
  actualIncome?: number | null;
  expenseCompletionPercent: number;
  incomeCompletionPercent: number;
  baseCurrency?: CurrencyCode | null;
}

export interface RecentTransactionItem {
  id: UUID;
  dateLabel: string;
  categoryName: string;
  accountName: string;
  amount: number;
  direction: TransactionDirection;
  categoryType: CategoryType;
  currency?: CurrencyCode | null;
  amountInBase?: number | null;
}

export interface DashboardSummary {
  startDate: string;
  endDate: string;
  accounts: AccountSummary[];
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  expenseBreakdown: CategoryBreakdown[];
  incomeBreakdown: CategoryBreakdown[];
  topExpenseCategories: CategoryBreakdown[];
  expenseTrend: TrendPoint[];
  incomeTrend: TrendPoint[];
  budgetProgress: BudgetProgressItem[];
  recentTransactions: RecentTransactionItem[];
  baseCurrency: CurrencyCode;
}
