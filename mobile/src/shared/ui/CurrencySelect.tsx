import { useMemo } from "react";
import type { CurrencyCode } from "../api/dto";
import { buildCurrencyOptions } from "../utils/currencyOptions";
import { Select } from "./Select";

type CurrencySelectProps = {
  currencies: CurrencyCode[];
  baseCurrency?: CurrencyCode | null;
  value?: CurrencyCode | null;
  placeholder?: string;
  onChange: (value: CurrencyCode) => void;
};

export function CurrencySelect({ currencies, baseCurrency, onChange, ...props }: CurrencySelectProps) {
  const options = useMemo(() => buildCurrencyOptions(currencies, baseCurrency), [currencies, baseCurrency]);
  return <Select {...props} options={options} searchable onChange={(value) => onChange(value as CurrencyCode)} />;
}
