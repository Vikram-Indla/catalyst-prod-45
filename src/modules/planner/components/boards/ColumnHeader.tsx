/**
 * Column Header Component
 * Draggable header with status dot, title, count, and actions
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, MoreHorizontal, Trash2, Palette } from 'lucide-react';
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
import { toast } from 'sonner';
import type { BoardColumn } from '../../types/planner-boards';

interface ColumnHeaderProps {
  column: BoardColumn & { is_system?: boolean };
  onAddTask?: (statusId: string) => void;
  isDragging?: boolean;
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

// Map status slug to CSS class
const getStatusClass = (slug: string): string => {
  const statusMap: Record<string, string> = {
    'backlog': 'backlog',
    'planned': 'planned',
    'progress': 'progress',
    'in-progress': 'in-progress',
    'review': 'review',
    'done': 'done',
  };
  return statusMap[slug] || 'backlog';
};

export function ColumnHeader({ column, onAddTask, isDragging }: ColumnHeaderProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  
  const deleteColumn = useDeleteColumn();
  const updateColumn = useUpdateColumn();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  const isSystemColumn = column.is_system ?? 
    ['backlog', 'planned', 'progress', 'review', 'done'].includes(column.slug);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'boards-column__header group',
        isDragging && 'opacity-50'
      )}
    >
      <div className="boards-column__header-left">
        {/* Drag Handle */}
        <button
          className="boards-column__drag-handle opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </button>
        
        {/* Status Dot */}
        <span 
          className={cn('boards-column__dot', `boards-column__dot--${getStatusClass(column.slug)}`)}
          style={column.color ? { backgroundColor: column.color } : undefined}
        />
        
        {/* Title */}
        <h3 className="boards-column__title">{column.name}</h3>
        
        {/* Task Count */}
        <span className="boards-column__count">{column.task_count}</span>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Add Task Button */}
        <button 
          className="boards-column__add-btn"
          onClick={() => onAddTask?.(column.id)}
          aria-label={`Add task to ${column.name}`}
        >
          <Plus />
        </button>

        {/* Column Menu */}
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
              <PopoverContent className="w-auto p-3" side="left">
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => handleColorChange(c.value)}
                      className={cn(
                        'w-6 h-6 rounded-full transition-transform hover:scale-110',
                        column.color === c.value && 'ring-2 ring-offset-2 ring-slate-400'
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Delete (only for custom columns) */}
            {!isSystemColumn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
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
      </div>
    </div>
  );
}
