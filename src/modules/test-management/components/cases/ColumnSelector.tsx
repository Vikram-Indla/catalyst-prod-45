/**
 * Column Selector Component
 * Dropdown to toggle column visibility with localStorage persistence
 */

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, RotateCcw } from 'lucide-react';
import { TEST_CASE_COLUMNS } from '../../config/columnConfig';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import { cn } from '@/lib/utils';

export function ColumnSelector() {
  const { visibleColumns, toggleColumn, resetToDefault, isColumnVisible } = useColumnPreferences();
  const [open, setOpen] = useState(false);

  // Filter out checkbox from the list (always visible, not user-selectable)
  const selectableColumns = TEST_CASE_COLUMNS.filter(col => col.key !== 'checkbox');
  const visibleCount = visibleColumns.filter(c => c !== 'checkbox').length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Columns">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-semibold">Columns</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto py-1">
          {selectableColumns.map((column) => (
            <div
              key={column.key}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm",
                !column.locked && "cursor-pointer hover:bg-accent rounded-sm"
              )}
              onClick={() => !column.locked && toggleColumn(column.key)}
            >
              <Checkbox
                checked={isColumnVisible(column.key)}
                disabled={column.locked}
                onCheckedChange={() => !column.locked && toggleColumn(column.key)}
                className={cn(column.locked && "opacity-50")}
              />
              <span className={cn(column.locked && "text-muted-foreground")}>
                {column.label}
              </span>
              {column.locked && (
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Required
                </span>
              )}
            </div>
          ))}
        </div>

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {visibleCount} of {selectableColumns.length} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
