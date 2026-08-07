import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  setI18nLocale,
  translate,
  type AvailableLocale,
} from "./index";

type LocalizationContextValue = {
  locale: AvailableLocale;
  setLocale: (locale: string) => void;
  t: typeof translate;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AvailableLocale>(() => setI18nLocale(DEFAULT_LOCALE));

  const setLocale = useCallback((nextLocale: string) => {
    const normalized = normalizeLocale(nextLocale);
    setI18nLocale(normalized);
    setLocaleState(normalized);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: translate }),
    [locale, setLocale],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used inside LocalizationProvider");
  }
  return context;
};
