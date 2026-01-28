import { useState } from 'react';
import { Clock, User, Flag, Trash2, X, Check, ChevronDown, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBulkUpdateTasks } from '../../hooks/useBulkUpdateTasks';
import { useBulkDeleteTasks } from '../../hooks/useBulkDeleteTasks';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { useWorkstreamLeadAccess } from '../../hooks/useWorkstreamLeadAccess';
import { PRIORITY_CONFIG } from '../../types';
import type { TaskPriority } from '../../types';

interface BulkActionBarProps {
  selectedIds: string[];
  selectedCount: number;
  onClearSelection: () => void;
}

const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

export function BulkActionBar({ selectedIds, selectedCount, onClearSelection }: BulkActionBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { mutate: bulkUpdate, isPending: isUpdating } = useBulkUpdateTasks();
  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteTasks();
  const { data: statuses = [] } = useKanbanStatuses();
  const { data: users = [] } = usePlannerUsers();
  const { isLeadOfAny } = useWorkstreamLeadAccess();

  if (selectedCount === 0) return null;

  const handleStatusChange = (statusId: string) => {
    bulkUpdate({ taskIds: selectedIds, updates: { status_id: statusId } });
    onClearSelection();
  };

  const handleAssigneeChange = (assigneeId: string | null) => {
    bulkUpdate({ taskIds: selectedIds, updates: { assignee_id: assigneeId } });
    onClearSelection();
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    bulkUpdate({ taskIds: selectedIds, updates: { priority } });
    onClearSelection();
  };

  const handleDelete = () => {
    bulkDelete(selectedIds);
    setShowDeleteConfirm(false);
    onClearSelection();
  };

  return (
    <>
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-4 px-5 py-3",
        "bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl",
        "animate-in slide-in-from-bottom-4 duration-200"
      )}>
        {/* Count */}
        <span className="text-sm font-semibold">
          <span className="text-primary">{selectedCount}</span>
          {' '}task{selectedCount > 1 ? 's' : ''} selected
        </span>

        <div className="w-px h-6 bg-slate-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                disabled={isUpdating}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                Status
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              {statuses.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => handleStatusChange(s.id)}>
                  <span 
                    className="w-2.5 h-2.5 rounded-full mr-2" 
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                disabled={isUpdating}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <User className="w-4 h-4" />
                Assign
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover max-h-60 overflow-y-auto">
              <DropdownMenuItem onClick={() => handleAssigneeChange(null)}>
                <X className="w-4 h-4 mr-2 text-muted-foreground" />
                Unassigned
              </DropdownMenuItem>
              {users.map((u) => (
                <DropdownMenuItem key={u.id} onClick={() => handleAssigneeChange(u.id)}>
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[9px] font-semibold mr-2">
                    {u.initials}
                  </div>
                  {u.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                disabled={isUpdating}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Flag className="w-4 h-4" />
                Priority
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              {PRIORITIES.map((priority) => {
                const config = PRIORITY_CONFIG[priority];
                return (
                  <DropdownMenuItem key={priority} onClick={() => handlePriorityChange(priority)}>
                    <span className="mr-2">{config.emoji}</span>
                    <span style={{ color: config.color }}>{config.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete - Only visible to leads/admins */}
          {isLeadOfAny ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-destructive rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Delete
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Only workstream leads can delete tasks</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClearSelection}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
