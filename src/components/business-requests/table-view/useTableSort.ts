import { useState, useCallback } from 'react';
import { SortConfig } from './types';

export function useTableSort(initialConfig: SortConfig) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialConfig);

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  return { sortConfig, handleSort };
}
