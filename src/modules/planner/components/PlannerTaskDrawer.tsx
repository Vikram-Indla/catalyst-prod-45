// ============================================================
// PLANNER TASK DRAWER
// Slide-in drawer for viewing/editing task details
// Uses local state to prevent flickering on field changes
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Unlock, Calendar, User, Flag, Activity, AlertTriangle, Trash2 } from 'lucide-react';
import type { PlannerTask, TaskStatus, TaskPriority, PlannerUser } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from '@/components/ui/sheet';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskChecklist } from './TaskChecklist';

interface PlannerTaskDrawerProps {
  task: PlannerTask | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<PlannerTask>) => void;
  onUnblock: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  users?: PlannerUser[];
}

export function PlannerTaskDrawer({
  task,
  isOpen,
  onClose,
  onUpdate,
  onUnblock,
  onDelete,
  users = [],
}: PlannerTaskDrawerProps) {
  // Local state to prevent flickering
  const [localStatus, setLocalStatus] = useState<TaskStatus | null>(null);
  const [localPriority, setLocalPriority] = useState<TaskPriority | null>(null);
  const [localAssigneeId, setLocalAssigneeId] = useState<string | null>(null);
  const [localStartDate, setLocalStartDate] = useState<string | null>(null);
  const [localDueDate, setLocalDueDate] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Track the task ID to reset local state when task changes
  const taskIdRef = useRef<string | null>(null);

  // Initialize local state when task changes
  useEffect(() => {
    if (task && task.id !== taskIdRef.current) {
      taskIdRef.current = task.id;
      setLocalStatus(task.status);
      setLocalPriority(task.priority);
      setLocalAssigneeId(task.assigneeId || 'unassigned');
      setLocalStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
      setLocalDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    }
  }, [task]);

  // Reset when drawer closes
  useEffect(() => {
    if (!isOpen) {
      taskIdRef.current = null;
    }
  }, [isOpen]);

  // Debounced update handler
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdate = useCallback((taskId: string, updates: Partial<PlannerTask>) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate(taskId, updates);
    }, 300);
  }, [onUpdate]);

  // Handlers that update local state immediately and debounce DB update
  const handleStatusChange = useCallback((value: TaskStatus) => {
    if (!task) return;
    setLocalStatus(value);
    debouncedUpdate(task.id, { status: value });
  }, [task, debouncedUpdate]);

  const handlePriorityChange = useCallback((value: TaskPriority) => {
    if (!task) return;
    setLocalPriority(value);
    debouncedUpdate(task.id, { priority: value });
  }, [task, debouncedUpdate]);

  const handleAssigneeChange = useCallback((value: string) => {
    if (!task) return;
    setLocalAssigneeId(value);
    const assignee = users.find(u => u.id === value);
    debouncedUpdate(task.id, { 
      assigneeId: value === 'unassigned' ? undefined : value,
      assigneeName: assignee?.name,
      assigneeInitials: assignee?.initials,
    });
  }, [task, users, debouncedUpdate]);

  const handleStartDateChange = useCallback((value: string) => {
    if (!task) return;
    setLocalStartDate(value);
    debouncedUpdate(task.id, { startDate: value || undefined });
  }, [task, debouncedUpdate]);

  const handleDueDateChange = useCallback((value: string) => {
    if (!task) return;
    setLocalDueDate(value);
    debouncedUpdate(task.id, { dueDate: value || undefined });
  }, [task, debouncedUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!task) return null;

  // Use local state values with fallback to task values
  const displayStatus = localStatus ?? task.status;
  const displayPriority = localPriority ?? task.priority;
  const displayAssigneeId = localAssigneeId ?? task.assigneeId ?? 'unassigned';
  const displayStartDate = localStartDate ?? (task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
  const displayDueDate = localDueDate ?? (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent width="medium" className="flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {task.key}
            </Badge>
            {task.blocked && (
              <Badge variant="destructive" className="gap-1">
                <Lock className="w-3 h-3" />
                Blocked
              </Badge>
            )}
          </div>
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Blocker Card */}
          {task.blocked && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-1">Blocked</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {task.blockedReason || 'This task is currently blocked.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUnblock(task.id)}
                    className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Mark as Unblocked
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="w-4 h-4" />
                Status
              </label>
              <Select
                value={displayStatus}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_CONFIG.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: col.color }}
                        />
                        {col.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Flag className="w-4 h-4" />
                Priority
              </label>
              <Select
                value={displayPriority}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG['critical']][]).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="w-4 h-4" />
                Assignee
              </label>
              <Select
                value={displayAssigneeId}
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
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

            {/* Start Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Start Date
              </label>
              <Input
                type="date"
                value={displayStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Due Date
              </label>
              <Input
                type="date"
                value={displayDueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Checklist Section */}
          <div className="pt-4 border-t border-border">
            <TaskChecklist
              taskId={task.id}
              taskTitle={task.title}
              taskDescription={task.description}
              onProgressChange={(progress) => onUpdate(task.id, { progress })}
            />
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Linked Item */}
          {task.linkedItemId && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Linked to
              </span>
              <p className="text-sm font-medium text-foreground mt-1">
                {task.linkedItemTitle || task.linkedItemId}
              </p>
            </div>
          )}

          {/* Footer with Timestamps and Delete */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Created: {new Date(task.createdAt).toLocaleDateString()}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </SheetBody>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(task.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
