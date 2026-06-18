/**
 * useRecentSearches — small localStorage-backed queue of the user's last
 * search queries. Persisted across reloads. Capped at MAX entries so the
 * UI never has to scroll the recents.
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cv2:recent-searches:v1';
const MAX = 6;

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function useRecentSearches(): {
  recents: string[];
  record: (q: string) => void;
  clear: () => void;
} {
  const [recents, setRecents] = useState<string[]>(read);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecents(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const record = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecents(prev => {
      const next = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecents([]);
    write([]);
  }, []);

  return { recents, record, clear };
}
