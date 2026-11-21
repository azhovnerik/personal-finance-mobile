import type { CurrencyCode } from "../api/dto";

const POPULAR_CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "UAH", "PLN"];

export const buildCurrencyOptions = (currencies: CurrencyCode[], baseCurrency?: CurrencyCode | null) => {
  const priority = [baseCurrency, ...POPULAR_CURRENCIES];
  const rank = (code: CurrencyCode) => {
    const index = priority.indexOf(code);
    return index < 0 ? priority.length : index;
  };
  return [...new Set(currencies)]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((code) => ({ value: code, label: code }));
};
