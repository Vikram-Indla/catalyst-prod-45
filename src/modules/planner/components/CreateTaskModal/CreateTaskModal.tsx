/**
 * Create Task Modal V10 - Enterprise Grade Implementation
 * Aligned with TaskBoardModal styling, all dropdowns open UPWARD
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Loader2, ChevronDown, Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateTaskMutation, type CreateTaskInput } from './hooks/useCreateTaskMutation';
import type { TaskPriority } from '../../types';
import { format } from 'date-fns';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../../hooks/usePlannerUsers';

// Import shared colors & atoms from TaskBoardModal
import { 
  COLORS, 
  PRIORITY_COLORS, 
  PRIORITIES,
  WORKSTREAM_COLORS 
} from '@/components/planner/task-modal/colors';
import { ColorDot, Avatar, Label } from '@/components/planner/task-modal/atoms';

// ============================================================================
// CreateTaskModal Component
// ============================================================================

// ============================================================================
// CreateTaskModal Component
// ============================================================================

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
  const [startDate, setStartDate] = useState(new Date().toISOString());
  const [dueDate, setDueDate] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTaskKey, setSuccessTaskKey] = useState('');
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createTask, isPending } = useCreateTaskMutation();
  
  // Fetch workstreams & users from database
  const { data: workstreams = [] } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setWorkstreamId(defaultWorkstream || '');
      setAssigneeId('');
      setPriority('medium');
      setStartDate(new Date().toISOString());
      setDueDate('');
      setErrors({});
      setShowSuccess(false);
      setSuccessTaskKey('');
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open, defaultWorkstream]);

  // Keyboard shortcuts
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
    
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, workstreamId, startDate, dueDate]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!validate()) {
      if (!title.trim()) {
        titleInputRef.current?.focus();
      }
      return;
    }

    // Note: status is handled via status_id lookup - the mutation hook looks up
    // the status_id from planner_statuses table based on slug (defaults to 'backlog')
    const input: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      workstream_id: workstreamId,
      assignee_id: assigneeId || undefined,
      priority,
      start_date: startDate ? format(new Date(startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      due_date: dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : undefined,
    };

    createTask(input, {
      onSuccess: (result) => {
        setSuccessTaskKey(result.task_key);
        setShowSuccess(true);
        
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 99998,
            }}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div 
              style={{
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                backgroundColor: COLORS.surfaceCard,
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
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
                      borderRadius: '16px',
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
                        backgroundColor: 'var(--ds-background-success, #dcfce7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <Check style={{ width: '32px', height: '32px', color: 'var(--ds-text-success, #16a34a)' }} />
                    </motion.div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      marginBottom: '8px',
                    }}>
                      Task Created!
                    </h3>
                    <div style={{
                      padding: '4px 12px',
                      backgroundColor: COLORS.surfacePage,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      color: COLORS.textMuted,
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
                borderBottom: `1px solid ${COLORS.borderLight}`,
              }}>
                <h2 
                  id="create-task-title" 
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    margin: 0,
                  }}
                >
                  Add Task
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending) e.currentTarget.style.backgroundColor = COLORS.surfacePage;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  aria-label="Close"
                >
                  <X style={{ width: '18px', height: '18px', color: COLORS.textMuted }} />
                </button>
              </div>

              {/* Form Body */}
              <div style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: 1,
                overflowY: 'auto',
              }}>
                {/* Title Input (Required) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}>
                    Title <span style={{ color: 'var(--ds-text-danger, #dc2626)' }}>*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: COLORS.textPrimary,
                      backgroundColor: COLORS.surfaceCard,
                      border: `1px solid ${errors.title ? 'var(--ds-text-danger, #ef4444)' : COLORS.borderDefault}`,
                      borderRadius: '12px',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = COLORS.borderFocus;
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.title ? 'var(--ds-text-danger, #ef4444)' : COLORS.borderDefault;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  {errors.title && (
                    <span style={{ fontSize: '12px', color: 'var(--ds-text-danger, #ef4444)' }}>{errors.title}</span>
                  )}
                </div>

                {/* Description (Always Visible) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ds-text-subtlest, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add details, context, or requirements..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '14px',
                      color: COLORS.textPrimary,
                      backgroundColor: COLORS.surfaceCard,
                      border: `1px solid ${COLORS.borderDefault}`,
                      borderRadius: '12px',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = COLORS.borderFocus;
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = COLORS.borderDefault;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* ROW 1: Workstream + Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <WorkstreamDropdown
                    value={workstreamId}
                    onChange={setWorkstreamId}
                    workstreams={workstreams}
                    error={errors.workstream}
                  />
                  <PriorityDropdown
                    value={priority}
                    onChange={setPriority}
                  />
                </div>

                {/* ROW 2: Assignee + Start Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <AssigneeDropdown
                    value={assigneeId}
                    onChange={setAssigneeId}
                    users={users}
                  />
                  <DateDropdown
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Select date..."
                    required
                    error={errors.startDate}
                  />
                </div>

                {/* ROW 3: Due Date (full width) */}
                <DateDropdown
                  label="Due Date"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="Select date..."
                  required
                  error={errors.dueDate}
                />
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: `1px solid ${COLORS.borderLight}`,
                backgroundColor: COLORS.surfacePage,
              }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: COLORS.textSecondary,
                    backgroundColor: 'transparent',
                    border: `1px solid ${COLORS.borderDefault}`,
                    borderRadius: '12px',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.5 : 1,
                    transition: 'background-color 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending) e.currentTarget.style.backgroundColor = COLORS.surfaceCard;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
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
                    color: 'var(--ds-surface, #ffffff)',
                    backgroundColor: COLORS.accent,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (isPending || !title.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isPending || !title.trim()) ? 0.5 : 1,
                    boxShadow: (isPending || !title.trim()) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPending && title.trim()) {
                      e.currentTarget.style.backgroundColor = 'var(--ds-background-brand-bold-hovered, #1d4ed8)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.accent;
                    e.currentTarget.style.boxShadow = (isPending || !title.trim()) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)';
                  }}
                >
                  {isPending ? (
                    <>
                      <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus style={{ width: '16px', height: '16px' }} />
                      Add Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// PriorityDropdown - Opens UPWARD
// ============================================================================

interface PriorityDropdownProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}

function PriorityDropdown({ value, onChange }: PriorityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = value.charAt(0).toUpperCase() + value.slice(1);
  const currentColor = PRIORITY_COLORS[displayValue] || 'var(--ds-text-subtlest, #94a3b8)';

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
      <label style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--ds-text-subtlest, #64748b)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}>
        Priority
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        <ColorDot color={currentColor} size={10} />
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: COLORS.textPrimary }}>
          {displayValue}
        </span>
        <ChevronDown size={16} style={{ color: COLORS.textLight, transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 100001,
            padding: '6px',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          {PRIORITIES.map((p) => (
            <DropdownItem
              key={p}
              value={p}
              color={PRIORITY_COLORS[p]}
              isSelected={displayValue === p}
              onClick={() => { onChange(p.toLowerCase() as TaskPriority); setIsOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WorkstreamDropdown - Opens UPWARD
// ============================================================================

interface WorkstreamDropdownProps {
  value: string;
  onChange: (value: string) => void;
  workstreams: { id: string; name: string; color?: string }[];
  error?: string;
}

function WorkstreamDropdown({ value, onChange, workstreams, error }: WorkstreamDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedWorkstream = workstreams.find(w => w.id === value);
  const displayName = selectedWorkstream?.name || 'Select workstream...';
  const displayColor = selectedWorkstream?.color || WORKSTREAM_COLORS[displayName] || 'var(--ds-text-subtlest, #94a3b8)';

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
      <label style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--ds-text-subtlest, #64748b)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}>
        Workstream <span style={{ color: 'var(--ds-text-danger, #dc2626)' }}>*</span>
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${error ? 'var(--ds-text-danger, #ef4444)' : isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        {selectedWorkstream && <ColorDot color={displayColor} size={10} />}
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: selectedWorkstream ? COLORS.textPrimary : COLORS.textLight }}>
          {displayName}
        </span>
        <ChevronDown size={16} style={{ color: COLORS.textLight, transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>

      {error && <span style={{ fontSize: '12px', color: 'var(--ds-text-danger, #ef4444)' }}>{error}</span>}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 100001,
            padding: '6px',
            maxHeight: '280px',
            overflowY: 'auto'
          }}
        >
          {workstreams.map((ws) => {
            const color = ws.color || WORKSTREAM_COLORS[ws.name] || 'var(--ds-text-subtlest, #94a3b8)';
            return (
              <DropdownItem
                key={ws.id}
                value={ws.name}
                color={color}
                isSelected={value === ws.id}
                onClick={() => { onChange(ws.id); setIsOpen(false); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AssigneeDropdown - Opens UPWARD
// ============================================================================

interface AssigneeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  users: { id: string; name: string; initials?: string; avatarUrl?: string; email?: string }[];
}

function AssigneeDropdown({ value, onChange, users }: AssigneeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => u.id === value);
  const displayName = selectedUser?.name || 'Select assignee...';
  const displayInitials = selectedUser?.initials || (selectedUser ? selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?');
  
  const getColorFromName = (name: string): string => {
    const colors = ['var(--ds-text-brand, #3b82f6)', '#8b5cf6', '#ec4899', '#14b8a6', 'var(--ds-text-warning, #f59e0b)', '#6366f1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  const displayColor = selectedUser ? getColorFromName(selectedUser.name) : 'var(--ds-text-subtlest, #94a3b8)';

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
      <label style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--ds-text-subtlest, #64748b)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}>
        Assignee
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        {selectedUser && <Avatar initials={displayInitials} color={displayColor} size="sm" />}
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: selectedUser ? COLORS.textPrimary : COLORS.textLight }}>
          {displayName}
        </span>
        <ChevronDown size={16} style={{ color: COLORS.textLight, transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 100001,
            padding: '6px',
            maxHeight: '320px',
            overflowY: 'auto'
          }}
        >
          {/* Search Input */}
          <div style={{ padding: '6px', borderBottom: `1px solid ${COLORS.borderLight}`, marginBottom: '6px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              backgroundColor: COLORS.surfacePage,
              borderRadius: '8px',
              border: `1px solid ${COLORS.borderLight}`,
            }}>
              <Search size={16} style={{ color: COLORS.textLight }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '14px',
                  color: COLORS.textPrimary,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Unassigned Option */}
          <AssigneeItem
            name="Unassigned"
            initials="?"
            color="var(--ds-text-subtlest, #94a3b8)"
            isSelected={!value}
            onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
          />

          {/* User List */}
          {filteredUsers.map((user) => {
            const initials = user.initials || user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const color = getColorFromName(user.name);
            return (
              <AssigneeItem
                key={user.id}
                name={user.name}
                email={user.email}
                initials={initials}
                color={color}
                isSelected={value === user.id}
                onClick={() => { onChange(user.id); setIsOpen(false); setSearch(''); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DateDropdown - Opens UPWARD above footer
// ============================================================================

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DateDropdownProps {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}

function DateDropdown({ label, value, placeholder = 'Select date...', onChange, required, error }: DateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedDate = value ? new Date(value) : null;
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number): number => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.toISOString());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days: React.ReactNode[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '36px', height: '50px' }} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      
      days.push(
        <button
          key={day}
          onClick={() => handleSelectDate(day)}
          style={{
            width: '36px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: isToday && !isSelected ? `1px solid ${COLORS.accent}` : 'none',
            backgroundColor: isSelected ? COLORS.accent : 'transparent',
            color: isSelected ? 'var(--ds-surface, #ffffff)' : COLORS.textPrimary,
            fontSize: '14px',
            fontWeight: isSelected || isToday ? 600 : 400,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background-color 0.1s ease',
          }}
          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.surfaceHover; }}
          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
      <label style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--ds-text-subtlest, #64748b)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}>
        {label} {required && <span style={{ color: 'var(--ds-text-danger, #dc2626)' }}>*</span>}
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${error ? 'var(--ds-text-danger, #ef4444)' : isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderFocus : COLORS.borderDefault)}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
        }}
      >
        <Calendar size={18} style={{ color: COLORS.textLight, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '14px', color: selectedDate ? COLORS.textPrimary : COLORS.textLight }}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        {selectedDate && !required && (
          <X size={16} style={{ color: COLORS.textLight, cursor: 'pointer' }} onClick={handleClear} />
        )}
        <ChevronDown size={16} style={{ color: COLORS.textLight, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
      </div>
      
      {error && <span style={{ fontSize: '12px', color: 'var(--ds-text-danger, #ef4444)' }}>{error}</span>}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            zIndex: 100001,
            padding: '16px',
            width: '300px'
          }}
        >
          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={handlePrevMonth} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.textMuted }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 600, color: COLORS.textPrimary }}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button onClick={handleNextMonth} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.textMuted }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ width: '36px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: COLORS.textMuted }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {renderCalendar()}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${COLORS.borderLight}` }}>
            {[
              { label: 'Today', getDays: 0 },
              { label: 'Tomorrow', getDays: 1 },
              { label: 'Next Week', getDays: 7 },
            ].map(({ label: btnLabel, getDays }) => (
              <button
                key={btnLabel}
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() + getDays);
                  onChange(date.toISOString());
                  setIsOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: COLORS.surfaceHover,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {btnLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Shared DropdownItem Component
// ============================================================================

function DropdownItem({ value, color, isSelected, onClick }: { value: string; color: string; isSelected: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? COLORS.accentLight : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      <ColorDot color={color} size={10} />
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{value}</span>
      {isSelected && <Check size={16} style={{ color: COLORS.accent, marginLeft: 'auto' }} />}
    </div>
  );
}

// ============================================================================
// AssigneeItem Component
// ============================================================================

function AssigneeItem({ name, email, initials, color, isSelected, onClick }: { 
  name: string; 
  email?: string;
  initials: string; 
  color: string; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? COLORS.accentLight : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: color,
          color: 'var(--ds-surface, #ffffff)',
          fontSize: '11px',
          fontWeight: 600
        }}
      >
        {initials}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', color: COLORS.textPrimary, fontWeight: 500 }}>{name}</div>
        {email && <div style={{ fontSize: '12px', color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
      </div>
      {isSelected && <Check size={16} style={{ color: COLORS.accent }} />}
    </div>
  );
}

export default CreateTaskModal;
