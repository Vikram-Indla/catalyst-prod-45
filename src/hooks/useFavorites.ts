/**
 * useFavorites — Manage user's favorite navigation items
 * 
 * Persists favorite paths in localStorage for quick access.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage errors
    }
  }, [favorites]);

  const toggleFavorite = useCallback((path: string) => {
    setFavorites(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  }, []);

  const addFavorite = useCallback((path: string) => {
    setFavorites(prev => 
      prev.includes(path) ? prev : [...prev, path]
    );
  }, []);

  const removeFavorite = useCallback((path: string) => {
    setFavorites(prev => prev.filter(p => p !== path));
  }, []);

  const isFavorite = useCallback((path: string) => {
    return favorites.includes(path);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return { 
    favorites, 
    toggleFavorite, 
    addFavorite, 
    removeFavorite, 
    isFavorite, 
    clearFavorites 
  };
}
