// ============================================================
// BULK ACTION TOOLBAR
// Planner V9: Multi-select actions toolbar
// ============================================================

import { CheckCircle2, Calendar, Flag, FolderInput, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBulkUpdateMyTasks } from '../../hooks/useMyTasks';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';
import type { TaskPriority } from '../../types/my-tasks';

interface BulkActionToolbarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onComplete?: () => void;
}

export function BulkActionToolbar({ selectedIds, onClear, onComplete }: BulkActionToolbarProps) {
  const bulkUpdate = useBulkUpdateMyTasks();
  const { data: statuses } = useKanbanStatuses();
  const { data: workstreams } = usePlannerWorkstreams();

  const count = selectedIds.size;
  const taskIds = Array.from(selectedIds);

  if (count === 0) return null;

  const handleMarkDone = () => {
    const doneStatus = statuses?.find(s => s.slug === 'done');
    if (doneStatus) {
      bulkUpdate.mutate({
        task_ids: taskIds,
        updates: { status_id: doneStatus.id },
      });
      onComplete?.();
      onClear();
    }
  };

  const handleSetPriority = (priority: TaskPriority) => {
    bulkUpdate.mutate({ task_ids: taskIds, updates: { priority } });
  };

  const handleReschedule = (daysFromNow: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + daysFromNow);
    bulkUpdate.mutate({
      task_ids: taskIds,
      updates: { due_date: newDate.toISOString().split('T')[0] },
    });
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[var(--planner-primary)] text-white animate-in slide-in-from-top-2">
      <span className="text-sm font-medium">{count} task{count > 1 ? 's' : ''} selected</span>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleMarkDone} className="bg-white/20 hover:bg-white/30 text-white border-0">
          <CheckCircle2 className="w-4 h-4 mr-1.5" />Mark Done
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Calendar className="w-4 h-4 mr-1.5" />Reschedule
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleReschedule(0)}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReschedule(1)}>Tomorrow</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReschedule(7)}>Next Week</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Flag className="w-4 h-4 mr-1.5" />Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleSetPriority('critical')}>Critical</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetPriority('high')}>High</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetPriority('medium')}>Medium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetPriority('low')}>Low</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={onClear} className="text-white hover:bg-white/20">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
