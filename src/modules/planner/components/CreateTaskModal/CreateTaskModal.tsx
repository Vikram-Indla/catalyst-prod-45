/**
 * Create Task Modal - Catalyst Planner V9
 * Per V4 Spec: Minimal friction, keyboard-first, required linking
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TitleInput } from './fields/TitleInput';
import { DescriptionToggle } from './fields/DescriptionToggle';
import { WorkstreamSelect } from './fields/WorkstreamSelect';
import { AssigneeSelect } from './fields/AssigneeSelect';
import { PrioritySelect } from './fields/PrioritySelect';
import { DueDatePicker } from './fields/DueDatePicker';
import { useCreateTaskMutation, type CreateTaskInput } from './hooks/useCreateTaskMutation';
import type { TaskPriority } from '../../types';

export interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkstream?: string;
  onSuccess?: (taskKey: string) => void;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  defaultWorkstream,
  onSuccess,
}: CreateTaskModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workstreamId, setWorkstreamId] = useState(defaultWorkstream || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTaskKey, setSuccessTaskKey] = useState('');
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createTask, isPending } = useCreateTaskMutation();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setWorkstreamId(defaultWorkstream || '');
      setAssigneeId('');
      setPriority('medium');
      setDueDate('');
      setErrors({});
      setShowSuccess(false);
      setSuccessTaskKey('');
      // Focus title after animation
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open, defaultWorkstream]);

  // Keyboard shortcuts (⌘+Enter to submit, Escape to close)
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape' && !isPending) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, title, workstreamId, isPending, onOpenChange]);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!workstreamId) {
      newErrors.workstream = 'Please select a workstream';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, workstreamId]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!validate()) {
      if (!title.trim()) {
        titleInputRef.current?.focus();
      }
      return;
    }

    const input: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      workstream_id: workstreamId,
      assignee_id: assigneeId || undefined,
      priority,
      due_date: dueDate || undefined,
      start_date: new Date().toISOString().split('T')[0],
    };

    createTask(input, {
      onSuccess: (result) => {
        setSuccessTaskKey(result.task_key);
        setShowSuccess(true);
        
        // Close after success animation
        setTimeout(() => {
          onSuccess?.(result.task_key);
          onOpenChange(false);
        }, 1800);
      },
    });
  }, [title, description, workstreamId, assigneeId, priority, dueDate, validate, createTask, onSuccess, onOpenChange]);

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div 
              className="w-full max-w-[520px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-visible"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-task-title"
            >
              {/* Success Overlay */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4"
                    >
                      <Check className="w-8 h-8 text-green-600" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      Task Created!
                    </h3>
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">
                      {successTaskKey}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 id="create-task-title" className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  Add Task
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-5 max-h-[70vh] overflow-visible">
                {/* Title - Hero Input */}
                <TitleInput
                  ref={titleInputRef}
                  value={title}
                  onChange={setTitle}
                  error={errors.title}
                  label="Title"
                />

                {/* Description - Collapsible */}
                <DescriptionToggle
                  value={description}
                  onChange={setDescription}
                />

                {/* Two-column row: Workstream + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <WorkstreamSelect
                    value={workstreamId}
                    onChange={setWorkstreamId}
                    error={errors.workstream}
                  />
                  <PrioritySelect
                    value={priority}
                    onChange={setPriority}
                  />
                </div>

                {/* Two-column row: Assignee + Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <AssigneeSelect
                    value={assigneeId}
                    onChange={setAssigneeId}
                  />
                  <DueDatePicker
                    value={dueDate}
                    onChange={setDueDate}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between rounded-b-xl">
                <div className="text-xs text-slate-400">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-medium">⌘</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-medium">Enter</kbd>
                  {' to add'}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || !title.trim()}
                    className={cn(
                      "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                      "bg-blue-600 text-white hover:bg-blue-700",
                      "shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30",
                      "flex items-center gap-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    )}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Task
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
