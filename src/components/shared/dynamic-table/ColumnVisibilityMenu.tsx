/**
 * ColumnVisibilityMenu — the "+" header affordance.
 * Mirrors Atlaskit's DropdownMenu + CheckboxItem pattern; uses Radix under the hood.
 */
import { Plus } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DynamicTableColumn } from './types';

interface ColumnVisibilityMenuProps<TData> {
  table: Table<TData>;
  columns: DynamicTableColumn<TData>[];
}

export function ColumnVisibilityMenu<TData>({ table, columns }: ColumnVisibilityMenuProps<TData>) {
  const toggleable = columns.filter((c) => !c.alwaysVisible);
  if (toggleable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Configure columns"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1"
      >
        <Plus className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {toggleable.map((col) => {
          const tCol = table.getColumn(col.id);
          if (!tCol) return null;
          const label = col.label ?? (typeof col.header === 'string' ? col.header : col.id);
          return (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={tCol.getIsVisible()}
              onCheckedChange={(checked) => tCol.toggleVisibility(!!checked)}
              onSelect={(e) => e.preventDefault()}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
