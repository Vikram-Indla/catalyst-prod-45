import { useState, useEffect, useCallback } from 'react';

type WikiLang = 'en' | 'ar';

export function useWikiLang() {
  const [lang, setLangState] = useState<WikiLang>(() => {
    return (localStorage.getItem('catalyst-wiki-lang') as WikiLang) || 'en';
  });

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('catalyst-wiki-lang', lang);
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLangState(prev => prev === 'en' ? 'ar' : 'en');
  }, []);

  return { lang, toggleLang };
}
