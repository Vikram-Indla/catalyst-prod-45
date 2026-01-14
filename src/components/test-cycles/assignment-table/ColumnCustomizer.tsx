/**
 * Column Customizer - Show/hide and reorder columns
 */

import React from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { DEFAULT_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '@/types/assignment-table.types';

interface ColumnCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
}

// Non-toggleable columns
const FIXED_COLUMNS = ['select', 'actions'];

export function ColumnCustomizer({
  open,
  onOpenChange,
  visibleColumns,
  onVisibleColumnsChange,
}: ColumnCustomizerProps) {
  const toggleColumn = (columnId: string) => {
    if (FIXED_COLUMNS.includes(columnId)) return;
    
    if (visibleColumns.includes(columnId)) {
      onVisibleColumnsChange(visibleColumns.filter(c => c !== columnId));
    } else {
      // Insert at the correct position based on DEFAULT_COLUMNS order
      const defaultOrder = DEFAULT_COLUMNS.map(c => c.id);
      const newColumns = [...visibleColumns, columnId].sort((a, b) => 
        defaultOrder.indexOf(a) - defaultOrder.indexOf(b)
      );
      onVisibleColumnsChange(newColumns);
    }
  };

  const resetToDefault = () => {
    onVisibleColumnsChange([...DEFAULT_VISIBLE_COLUMNS]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Customize Columns</SheetTitle>
          <SheetDescription>
            Toggle columns to show or hide them in the table.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-1">
          {DEFAULT_COLUMNS.filter(col => col.label).map(column => {
            const isVisible = visibleColumns.includes(column.id);
            const isFixed = FIXED_COLUMNS.includes(column.id);
            
            return (
              <div
                key={column.id}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GripVertical 
                    className="h-4 w-4 cursor-grab" 
                    style={{ color: CATALYST_V5.slate[300] }}
                  />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: CATALYST_V5.slate[700] }}
                  >
                    {column.label}
                  </span>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={() => toggleColumn(column.id)}
                  disabled={isFixed}
                />
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={resetToDefault}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
