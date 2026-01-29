/**
 * Task List Row V3 - Inline Editing Row
 * Matches markdown spec: hover states, inline editing, proper indicators
 */

import { useState, useRef, useEffect } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2, Check, ChevronDown, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { PRIORITY_CONFIG } from '../../types';
import type { TaskListTask } from '../../hooks/useTaskList';
import type { TaskPriority } from '../../types';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface TaskListRowV3Props {
  task: TaskListTask;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (id: string) => void;
  onClick: (task: TaskListTask) => void;
  onUpdate: (taskId: string, field: string, value: any) => void;
  visibleColumns: Set<string>;
  columnWidths: Record<string, number>;
  statuses: Array<{ id: string; name: string; color?: string }>;
  users: Array<{ id: string; name: string; initials: string }>;
}

export function TaskListRowV3({
  task,
  index,
  isSelected,
  isFocused,
  onSelect,
  onClick,
  onUpdate,
  visibleColumns,
  columnWidths,
  statuses,
  users,
}: TaskListRowV3Props) {
  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const workstreamColors = getWorkstreamColor(task.workstream_name);
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Focus input when editing starts
  useEffect(() => {
    if (editingField === 'title' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.task_key);
    toast.success(`Copied ${task.task_key}`);
  };

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = (field: string, value: any) => {
    if (value !== task[field as keyof TaskListTask]) {
      onUpdate(task.id, field, value);
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      saveEdit(field, editValue);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'MMM d');
  };

  // Calculate days overdue/until due
  const getDaysIndicator = (): { text: string; isOverdue: boolean } | null => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = differenceInDays(dueDate, today);
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d`, isOverdue: true };
    }
    return null;
  };

  const daysIndicator = getDaysIndicator();

  const getWidth = (colId: string) => columnWidths[colId] || 'auto';

  // Get progress bar color based on value
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#22c55e'; // green
    if (progress >= 50) return '#3b82f6'; // blue
    return '#94a3b8'; // gray
  };

  return (
    <tr
      data-task-index={index}
      className={cn(
        'tl-row group',
        isSelected && 'selected',
        isFocused && !isSelected && 'focused',
        task.blocked && 'blocked'
      )}
    >
      {/* Checkbox */}
      <td style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(task.id)}
        />
      </td>

      {/* ID - Task Key (GRAY monospace, not blue) */}
      {visibleColumns.has('key') && (
        <td style={{ width: getWidth('key') }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(task);
            }}
            className="tl-task-key-gray"
          >
            {task.task_key}
          </button>
        </td>
      )}

      {/* Title - Inline Edit with hover effect */}
      {visibleColumns.has('title') && (
        <td style={{ width: getWidth('title') }} onClick={(e) => e.stopPropagation()}>
          {editingField === 'title' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => saveEdit('title', editValue)}
              onKeyDown={(e) => handleKeyDown(e, 'title')}
              className="tl-inline-input"
              style={{ 
                background: 'var(--pln-tl-surface-editing)',
                outline: '2px solid var(--pln-tl-border-focus)',
                borderRadius: '0.375rem',
              }}
            />
          ) : (
            <div 
              className="tl-title-cell"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startEditing('title', task.title);
              }}
            >
              {task.blocked && (
                <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--pln-tl-priority-critical)' }} />
              )}
              <span className="tl-title-text">
                {task.title}
              </span>
            </div>
          )}
        </td>
      )}

      {/* Status - OUTLINE badge with gray text (Enterprise Clean spec) */}
      {visibleColumns.has('status') && (
        <td style={{ width: getWidth('status') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button 
                className="tl-status-badge-enterprise"
                data-status={task.status_name?.toLowerCase().replace(/\s+/g, '-')}
              >
                <span
                  className="tl-status-dot"
                  style={{ backgroundColor: task.status_color || '#64748b' }}
                />
                {/* Gray text - enterprise spec */}
                <span className="tl-status-label-gray">{task.status_name || 'Unknown'}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="tl-dropdown w-40 p-1" align="start">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onUpdate(task.id, 'status_id', s.id)}
                  className={cn(
                    'tl-dropdown-item w-full',
                    s.id === task.status_id && 'active'
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-gray-600">{s.name}</span>
                  {s.id === task.status_id && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Priority - Colored dot + GRAY text (Enterprise Clean spec) */}
      {visibleColumns.has('priority') && (
        <td style={{ width: getWidth('priority') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-priority-cell">
                {/* Always use colored dot */}
                <span 
                  className="tl-priority-dot" 
                  style={{ backgroundColor: priorityConfig.color }} 
                />
                {/* GRAY text - never colored */}
                <span className="tl-priority-label-gray">
                  {priorityConfig.label}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="tl-dropdown w-36 p-1" align="start">
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => onUpdate(task.id, 'priority', p)}
                    className={cn(
                      'tl-dropdown-item w-full',
                      p === task.priority && 'active'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                    {/* Gray text in dropdown too */}
                    <span className="text-gray-500">{config.label}</span>
                    {p === task.priority && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Workstream - Colored dot + GRAY name (Enterprise Clean spec) */}
      {visibleColumns.has('workstream') && (
        <td style={{ width: getWidth('workstream') }}>
          {task.workstream_name ? (
            <span className="tl-workstream-cell">
              <span
                className="tl-workstream-dot"
                style={{ backgroundColor: workstreamColors.hex }}
              />
              {/* Gray text for workstream name */}
              <span className="text-gray-600 dark:text-gray-400">{task.workstream_name}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--pln-tl-text-muted)' }}>—</span>
          )}
        </td>
      )}

      {/* Assignee - Avatar or "+ Unassigned" button */}
      {visibleColumns.has('assignee') && (
        <td style={{ width: getWidth('assignee') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-assignee-cell">
                {task.assignee_name ? (
                  <>
                    <div className="tl-avatar">
                      {task.assignee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="tl-assignee-name">{task.assignee_name}</span>
                  </>
                ) : (
                  <span className="tl-unassigned-btn">
                    <Plus className="w-3 h-3" />
                    Unassigned
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="tl-dropdown w-48 p-1" align="start">
              <button
                onClick={() => onUpdate(task.id, 'assignee_id', null)}
                className={cn('tl-dropdown-item w-full', !task.assignee_id && 'active')}
              >
                <span style={{ color: 'var(--pln-tl-text-muted)' }}>Unassigned</span>
                {!task.assignee_id && <Check className="w-4 h-4 ml-auto" />}
              </button>
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onUpdate(task.id, 'assignee_id', user.id)}
                  className={cn(
                    'tl-dropdown-item w-full',
                    user.id === task.assignee_id && 'active'
                  )}
                >
                  <div className="tl-avatar">{user.initials}</div>
                  <span className="truncate">{user.name}</span>
                  {user.id === task.assignee_id && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Due Date - With overdue indicator */}
      {visibleColumns.has('dueDate') && (
        <td style={{ width: getWidth('dueDate') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-date-cell">
                {task.due_date ? (
                  <>
                    <span className={cn(
                      'tl-date-value',
                      daysIndicator?.isOverdue && 'tl-date-overdue'
                    )}>
                      {formatDate(task.due_date)}
                    </span>
                    {daysIndicator && (
                      <span className={cn(
                        'tl-days-indicator',
                        daysIndicator.isOverdue && 'overdue'
                      )}>
                        {daysIndicator.text}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="tl-date-placeholder">—</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={(date) => {
                  onUpdate(task.id, 'due_date', date ? date.toISOString().split('T')[0] : null);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Progress - Track bar with inline percentage */}
      {visibleColumns.has('progress') && (
        <td style={{ width: getWidth('progress') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-progress-cell">
                <div className="tl-progress-track">
                  <div
                    className="tl-progress-fill"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: getProgressColor(task.progress),
                    }}
                  />
                </div>
                <span className="tl-progress-value">{task.progress}%</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-3">
                <div className="flex justify-between text-xs" style={{ color: 'var(--pln-tl-text-tertiary)' }}>
                  <span>Progress</span>
                  <span className="font-semibold" style={{ color: 'var(--pln-tl-text-primary)' }}>{task.progress}%</span>
                </div>
                <Slider
                  value={[task.progress]}
                  onValueChange={([val]) => onUpdate(task.id, 'progress', val)}
                  max={100}
                  step={5}
                />
                <div className="flex gap-1">
                  {[0, 25, 50, 75, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => onUpdate(task.id, 'progress', val)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded transition-colors",
                        task.progress === val
                          ? "bg-blue-600 text-white"
                          : "hover:bg-slate-100"
                      )}
                      style={{
                        background: task.progress === val ? undefined : 'var(--pln-tl-surface-header)',
                        color: task.progress === val ? 'white' : 'var(--pln-tl-text-tertiary)',
                      }}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Actions */}
      {visibleColumns.has('actions') && (
        <td style={{ width: getWidth('actions') }} onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="tl-actions-btn">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="tl-dropdown w-40">
              <DropdownMenuItem onClick={() => onClick(task)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyKey}>
                <Copy className="w-4 h-4 mr-2" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  );
}
