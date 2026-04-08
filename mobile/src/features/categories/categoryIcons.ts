export type CategoryIconOption = {
  key: string;
  label: string;
  type?: string | null;
  group?: string | null;
  provider?: string | null;
  asset?: string | null;
  aliases?: string[] | null;
};

export const FALLBACK_CATEGORY_ICONS: CategoryIconOption[] = [
  { key: "expense.groceries", label: "Groceries", type: "EXPENSES", group: "food", provider: "fluent", asset: "shopping-cart" },
  { key: "expense.restaurant", label: "Restaurant", type: "EXPENSES", group: "food", provider: "fluent", asset: "fork-and-knife-with-plate" },
  { key: "expense.coffee", label: "Coffee", type: "EXPENSES", group: "food", provider: "fluent", asset: "hot-beverage" },
  { key: "expense.transport", label: "Transport", type: "EXPENSES", group: "transport", provider: "fluent", asset: "bus" },
  { key: "expense.taxi", label: "Taxi", type: "EXPENSES", group: "transport", provider: "fluent", asset: "taxi" },
  { key: "expense.fuel", label: "Fuel", type: "EXPENSES", group: "transport", provider: "fluent", asset: "fuel-pump" },
  { key: "expense.home", label: "Home", type: "EXPENSES", group: "home", provider: "fluent", asset: "house" },
  { key: "expense.rent", label: "Rent", type: "EXPENSES", group: "home", provider: "fluent", asset: "office-building" },
  { key: "expense.utilities", label: "Utilities", type: "EXPENSES", group: "home", provider: "fluent", asset: "electric-plug" },
  { key: "expense.internet_mobile", label: "Internet & mobile", type: "EXPENSES", group: "home", provider: "fluent", asset: "mobile-phone" },
  { key: "expense.health", label: "Health", type: "EXPENSES", group: "health", provider: "fluent", asset: "hospital" },
  { key: "expense.pharmacy", label: "Pharmacy", type: "EXPENSES", group: "health", provider: "fluent", asset: "pill" },
  { key: "expense.sport", label: "Sport", type: "EXPENSES", group: "lifestyle", provider: "fluent", asset: "soccer-ball" },
  { key: "expense.clothes", label: "Clothes", type: "EXPENSES", group: "shopping", provider: "fluent", asset: "t-shirt" },
  { key: "expense.shopping", label: "Shopping", type: "EXPENSES", group: "shopping", provider: "fluent", asset: "shopping-bags" },
  { key: "expense.entertainment", label: "Entertainment", type: "EXPENSES", group: "lifestyle", provider: "fluent", asset: "video-game" },
  { key: "expense.travel", label: "Travel", type: "EXPENSES", group: "travel", provider: "fluent", asset: "airplane" },
  { key: "expense.education", label: "Education", type: "EXPENSES", group: "education", provider: "fluent", asset: "graduation-cap" },
  { key: "expense.gifts", label: "Gifts", type: "EXPENSES", group: "lifestyle", provider: "fluent", asset: "wrapped-gift" },
  { key: "expense.children", label: "Children", type: "EXPENSES", group: "family", provider: "fluent", asset: "children-crossing" },
  { key: "expense.pets", label: "Pets", type: "EXPENSES", group: "family", provider: "fluent", asset: "dog-face" },
  { key: "expense.subscriptions", label: "Subscriptions", type: "EXPENSES", group: "digital", provider: "fluent", asset: "credit-card" },
  { key: "expense.insurance", label: "Insurance", type: "EXPENSES", group: "finance", provider: "fluent", asset: "shield" },
  { key: "expense.bank_fees", label: "Bank fees", type: "EXPENSES", group: "finance", provider: "fluent", asset: "bank" },
  { key: "expense.debt_payment", label: "Debt payment", type: "EXPENSES", group: "finance", provider: "fluent", asset: "money-with-wings" },
  { key: "expense.other", label: "Other expense", type: "EXPENSES", group: "other", provider: "fluent", asset: "question-mark" },
  { key: "income.salary", label: "Salary", type: "INCOME", group: "income", provider: "fluent", asset: "money-bag" },
  { key: "income.freelance", label: "Freelance", type: "INCOME", group: "income", provider: "fluent", asset: "laptop" },
  { key: "income.business", label: "Business", type: "INCOME", group: "income", provider: "fluent", asset: "briefcase" },
  { key: "income.bonus", label: "Bonus", type: "INCOME", group: "income", provider: "fluent", asset: "party-popper" },
  { key: "income.gifts", label: "Gifts", type: "INCOME", group: "income", provider: "fluent", asset: "wrapped-gift" },
  { key: "income.cashback", label: "Cashback", type: "INCOME", group: "income", provider: "fluent", asset: "counterclockwise-arrows-button" },
  { key: "income.interest", label: "Interest", type: "INCOME", group: "income", provider: "fluent", asset: "chart-increasing" },
  { key: "income.investments", label: "Investments", type: "INCOME", group: "income", provider: "fluent", asset: "chart-increasing-with-yen" },
  { key: "income.rent", label: "Rent", type: "INCOME", group: "income", provider: "fluent", asset: "house" },
  { key: "income.refund", label: "Refund", type: "INCOME", group: "income", provider: "fluent", asset: "receipt" },
  { key: "income.sale", label: "Sale", type: "INCOME", group: "income", provider: "fluent", asset: "label" },
  { key: "income.other", label: "Other income", type: "INCOME", group: "other", provider: "fluent", asset: "coin" },
  { key: "transfer.between_accounts", label: "Between accounts", type: "TRANSFER", group: "transfer", provider: "fluent", asset: "left-right-arrow" },
  { key: "transfer.to_savings", label: "To savings", type: "TRANSFER", group: "transfer", provider: "fluent", asset: "money-bag" },
  { key: "transfer.from_savings", label: "From savings", type: "TRANSFER", group: "transfer", provider: "fluent", asset: "money-bag" },
  { key: "adjustment.balance", label: "Balance adjustment", type: "ADJUSTMENT", group: "adjustment", provider: "fluent", asset: "balance-scale" },
  { key: "debt.lent", label: "Debt lent", type: "DEBT", group: "debt", provider: "fluent", asset: "handshake" },
  { key: "debt.returned", label: "Debt returned", type: "DEBT", group: "debt", provider: "fluent", asset: "money-with-wings" },
];

const LEGACY_ICON_MAP: Record<string, string> = {
  "bi-basket": "expense.groceries",
  "bi-cup-straw": "expense.restaurant",
  "bi-cup-hot": "expense.coffee",
  "bi-bus-front": "expense.transport",
  "bi-fuel-pump": "expense.fuel",
  "bi-house": "expense.home",
  "bi-building": "expense.rent",
  "bi-plug": "expense.utilities",
  "bi-phone": "expense.internet_mobile",
  "bi-heart-pulse": "expense.health",
  "bi-shirt": "expense.clothes",
  "bi-bag-heart": "expense.shopping",
  "bi-airplane": "expense.travel",
  "bi-mortarboard": "expense.education",
  "bi-gift": "expense.gifts",
  "bi-gift-fill": "expense.gifts",
  "bi-controller": "expense.entertainment",
  "bi-credit-card": "expense.subscriptions",
  "bi-shield-check": "expense.insurance",
  "bi-bank": "expense.bank_fees",
  "bi-cash-stack": "income.salary",
  "bi-laptop": "income.freelance",
  "bi-piggy-bank": "transfer.to_savings",
  "bi-wallet": "income.other",
  "bi-wallet2": "income.other",
  "bi-three-dots": "expense.other",
  "bi-folder2-open": "expense.other",
  basket: "expense.groceries",
  food: "expense.restaurant",
  bag: "expense.shopping",
  home: "expense.home",
  car: "expense.transport",
  fuel: "expense.fuel",
  auto: "expense.transport",
  party: "expense.entertainment",
  tech: "expense.subscriptions",
  finance: "income.salary",
  shirt: "expense.clothes",
  "shopping-cart": "expense.groceries",
  wallet: "income.other",
  briefcase: "income.business",
  truck: "expense.transport",
};

const CATEGORY_ICON_KEYS = new Set(FALLBACK_CATEGORY_ICONS.map((icon) => icon.key));

export const normalizeCategoryIcon = (value?: string | null): string | null => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  if (CATEGORY_ICON_KEYS.has(normalized)) {
    return normalized;
  }
  return LEGACY_ICON_MAP[normalized] ?? null;
};
