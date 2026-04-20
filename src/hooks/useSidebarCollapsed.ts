import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cp.sidebar.expanded';

export function useSidebarCollapsed(defaultExpanded = true) {
  const [expanded, setExpandedState] = useState(defaultExpanded);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved != null) setExpandedState(saved === 'true');
  }, []);

  const setExpanded = useCallback((next: boolean) => {
    setExpandedState(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const toggle = useCallback(() => setExpanded(!expanded), [expanded, setExpanded]);

  return { expanded, collapsed: !expanded, setExpanded, toggle };
}
