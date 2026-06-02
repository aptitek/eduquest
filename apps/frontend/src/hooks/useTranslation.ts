import { create } from 'zustand';
import { fr } from '../locales/fr';
import { en } from '../locales/en';

export type LocaleType = 'fr' | 'en';
type TranslationNode = string | { [key: string]: TranslationNode };
const LOCALE_STORAGE_KEY = 'eduquest_locale';

interface TranslationStore {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    persistLocale(locale);
    set({ locale });
  },
}));

const translations = { fr, en };
export const MISSING_TRANSLATION_PREFIX = '[[MISSING I18N: ';
export const MISSING_TRANSLATION_SUFFIX = ']]';

export function formatMissingTranslation(path: string, isDevelopment = import.meta.env.DEV) {
  return isDevelopment ? `${MISSING_TRANSLATION_PREFIX}${path}${MISSING_TRANSLATION_SUFFIX}` : path;
}

export function isMissingTranslation(value: string) {
  return value.startsWith(MISSING_TRANSLATION_PREFIX) && value.endsWith(MISSING_TRANSLATION_SUFFIX);
}

export function isSupportedLocale(value: unknown): value is LocaleType {
  return value === 'fr' || value === 'en';
}

function getInitialLocale(): LocaleType {
  if (typeof window === 'undefined') return 'fr';

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isSupportedLocale(storedLocale)) return storedLocale;

  const browserLocales = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language];
  const inferredLocale = browserLocales.find((candidate) =>
    candidate?.toLowerCase().startsWith('en')
  );

  return inferredLocale ? 'en' : 'fr';
}

function persistLocale(locale: LocaleType) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function resolveTranslation(locale: LocaleType, path: string, isDevelopment = import.meta.env.DEV) {
  const keys = path.split('.');
  let result: TranslationNode = translations[locale];

  for (const key of keys) {
    if (typeof result === 'object' && result !== null && key in result) {
      result = result[key];
    } else {
      return formatMissingTranslation(path, isDevelopment);
    }
  }

  return typeof result === 'string' ? result : formatMissingTranslation(path, isDevelopment);
}

export function useTranslation() {
  const { locale, setLocale } = useTranslationStore();

  const t = (path: string): string => {
    return resolveTranslation(locale, path);
  };

  const tMaybe = (value: string): string => {
    const translated = resolveTranslation(locale, value);
    return isMissingTranslation(translated) ? value : translated;
  };

  return { t, tMaybe, locale, setLocale };
}
