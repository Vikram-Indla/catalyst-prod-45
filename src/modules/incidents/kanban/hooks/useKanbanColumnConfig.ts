/**
 * Hook for managing Kanban column configuration (admin)
 * Persists to localStorage (could be moved to DB for multi-user)
 */

import { useState, useCallback, useEffect } from 'react';
import type { IncidentStatus } from '@/types/incident';

const STORAGE_KEY = 'incident-kanban-column-config';

// Required columns that cannot be removed
export const REQUIRED_COLUMNS: IncidentStatus[] = [
  'open',
  'triage',
  'in_progress',
  'resolved',
  'closed',
];

// Statuses that can NEVER be added as columns
export const FORBIDDEN_COLUMNS: IncidentStatus[] = [
  'to_committee', // Committee is never a column
  'converted',    // Converted is a terminal state, not a workflow column
];

// All possible workflow statuses that could be columns
export const ALL_WORKFLOW_STATUSES: IncidentStatus[] = [
  'open',
  'triage',
  'in_progress',
  'resolved',
  'closed',
];

interface ColumnConfig {
  statuses: IncidentStatus[];
  order: number[];
}

const defaultConfig: ColumnConfig = {
  statuses: [...REQUIRED_COLUMNS],
  order: [0, 1, 2, 3, 4], // Default order matches REQUIRED_COLUMNS
};

export function useKanbanColumnConfig() {
  const [config, setConfig] = useState<ColumnConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that all required columns are present
        const hasAllRequired = REQUIRED_COLUMNS.every(col => 
          parsed.statuses?.includes(col)
        );
        if (hasAllRequired && parsed.statuses?.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return defaultConfig;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage errors
    }
  }, [config]);

  // Get ordered statuses
  const orderedStatuses = useCallback((): IncidentStatus[] => {
    // Create a copy and sort by order index
    return [...config.statuses].sort((a, b) => {
      const idxA = config.statuses.indexOf(a);
      const idxB = config.statuses.indexOf(b);
      const orderA = config.order[idxA] ?? idxA;
      const orderB = config.order[idxB] ?? idxB;
      return orderA - orderB;
    });
  }, [config]);

  // Check if a status can be removed
  const canRemove = useCallback((status: IncidentStatus): boolean => {
    return !REQUIRED_COLUMNS.includes(status);
  }, []);

  // Check if a status can be added
  const canAdd = useCallback((status: IncidentStatus): boolean => {
    if (FORBIDDEN_COLUMNS.includes(status)) return false;
    if (config.statuses.includes(status)) return false;
    return ALL_WORKFLOW_STATUSES.includes(status);
  }, [config.statuses]);

  // Get available statuses that can be added
  const getAddableStatuses = useCallback((): IncidentStatus[] => {
    return ALL_WORKFLOW_STATUSES.filter(s => canAdd(s));
  }, [canAdd]);

  // Add a column
  const addColumn = useCallback((status: IncidentStatus): { success: boolean; error?: string } => {
    if (!canAdd(status)) {
      if (FORBIDDEN_COLUMNS.includes(status)) {
        return { success: false, error: `"${status}" cannot be added as a column` };
      }
      if (config.statuses.includes(status)) {
        return { success: false, error: `"${status}" is already a column` };
      }
      return { success: false, error: `"${status}" is not a valid workflow status` };
    }

    setConfig(prev => ({
      statuses: [...prev.statuses, status],
      order: [...prev.order, prev.statuses.length],
    }));
    return { success: true };
  }, [canAdd, config.statuses]);

  // Remove a column
  const removeColumn = useCallback((status: IncidentStatus): { success: boolean; error?: string } => {
    if (!canRemove(status)) {
      return { 
        success: false, 
        error: `"${status}" is a required column and cannot be removed` 
      };
    }

    const idx = config.statuses.indexOf(status);
    if (idx === -1) {
      return { success: false, error: `"${status}" is not currently a column` };
    }

    setConfig(prev => {
      const newStatuses = prev.statuses.filter(s => s !== status);
      const newOrder = prev.order.filter((_, i) => i !== idx);
      // Renormalize order indices
      const sorted = [...newOrder].sort((a, b) => a - b);
      const normalized = newOrder.map(o => sorted.indexOf(o));
      return { statuses: newStatuses, order: normalized };
    });
    return { success: true };
  }, [canRemove, config.statuses]);

  // Reorder columns
  const reorderColumns = useCallback((newOrder: IncidentStatus[]) => {
    // Validate all required columns are present
    const hasAllRequired = REQUIRED_COLUMNS.every(col => newOrder.includes(col));
    if (!hasAllRequired) {
      return { success: false, error: 'All required columns must be present' };
    }

    setConfig({
      statuses: newOrder,
      order: newOrder.map((_, i) => i),
    });
    return { success: true };
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return {
    statuses: config.statuses,
    orderedStatuses,
    canRemove,
    canAdd,
    getAddableStatuses,
    addColumn,
    removeColumn,
    reorderColumns,
    resetToDefaults,
    REQUIRED_COLUMNS,
  };
}
