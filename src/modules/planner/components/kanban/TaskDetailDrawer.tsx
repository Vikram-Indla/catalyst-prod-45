// ============================================================
// TASK DETAIL DRAWER
// Slide-out drawer for viewing/editing task details
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Calendar, User, Flag, Activity, Tag, AlertTriangle, Trash2, Clock } from 'lucide-react';
import type { KanbanTask, KanbanTaskPriority } from '../../types/kanban';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';
import { useUpdateKanbanTask, useDeleteKanbanTask } from '../../hooks/useKanbanTasks';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';
import { PriorityBadge } from './PriorityBadge';
import { DueDateBadge } from './DueDateBadge';
import { AssigneeAvatar } from './AssigneeAvatar';
import { WorkstreamBadge } from './WorkstreamBadge';
import { TaskChecklist } from '../TaskChecklist';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Separator } from '@/components/ui/separator';
import { format, isValid, parseISO } from 'date-fns';

interface TaskDetailDrawerProps {
  task: KanbanTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDrawer({ task, open, onOpenChange }: TaskDetailDrawerProps) {
  const { data: statuses = [] } = useKanbanStatuses();
  const { data: users = [] } = usePlannerUsers();
  const updateTask = useUpdateKanbanTask();
  const deleteTask = useDeleteKanbanTask();
  
  // Local state for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [localStatusId, setLocalStatusId] = useState<string>('');
  const [localPriority, setLocalPriority] = useState<KanbanTaskPriority>('medium');
  const [localAssigneeId, setLocalAssigneeId] = useState<string>('unassigned');
  const [localStartDate, setLocalStartDate] = useState<string>('');
  const [localDueDate, setLocalDueDate] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Track task ID to reset state on change
  const taskIdRef = useRef<string | null>(null);

  // Sync local state with task
  useEffect(() => {
    if (task && task.id !== taskIdRef.current) {
      taskIdRef.current = task.id;
      setTitle(task.title);
      setDescription(task.description || '');
      setLocalStatusId(task.status_id);
      setLocalPriority(task.priority);
      setLocalAssigneeId(task.assignee_id || 'unassigned');
      setLocalStartDate(''); // planner_tasks doesn't have start_date column
      setLocalDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    }
  }, [task]);
  
  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      taskIdRef.current = null;
    }
  }, [open]);
  
  // Debounced update
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdate = useCallback((taskId: string, updates: Partial<KanbanTask>) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateTask.mutate({ id: taskId, ...updates });
    }, 300);
  }, [updateTask]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!task) return null;

  const handleTitleBlur = () => {
    if (title !== task.title && title.trim()) {
      updateTask.mutate({ id: task.id, title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (task.description || '')) {
      updateTask.mutate({ id: task.id, description: description || null });
    }
  };

  const handleStatusChange = (statusId: string) => {
    setLocalStatusId(statusId);
    debouncedUpdate(task.id, { status_id: statusId });
  };

  const handlePriorityChange = (priority: KanbanTaskPriority) => {
    setLocalPriority(priority);
    debouncedUpdate(task.id, { priority });
  };
  
  const handleAssigneeChange = (value: string) => {
    setLocalAssigneeId(value);
    const newAssigneeId = value === 'unassigned' ? null : value;
    debouncedUpdate(task.id, { assignee_id: newAssigneeId });
  };
  
  const handleDueDateChange = (value: string) => {
    setLocalDueDate(value);
    debouncedUpdate(task.id, { due_date: value || null });
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        onOpenChange(false);
        setShowDeleteConfirm(false);
      },
    });
  };

  const currentStatus = statuses.find((s) => s.id === task.status_id);
  
  // Format created date safely
  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
      return 'Invalid Date';
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-[500px] overflow-y-auto p-6">
          <SheetHeader className="space-y-4">
            {/* Task Key & Actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-muted-foreground">
                {task.key}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
              placeholder="Task title"
            />
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Description - Always visible */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Tag className="w-4 h-4" />
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4" />
                Status
              </Label>
              <Select value={localStatusId} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Flag className="w-4 h-4" />
                Priority
              </Label>
              <Select value={localPriority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Critical
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Low
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                Assignee
              </Label>
              <Select value={localAssigneeId} onValueChange={handleAssigneeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-medium">
                          {user.initials}
                        </div>
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                type="date"
                value={localDueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Checklist Section */}
            <TaskChecklist
              taskId={task.id}
              taskTitle={task.title}
              taskDescription={description}
              onProgressChange={(progress) => updateTask.mutate({ id: task.id, progress })}
            />

            <Separator />

            {/* Workstream (read-only) */}
            {task.workstream && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  Workstream
                </div>
                <WorkstreamBadge workstream={task.workstream} />
              </div>
            )}

            {/* Blocked */}
            {task.blocked && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Blocked
                </div>
                {task.blocked_reason && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.blocked_reason}
                  </p>
                )}
              </div>
            )}

            {/* Footer with Timestamps and Delete */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Created: {formatDate(task.created_at)}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{task.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
