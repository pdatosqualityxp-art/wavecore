import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import ca from './ca.json';
import en from './en.json';
import es from './es.json';

export type Language = 'ca' | 'es' | 'en';
type TranslationKey = keyof typeof es;
type TranslationDictionary = Record<TranslationKey, string>;

const translations: Record<Language, TranslationDictionary> = { ca, en, es };

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  const savedLanguage = localStorage.getItem('wavecore-language');
  return savedLanguage === 'ca' || savedLanguage === 'en' ? savedLanguage : 'es';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (nextLanguage: Language) => {
        localStorage.setItem('wavecore-language', nextLanguage);
        setLanguageState(nextLanguage);
      },
      t: (key: TranslationKey) => translations[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
