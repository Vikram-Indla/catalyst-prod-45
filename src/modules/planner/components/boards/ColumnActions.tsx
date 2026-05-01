/**
 * Column Actions Menu
 * Color picker and delete for custom columns
 */

import { useState } from 'react';
import { MoreHorizontal, Trash2, Palette, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDeleteColumn, useUpdateColumn } from '../../hooks/useColumnManagement';
import { supabase } from '@/integrations/supabase/client';
import type { BoardColumn } from '../../types/planner-boards';

interface ColumnActionsProps {
  column: BoardColumn;
}

const STATUS_COLORS = [
  { name: 'Slate', value: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))' },
  { name: 'Blue', value: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Green', value: 'var(--ds-text-success, var(--ds-text-success, #22c55e))' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))' },
  { name: 'Purple', value: '#8b5cf6' },
];

export function ColumnActions({ column }: ColumnActionsProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  
  const deleteColumn = useDeleteColumn();
  const updateColumn = useUpdateColumn();

  const isSystemColumn = column.is_system ?? 
    ['backlog', 'planned', 'progress', 'review', 'done'].includes(column.slug);

  const handleDelete = async () => {
    // Check for tasks in this column
    const { count } = await supabase
      .from('planner_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', column.id)
      .is('deleted_at', null);

    if (count && count > 0) {
      const confirmed = window.confirm(
        `This column has ${count} task(s). Move them to Backlog and delete the column?`
      );
      if (!confirmed) return;
      
      deleteColumn.mutate({ id: column.id, moveTasksToBacklog: true });
    } else {
      deleteColumn.mutate({ id: column.id });
    }
  };

  const handleColorChange = (color: string) => {
    updateColumn.mutate({ id: column.id, color });
    setColorPickerOpen(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="boards-column__add-btn opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Color Picker */}
        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <PopoverTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Palette className="w-4 h-4 mr-2" />
              Change Color
            </DropdownMenuItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" side="left" align="start">
            <div className="grid grid-cols-4 gap-2">
              {STATUS_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleColorChange(c.value)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center',
                    column.color === c.value && 'ring-2 ring-offset-2 ring-slate-400'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {column.color === c.value && (
                    <Check className="w-3 h-3 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete (only for custom columns) */}
        {!isSystemColumn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/40"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
          </>
        )}

        {isSystemColumn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-slate-400">
              <Trash2 className="w-4 h-4 mr-2" />
              System column
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
