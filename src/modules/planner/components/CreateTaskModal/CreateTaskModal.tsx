/**
 * Create Task Modal - TaskBoardModal Styled Version
 * Matches TaskBoardModal visual style with portal-based dropdowns
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TitleInput } from './fields/TitleInput';
import { DescriptionToggle } from './fields/DescriptionToggle';
import { StyledWorkstreamSelect } from './fields/StyledWorkstreamSelect';
import { StyledAssigneeSelect } from './fields/StyledAssigneeSelect';
import { StyledPrioritySelect } from './fields/StyledPrioritySelect';
import { StyledDatePicker } from './fields/StyledDatePicker';
import { useCreateTaskMutation, type CreateTaskInput } from './hooks/useCreateTaskMutation';
import type { TaskPriority } from '../../types';

// TaskBoardModal colors
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfacePage: '#f8fafc',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1'
};

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
  const [startDate, setStartDate] = useState('');
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
      setStartDate(new Date().toISOString().split('T')[0]); // Default to today
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
      start_date: startDate || new Date().toISOString().split('T')[0],
      due_date: dueDate || undefined,
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
  }, [title, description, workstreamId, assigneeId, priority, startDate, dueDate, validate, createTask, onSuccess, onOpenChange]);

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
              style={{
                width: '100%',
                maxWidth: '560px',
                backgroundColor: COLORS.surfaceCard,
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'visible',
                position: 'relative'
              }}
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
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: COLORS.surfaceCard,
                      borderRadius: '16px'
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}
                    >
                      <Check size={32} style={{ color: '#16a34a' }} />
                    </motion.div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '8px' }}>
                      Task Created!
                    </h3>
                    <div style={{
                      padding: '4px 12px',
                      backgroundColor: COLORS.surfacePage,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      color: '#475569'
                    }}>
                      {successTaskKey}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: `1px solid ${COLORS.borderLight}`
              }}>
                <h2 
                  id="create-task-title" 
                  style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: COLORS.textPrimary 
                  }}
                >
                  Add Task
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: COLORS.textLight,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.surfacePage}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                {/* Two-column row: Workstream + Assignee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <StyledWorkstreamSelect
                    value={workstreamId}
                    onChange={setWorkstreamId}
                    error={errors.workstream}
                  />
                  <StyledAssigneeSelect
                    value={assigneeId}
                    onChange={setAssigneeId}
                  />
                </div>

                {/* Two-column row: Priority + Start Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <StyledPrioritySelect
                    value={priority}
                    onChange={setPriority}
                  />
                  <StyledDatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Set start date..."
                  />
                </div>

                {/* Due Date - Full width */}
                <StyledDatePicker
                  label="Due Date"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="Set due date..."
                />
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderTop: `1px solid ${COLORS.borderLight}`,
                backgroundColor: COLORS.surfacePage,
                borderRadius: '0 0 16px 16px'
              }}>
                <div style={{ fontSize: '12px', color: COLORS.textLight }}>
                  <kbd style={{
                    padding: '2px 6px',
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 500
                  }}>⌘</kbd>
                  {' + '}
                  <kbd style={{
                    padding: '2px 6px',
                    backgroundColor: COLORS.surfaceCard,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 500
                  }}>Enter</kbd>
                  {' to add'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#475569',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      opacity: isPending ? 0.5 : 1,
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = COLORS.surfaceCard)}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || !title.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      cursor: isPending || !title.trim() ? 'not-allowed' : 'pointer',
                      opacity: isPending || !title.trim() ? 0.5 : 1,
                      boxShadow: isPending || !title.trim() ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isPending && title.trim()) {
                        e.currentTarget.style.backgroundColor = '#1d4ed8';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.boxShadow = isPending || !title.trim() ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)';
                    }}
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
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
