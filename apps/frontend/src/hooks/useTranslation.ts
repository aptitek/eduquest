import { create } from 'zustand';
import { fr } from '../locales/fr';
import { en } from '../locales/en';

type LocaleType = 'fr' | 'en';

interface TranslationStore {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  locale: 'fr',
  setLocale: (locale) => set({ locale }),
}));

const translations = { fr, en };

export function useTranslation() {
  const { locale, setLocale } = useTranslationStore();

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[locale];

    for (const key of keys) {
      if (result && key in result) {
        result = result[key];
      } else {
        return path;
      }
    }

    return typeof result === 'string' ? result : path;
  };

  return { t, locale, setLocale };
}
