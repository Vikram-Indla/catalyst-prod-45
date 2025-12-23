import { useState, useEffect, useCallback } from 'react';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: string;
  minWidth?: string;
  required?: boolean;
}

// Streamlined 6-column structure: Key, Summary, Severity, Status, Assignee, SLA
// Removed: Level (rarely used), Age (secondary), Priority (redundant with Sev), Release/Major/Committee (useless)
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'key', label: 'Key', visible: true, minWidth: '100px', required: true },
  { id: 'summary', label: 'Summary', visible: true, required: true },
  { id: 'severity', label: 'Severity', visible: true, width: '80px' },
  { id: 'status', label: 'Status', visible: true, minWidth: '120px' },
  { id: 'assignee', label: 'Assignee', visible: true, width: '150px' },
  { id: 'sla', label: 'SLA', visible: true, width: '100px' },
  // Hidden columns - can be enabled via column selector
  { id: 'level', label: 'Level', visible: false, width: '44px' },
  { id: 'age', label: 'Age', visible: false, width: '64px' },
  { id: 'priority', label: 'Priority', visible: false, width: '48px' },
  { id: 'releaseVersion', label: 'Release', visible: false, width: '100px' },
  { id: 'major', label: 'Major', visible: false, width: '56px' },
  { id: 'committee', label: 'Committee', visible: false, width: '80px' },
];

const STORAGE_KEY = 'catalyst-incident-columns';

export type TableDensity = 'comfortable' | 'compact';

export function useIncidentColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnConfig[];
        // Merge with defaults to handle new columns added over time
        return DEFAULT_COLUMNS.map(dc => {
          const stored = parsed.find(p => p.id === dc.id);
          return stored ? { ...dc, visible: stored.visible } : dc;
        });
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMNS;
  });

  const [density, setDensity] = useState<TableDensity>(() => {
    try {
      return (localStorage.getItem('catalyst-incident-density') as TableDensity) || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  // Persist columns to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns.map(c => ({ id: c.id, visible: c.visible }))));
    } catch {
      // ignore
    }
  }, [columns]);

  // Persist density
  useEffect(() => {
    try {
      localStorage.setItem('catalyst-incident-density', density);
    } catch {
      // ignore
    }
  }, [density]);

  const toggleColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId && !col.required ? { ...col, visible: !col.visible } : col
    ));
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS);
  }, []);

  const visibleColumns = columns.filter(c => c.visible);

  return {
    columns,
    visibleColumns,
    toggleColumn,
    resetColumns,
    density,
    setDensity,
  };
}
