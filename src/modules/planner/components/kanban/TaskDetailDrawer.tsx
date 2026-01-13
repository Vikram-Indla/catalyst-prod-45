// ============================================================
// TASK DETAIL DRAWER
// Slide-out drawer for viewing/editing task details
// ============================================================

import { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, AlertTriangle, Trash2, Clock } from 'lucide-react';
import type { KanbanTask, KanbanTaskPriority } from '../../types/kanban';
import { useKanbanStatuses } from '../../hooks/useKanbanStatuses';
import { useUpdateKanbanTask, useDeleteKanbanTask } from '../../hooks/useKanbanTasks';
import { PriorityBadge } from './PriorityBadge';
import { DueDateBadge } from './DueDateBadge';
import { AssigneeAvatar } from './AssigneeAvatar';
import { WorkstreamBadge } from './WorkstreamBadge';
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
import { format } from 'date-fns';

interface TaskDetailDrawerProps {
  task: KanbanTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDrawer({ task, open, onOpenChange }: TaskDetailDrawerProps) {
  const { data: statuses = [] } = useKanbanStatuses();
  const updateTask = useUpdateKanbanTask();
  const deleteTask = useDeleteKanbanTask();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync local state with task
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

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
    updateTask.mutate({ id: task.id, status_id: statusId });
  };

  const handlePriorityChange = (priority: KanbanTaskPriority) => {
    updateTask.mutate({ id: task.id, priority });
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader className="space-y-4">
            {/* Task Key & Actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-muted-foreground">
                {task.key}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
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
            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={task.status_id} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={task.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                rows={4}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-4">
              {/* Assignee */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  Assignee
                </div>
                {task.assignee ? (
                  <AssigneeAvatar profile={task.assignee} />
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </div>
                <DueDateBadge 
                  dueDate={task.due_date} 
                  isCompleted={currentStatus?.is_completed_status} 
                />
              </div>

              {/* Workstream */}
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

              {/* Progress */}
              {task.progress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Created {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Updated {format(new Date(task.updated_at), 'MMM d, yyyy h:mm a')}
              </div>
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
