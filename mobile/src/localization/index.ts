import { I18n } from "i18n-js";
import type { TranslateOptions } from "i18n-js/typings/typing";
import { getLocales } from "expo-localization";
import de from "./catalogs/de";
import es from "./catalogs/es";
import fr from "./catalogs/fr";
import itIT from "./catalogs/it-IT";
import nlNL from "./catalogs/nl-NL";
import pl from "./catalogs/pl";
import pt from "./catalogs/pt";
import ptBR from "./catalogs/pt-BR";
import trTR from "./catalogs/tr-TR";
import ua from "./catalogs/ua";

export const DEFAULT_LOCALE = "en";
export const AVAILABLE_LOCALES = [
  "en",
  "ua",
  "es",
  "pt",
  "fr",
  "pl",
  "de",
  "it-IT",
  "nl-NL",
  "tr-TR",
  "ja-JP",
  "ko-KR",
  "zh-CN",
  "zh-TW",
  "pt-BR",
] as const;

export type AvailableLocale = (typeof AVAILABLE_LOCALES)[number];

export const getDeviceLocale = (): string | null => {
  try {
    return getLocales()[0]?.languageTag ?? null;
  } catch {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
    } catch {
      return null;
    }
  }
};

const i18n = new I18n({
  ...Object.fromEntries(AVAILABLE_LOCALES.map((locale) => [locale, {}])),
  de,
  es,
  fr,
  "it-IT": itIT,
  "nl-NL": nlNL,
  pl,
  pt,
  "pt-BR": ptBR,
  "tr-TR": trTR,
  ua,
});
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
  const aliases: Record<string, AvailableLocale> = {
    en: "en",
    "en-us": "en",
    "en-gb": "en",
    ua: "ua",
    uk: "ua",
    "uk-ua": "ua",
    ru: "ua",
    "ru-ru": "ua",
    es: "es",
    "es-es": "es",
    pt: "pt",
    "pt-pt": "pt",
    fr: "fr",
    "fr-fr": "fr",
    pl: "pl",
    "pl-pl": "pl",
    de: "de",
    "de-de": "de",
    it: "it-IT",
    "it-it": "it-IT",
    nl: "nl-NL",
    "nl-nl": "nl-NL",
    tr: "tr-TR",
    "tr-tr": "tr-TR",
    ja: "ja-JP",
    "ja-jp": "ja-JP",
    ko: "ko-KR",
    "ko-kr": "ko-KR",
    zh: "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    "pt-br": "pt-BR",
  };
  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const baseLocale = normalized.split("-")[0];
  if (baseLocale && aliases[baseLocale]) {
    return aliases[baseLocale];
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
  ua: "uk-UA",
  es: "es",
  pt: "pt-PT",
  fr: "fr",
  pl: "pl",
  de: "de",
  "it-IT": "it-IT",
  "nl-NL": "nl-NL",
  "tr-TR": "tr-TR",
  "ja-JP": "ja-JP",
  "ko-KR": "ko-KR",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  "pt-BR": "pt-BR",
};

export const getCurrentIntlLocale = (): string => intlLocales[getCurrentLocale()];
