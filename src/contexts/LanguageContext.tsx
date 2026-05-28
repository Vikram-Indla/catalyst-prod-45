/**
 * LanguageContext — user's preferred display language for Catalyst.
 *
 * 'en' (default): issue text shown in English; "Translate to Arabic" button offered.
 * 'ar': issue text shown in Arabic where a translation exists; "Translate to English" button offered.
 *
 * Persisted to localStorage so the preference survives page reload.
 */
import React, { createContext, useContext, useState } from 'react';

export type DisplayLang = 'en' | 'ar';

const STORAGE_KEY = 'catalyst_display_lang';

interface LanguageContextValue {
  displayLang: DisplayLang;
  setDisplayLang: (lang: DisplayLang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  displayLang: 'en',
  setDisplayLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [displayLang, setDisplayLangState] = useState<DisplayLang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch {
      /* SSR / private-browsing safe */
    }
    return 'en';
  });

  const setDisplayLang = (lang: DisplayLang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* SSR safe */
    }
    setDisplayLangState(lang);
  };

  return (
    <LanguageContext.Provider value={{ displayLang, setDisplayLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
