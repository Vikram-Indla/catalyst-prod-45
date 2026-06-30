/**
 * Column Actions Menu
 * Color picker and delete for custom columns
 */

import { useState } from 'react';
import { MoreHorizontal, Trash2, Palette, Check } from '@/lib/atlaskit-icons';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
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
  { name: 'Slate', value: 'var(--ds-text-subtlest)' },
  { name: 'Blue', value: 'var(--ds-text-brand)' },
  { name: 'Teal', value: 'var(--ds-icon-information)' },
  { name: 'Green', value: 'var(--ds-text-success)' },
  { name: 'Yellow', value: 'var(--ds-background-warning-bold)' },
  { name: 'Orange', value: 'var(--ds-background-warning-bold)' },
  { name: 'Red', value: 'var(--ds-text-danger)' },
  { name: 'Purple', value: 'var(--ds-background-discovery-bold)' },
];

export function ColumnActions({ column }: ColumnActionsProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; moveTasksToBacklog: boolean } | null>(null);

  const deleteColumn = useDeleteColumn();
  const updateColumn = useUpdateColumn();

  const isSystemColumn = column.is_system ?? 
    ['backlog', 'planned', 'progress', 'review', 'done'].includes(column.slug);

  const handleDelete = async () => {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', column.id)
      .is('deleted_at', null);

    setDeleteTarget({ id: column.id, name: column.name, moveTasksToBacklog: !!(count && count > 0) });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteColumn.mutate({ id: deleteTarget.id, moveTasksToBacklog: deleteTarget.moveTasksToBacklog });
    setDeleteTarget(null);
  };

  const handleColorChange = (color: string) => {
    updateColumn.mutate({ id: column.id, color });
    setColorPickerOpen(false);
  };

  return (
    <>
    <ConfirmDeleteDialog
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      issueKey={deleteTarget?.name ?? null}
      issueSummary={null}
      typeLabel="column"
      onConfirm={handleConfirmDelete}
    />
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
    </>
  );
}
