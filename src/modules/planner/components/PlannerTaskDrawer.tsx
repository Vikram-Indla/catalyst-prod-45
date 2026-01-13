// ============================================================
// PLANNER TASK DRAWER
// Slide-in drawer for viewing/editing task details
// ============================================================

import { useEffect, useCallback } from 'react';
import { X, Lock, Unlock, Calendar, User, Flag, Activity, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PlannerTask, TaskStatus, TaskPriority, PlannerSubtask, PlannerUser } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PlannerTaskDrawerProps {
  task: PlannerTask | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<PlannerTask>) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
  onUnblock: (taskId: string) => void;
  users?: PlannerUser[];
}

export function PlannerTaskDrawer({
  task,
  isOpen,
  onClose,
  onUpdate,
  onSubtaskToggle,
  onUnblock,
  users = [],
}: PlannerTaskDrawerProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!task) return null;

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const statusConfig = COLUMN_CONFIG.find(c => c.id === task.status);
  const subtasksDone = task.subtasks.filter(s => s.completed).length;
  const subtasksTotal = task.subtasks.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-surface-0 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 text-xs font-mono font-medium bg-surface-2 text-text-muted rounded">
                  {task.key}
                </span>
                {task.blocked && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                    <Lock className="w-3 h-3" />
                    Blocked
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-2 text-text-muted transition-colors"
                title="Close drawer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title */}
              <h2 className="text-xl font-semibold text-text-primary">
                {task.title}
              </h2>

              {/* Description */}
              {task.description && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {task.description}
                </p>
              )}

              {/* Blocker Card */}
              {task.blocked && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-800 mb-1">Blocked</h4>
                      <p className="text-sm text-orange-700">
                        {task.blockedReason || 'This task is currently blocked.'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUnblock(task.id)}
                        className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Activity className="w-4 h-4" />
                    Status
                  </label>
                  <Select
                    value={task.status}
                    onValueChange={(value: TaskStatus) => onUpdate(task.id, { status: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-0 z-50">
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Flag className="w-4 h-4" />
                    Priority
                  </label>
                  <Select
                    value={task.priority}
                    onValueChange={(value: TaskPriority) => onUpdate(task.id, { priority: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-0 z-50">
                      {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG['critical']][]).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{config.emoji}</span>
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <User className="w-4 h-4" />
                    Assignee
                  </label>
                  <Select
                    value={task.assigneeId || 'unassigned'}
                    onValueChange={(value) => onUpdate(task.id, { 
                      assigneeId: value === 'unassigned' ? undefined : value,
                      assigneeName: users.find(u => u.id === value)?.name,
                      assigneeInitials: users.find(u => u.id === value)?.initials,
                    })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-0 z-50">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-medium">
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || undefined })}
                    className="w-full"
                  />
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-sm font-medium text-text-secondary">
                    <span>Progress</span>
                    <span className="text-blue-600">{task.progress}%</span>
                  </label>
                  <Slider
                    value={[task.progress]}
                    onValueChange={([value]) => onUpdate(task.id, { progress: value })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Subtasks */}
              {subtasksTotal > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">Subtasks</h3>
                    <span className="text-xs text-text-muted">
                      {subtasksDone} of {subtasksTotal} completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {task.subtasks.map(subtask => (
                      <div
                        key={subtask.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          subtask.completed 
                            ? "bg-green-50 border-green-200" 
                            : "bg-surface-1 border-border hover:border-blue-300"
                        )}
                      >
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => onSubtaskToggle(task.id, subtask.id)}
                          className="flex-shrink-0"
                        />
                        <span className={cn(
                          "text-sm flex-1",
                          subtask.completed && "line-through text-text-muted"
                        )}>
                          {subtask.title}
                        </span>
                        {subtask.completed && (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Item */}
              {task.linkedItemId && (
                <div className="p-3 bg-surface-1 rounded-lg border border-border">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Linked to
                  </span>
                  <p className="text-sm font-medium text-text-primary mt-1">
                    {task.linkedItemTitle || task.linkedItemId}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-4 border-t border-border space-y-1 text-xs text-text-muted">
                <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(task.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
