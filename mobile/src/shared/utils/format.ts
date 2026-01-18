import { CurrencyCode } from "../api/dto";

const currencySymbols: Record<CurrencyCode, string> = {
  UAH: "₴",
  USD: "$",
  EUR: "€",
  GBP: "£",
  PLN: "zł",
  CHF: "CHF",
  CAD: "C$",
  AUD: "A$",
  SEK: "kr",
  NOK: "kr",
  JPY: "¥",
  CZK: "Kč",
};

export const formatCurrency = (amount: number, currency: CurrencyCode = "UAH") => {
  const symbol = currencySymbols[currency] ?? currency;
  const formatted = typeof Intl !== "undefined"
    ? new Intl.NumberFormat("uk-UA", {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount)
    : amount.toFixed(2);
  return `${symbol} ${formatted}`;
};

export const formatDateRange = (start: string, end: string) => {
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("uk-UA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return `${formatDate(start)} — ${formatDate(end)}`;
};
