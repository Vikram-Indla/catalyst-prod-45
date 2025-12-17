/**
 * ColumnsPanel - Column visibility manager with localStorage persistence
 */

import React, { useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Column {
  id: string;
  header: string;
  minWidth?: number;
}

interface ColumnsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  defaultColumns: string[];
  storageKey?: string;
}

export function ColumnsPanel({
  isOpen,
  onClose,
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  defaultColumns,
  storageKey = 'product_backlog_columns',
}: ColumnsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Save to localStorage when columns change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, storageKey]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (columnId: string) => {
    // Ensure at least one column remains visible
    if (visibleColumns.length === 1 && visibleColumns.includes(columnId)) {
      return;
    }
    
    const newVisible = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    onVisibleColumnsChange(newVisible);
  };

  const handleResetToDefault = () => {
    onVisibleColumnsChange(defaultColumns);
  };

  const handleShowAll = () => {
    onVisibleColumnsChange(columns.map(c => c.id));
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-64 rounded-lg shadow-lg z-[500] overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div 
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--divider)' }}
      >
        <span 
          className="text-sm font-semibold"
          style={{ color: 'var(--text-1)' }}
        >
          Columns
        </span>
        <span 
          className="text-xs"
          style={{ color: 'var(--text-3)' }}
        >
          {visibleColumns.length} of {columns.length}
        </span>
      </div>

      <div className="max-h-[320px] overflow-y-auto py-2">
        {columns.map(col => {
          const isVisible = visibleColumns.includes(col.id);
          const isOnlyOne = visibleColumns.length === 1 && isVisible;
          
          return (
            <label
              key={col.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors",
                isOnlyOne ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
              )}
            >
              <Checkbox
                checked={isVisible}
                onCheckedChange={() => handleToggle(col.id)}
                disabled={isOnlyOne}
                className="border-border data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
              />
              <span 
                className="text-sm"
                style={{ color: 'var(--text-1)' }}
              >
                {col.header}
              </span>
            </label>
          );
        })}
      </div>

      <div 
        className="px-4 py-3 border-t flex gap-2"
        style={{ 
          borderColor: 'var(--divider)',
          backgroundColor: 'var(--surface-2)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={handleShowAll}
        >
          Show all
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={handleResetToDefault}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

// Hook to initialize columns from localStorage
export function useColumnPreference(
  defaultColumns: string[],
  storageKey: string = 'product_backlog_columns'
): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultColumns;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }
    return defaultColumns;
  });

  return [visibleColumns, setVisibleColumns];
}
