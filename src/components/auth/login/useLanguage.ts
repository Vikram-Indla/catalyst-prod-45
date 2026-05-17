import { useState, useEffect } from 'react';
import type { Lang } from './translations';

const STORAGE_KEY = 'catalyst-lang';

function applyLang(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function useLanguage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    return stored === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    applyLang(lang);
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'ar' : 'en';
    localStorage.setItem(STORAGE_KEY, next);
    applyLang(next);
    setLang(next);
  };

  return { lang, toggleLang };
}
