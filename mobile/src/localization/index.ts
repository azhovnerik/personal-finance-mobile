import { I18n } from "i18n-js";
import type { TranslateOptions } from "i18n-js/typings/typing";

export const DEFAULT_LOCALE = "en";
export const AVAILABLE_LOCALES = ["en"] as const;

export type AvailableLocale = (typeof AVAILABLE_LOCALES)[number];

const i18n = new I18n({ en: {} });
i18n.defaultLocale = DEFAULT_LOCALE;
i18n.locale = DEFAULT_LOCALE;
i18n.enableFallback = true;
// English source messages are the stable translation keys. Use a separator
// that cannot occur in normal UI copy so sentences containing dots stay intact.
i18n.defaultSeparator = "\u0000";

export const normalizeLocale = (locale?: string | null): AvailableLocale => {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  const normalized = locale.replace("_", "-").toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  return DEFAULT_LOCALE;
};

export const setI18nLocale = (locale?: string | null) => {
  const normalized = normalizeLocale(locale);
  i18n.locale = normalized;
  return normalized;
};

export const translate = (message: string, options?: TranslateOptions): string =>
  i18n.t(message, { defaultValue: message, ...options });

const cyrillicPattern = /[А-Яа-яЁёЄєІіЇїҐґ]/;

export const localizeSystemMessage = (message: unknown, fallback: string): string => {
  if (typeof message !== "string") {
    return translate(fallback);
  }

  const normalized = message.trim();
  if (!normalized || cyrillicPattern.test(normalized)) {
    return translate(fallback);
  }

  return translate(normalized);
};

export const getCurrentLocale = (): AvailableLocale => normalizeLocale(i18n.locale);

const intlLocales: Record<AvailableLocale, string> = {
  en: "en-US",
};

export const getCurrentIntlLocale = (): string => intlLocales[getCurrentLocale()];
