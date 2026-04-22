import { useCallback, useState } from 'react';
import { useSearchQuery } from './useSearchQuery';
import { addRecentSearch } from '../utils/recentSearches';
import type { SearchItem, SearchState } from '../types';

export interface TopNavSearchController {
  query: string;
  isOpen: boolean;
  state: SearchState;
  items: SearchItem[];
  activeIndex: number;
  setQuery: (q: string) => void;
  setActiveIndex: (i: number) => void;
  open: () => void;
  close: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  navigate: (item: SearchItem) => void;
}

export function useTopNavSearchController(): TopNavSearchController {
  const [query, setQueryRaw] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { items, state } = useSearchQuery(query);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    setActiveIndex(-1);
    if (!isOpen) setIsOpen(true);
  }, [isOpen]);

  const navigate = useCallback(
    (item: SearchItem) => {
      if (query.trim().length >= 2) addRecentSearch(query);
      close();
      window.location.href = item.href;
    },
    [query, close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, -1));
          break;
        case 'Enter':
          if (activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            navigate(items[activeIndex]);
          } else if (query.trim().length >= 2) {
            addRecentSearch(query);
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        default:
          break;
      }
    },
    [isOpen, items, activeIndex, navigate, query, close],
  );

  return {
    query,
    isOpen,
    state,
    items,
    activeIndex,
    setQuery,
    setActiveIndex,
    open,
    close,
    handleKeyDown,
    navigate,
  };
}
