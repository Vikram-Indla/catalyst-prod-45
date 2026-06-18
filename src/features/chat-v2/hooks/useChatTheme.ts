import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cv2-chat-theme';
export type ChatTheme = 'dark' | 'light';

function readInitial(): ChatTheme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export function useChatTheme(): { theme: ChatTheme; toggle: () => void; setTheme: (t: ChatTheme) => void } {
  const [theme, setThemeState] = useState<ChatTheme>(readInitial);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle, setTheme: setThemeState };
}
