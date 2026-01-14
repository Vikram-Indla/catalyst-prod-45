/**
 * useSidebarState — Persistent sidebar collapse state
 * 
 * Manages sidebar expanded/collapsed state with localStorage persistence.
 * Used by all sidebar components for consistent collapse behavior.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-sidebar-collapsed';

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggle = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const collapse = useCallback(() => setIsCollapsed(true), []);
  const expand = useCallback(() => setIsCollapsed(false), []);

  return { 
    isCollapsed, 
    isExpanded: !isCollapsed,
    toggle, 
    collapse, 
    expand 
  };
}
