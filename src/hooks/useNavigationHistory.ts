/**
 * useNavigationHistory — Track recently visited navigation items
 * 
 * Persists recent nav items in localStorage for quick access.
 */

import { useState, useEffect, useCallback } from 'react';

interface RecentItem {
  path: string;
  title: string;
  icon: string;
  timestamp: number;
}

const STORAGE_KEY = 'catalyst-recent-nav';
const MAX_ITEMS = 5;

export function useNavigationHistory() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentItems));
    } catch {
      // Ignore storage errors
    }
  }, [recentItems]);

  const addToHistory = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setRecentItems(prev => {
      const filtered = prev.filter(i => i.path !== item.path);
      return [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecentItems([]);
  }, []);

  const formatTimestamp = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }, []);

  return { recentItems, addToHistory, clearHistory, formatTimestamp };
}
