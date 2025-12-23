import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Columns3 } from 'lucide-react';
import { TableColumn } from './types';

interface ColumnVisibilityDropdownProps {
  columns: TableColumn[];
  visibleColumns: Set<string>;
  onToggleColumn: (columnKey: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function ColumnVisibilityDropdown({
  columns,
  visibleColumns,
  onToggleColumn,
  onShowAll,
  onHideAll,
}: ColumnVisibilityDropdownProps) {
  // Filter out checkbox column from visibility toggle
  const toggleableColumns = columns.filter(c => c.key !== 'checkbox');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-background border border-border shadow-lg z-50"
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Toggle Columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {toggleableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visibleColumns.has(column.key)}
            onCheckedChange={() => onToggleColumn(column.key)}
            className="text-sm"
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={onShowAll}
          >
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={onHideAll}
          >
            Hide All
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
