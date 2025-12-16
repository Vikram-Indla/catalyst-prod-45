/**
 * ColumnSelector - Reusable column visibility selector
 * Matches Catalyst look & feel with popover style
 */
import { useState, useEffect, useCallback } from 'react';
import { Columns3, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  width?: string;
}

interface ColumnSelectorProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  storageKey: string;
}

export function ColumnSelector({
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  storageKey,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  // Toggle a single column
  const toggleColumn = useCallback((columnKey: string) => {
    // Prevent hiding all columns
    if (visibleColumns.includes(columnKey) && visibleColumns.length === 1) {
      return;
    }

    const newVisible = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(c => c !== columnKey)
      : [...visibleColumns, columnKey];

    onVisibleColumnsChange(newVisible);
    localStorage.setItem(storageKey, JSON.stringify(newVisible));
  }, [visibleColumns, onVisibleColumnsChange, storageKey]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    const defaults = columns.filter(c => c.defaultVisible).map(c => c.key);
    onVisibleColumnsChange(defaults);
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  }, [columns, onVisibleColumnsChange, storageKey]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 px-3",
            "bg-white dark:bg-[#0D1117]",
            "border-[#E1E4E8] dark:border-[#30363D]",
            "hover:bg-muted dark:hover:bg-[#21262D]",
            "text-sm text-muted-foreground"
          )}
        >
          <Columns3 className="h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-0 z-[400] bg-white dark:bg-[#161B22] border-[#E1E4E8] dark:border-[#30363D]" 
        align="end"
      >
        <div className="p-2 border-b border-[#E1E4E8] dark:border-[#30363D]">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Toggle Columns
          </span>
        </div>
        <div className="p-1">
          {columns.map((column) => {
            const isVisible = visibleColumns.includes(column.key);
            const isOnlyVisible = visibleColumns.length === 1 && isVisible;

            return (
              <button
                key={column.key}
                onClick={() => toggleColumn(column.key)}
                disabled={isOnlyVisible}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  "transition-colors cursor-pointer",
                  isVisible
                    ? "text-foreground"
                    : "text-muted-foreground",
                  !isOnlyVisible && "hover:bg-muted dark:hover:bg-[#21262D]",
                  isOnlyVisible && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  isVisible
                    ? "bg-brand-gold border-brand-gold"
                    : "border-muted-foreground/40"
                )}>
                  {isVisible && <Check className="h-3 w-3 text-white" />}
                </div>
                <span>{column.label}</span>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-[#E1E4E8] dark:border-[#30363D]">
          <button
            onClick={resetToDefault}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted dark:hover:bg-[#21262D] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook to manage column visibility with localStorage persistence
export function useColumnVisibility(
  columns: ColumnDefinition[],
  storageKey: string
): [string[], (columns: string[]) => void] {
  const getDefaultColumns = () => columns.filter(c => c.defaultVisible).map(c => c.key);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored columns exist in current column definitions
        const validKeys = columns.map(c => c.key);
        const filtered = parsed.filter((key: string) => validKeys.includes(key));
        return filtered.length > 0 ? filtered : getDefaultColumns();
      }
    } catch {
      // Fall through to default
    }
    return getDefaultColumns();
  });

  return [visibleColumns, setVisibleColumns];
}
