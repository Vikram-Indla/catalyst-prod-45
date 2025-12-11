import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SimpleColumnHeaderProps {
  label: string;
  columnId: string;
  sortable?: boolean;
  sortDirection: SortDirection;
  onSort: (columnId: string) => void;
  className?: string;
}

export function SimpleColumnHeader({
  label,
  columnId,
  sortable = true,
  sortDirection,
  onSort,
  className
}: SimpleColumnHeaderProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="truncate">{label}</span>
      
      {sortable && (
        <button
          onClick={() => onSort(columnId)}
          className="p-0.5 rounded hover:bg-muted/50 transition-colors"
          title={`Sort by ${label}`}
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-brand-gold" />
          ) : sortDirection === 'desc' ? (
            <ArrowDown className="h-3 w-3 text-brand-gold" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
          )}
        </button>
      )}
    </div>
  );
}
