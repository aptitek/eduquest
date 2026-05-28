import { create } from 'zustand';
import { fr } from '../locales/fr';
import { en } from '../locales/en';

type LocaleType = 'fr' | 'en';
type TranslationNode = string | { [key: string]: TranslationNode };

interface TranslationStore {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  locale: 'fr',
  setLocale: (locale) => set({ locale }),
}));

const translations = { fr, en };
export const MISSING_TRANSLATION_PREFIX = '[[MISSING I18N: ';
export const MISSING_TRANSLATION_SUFFIX = ']]';

export function formatMissingTranslation(path: string, isDevelopment = import.meta.env.DEV) {
  return isDevelopment ? `${MISSING_TRANSLATION_PREFIX}${path}${MISSING_TRANSLATION_SUFFIX}` : path;
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

  return { t, locale, setLocale };
}
