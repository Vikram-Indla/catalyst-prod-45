/**
 * Task List Row V3 - Inline Editing Row
 * Supports inline editing for all editable fields
 */

import { useState, useRef, useEffect } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2, Check, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
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
import { format } from 'date-fns';
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

  const getDueDateClass = () => {
    if (!task.due_date) return '';
    if (task.is_overdue) return 'tl-due-overdue';
    if (task.is_due_today) return 'tl-due-today';
    if (task.is_due_soon) return 'tl-due-soon';
    return '';
  };

  const getWidth = (colId: string) => columnWidths[colId] || 'auto';

  return (
    <tr
      data-task-index={index}
      className={cn(
        'tl-row group',
        isSelected && 'selected',
        isFocused && !isSelected && 'focused',
        task.blocked && 'blocked'
      )}
      onClick={() => onClick(task)}
    >
      {/* Checkbox */}
      <td style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(task.id)}
        />
      </td>

      {/* ID - Task Key */}
      {visibleColumns.has('key') && (
        <td style={{ width: getWidth('key') }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(task);
            }}
            className="tl-task-key"
          >
            {task.task_key}
          </button>
        </td>
      )}

      {/* Title - Inline Edit */}
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
              className="tl-inline-input tl-cell-editing"
              style={{ background: 'var(--pln-tl-surface-editing)' }}
            />
          ) : (
            <div 
              className="tl-cell-editable flex items-center gap-2"
              onClick={() => startEditing('title', task.title)}
            >
              {task.blocked && (
                <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--pln-tl-priority-critical)' }} />
              )}
              <span 
                className="font-medium truncate max-w-[300px]"
                style={{ color: 'var(--pln-tl-text-primary)' }}
              >
                {task.title}
              </span>
            </div>
          )}
        </td>
      )}

      {/* Status - Inline Dropdown */}
      {visibleColumns.has('status') && (
        <td style={{ width: getWidth('status') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-cell-editable tl-status-badge" style={{
                borderColor: task.status_color ? `${task.status_color}40` : 'var(--pln-tl-border)',
                color: task.status_color || 'var(--pln-tl-text-tertiary)',
              }}>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.status_color || '#64748b' }}
                />
                {task.status_name || 'Unknown'}
                <ChevronDown className="w-3 h-3 opacity-50" />
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
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {s.id === task.status_id && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Priority - Inline Dropdown */}
      {visibleColumns.has('priority') && (
        <td style={{ width: getWidth('priority') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-cell-editable tl-priority-badge">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: priorityConfig.color }} />
                <span style={{ color: priorityConfig.color }}>{priorityConfig.label}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
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
                    <span className="text-sm">{config.emoji}</span>
                    <span style={{ color: config.color }}>{config.label}</span>
                    {p === task.priority && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Workstream */}
      {visibleColumns.has('workstream') && (
        <td style={{ width: getWidth('workstream') }}>
          {task.workstream_name ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: workstreamColors.hex }}
              />
              <span style={{ color: workstreamColors.hex }}>{task.workstream_name}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--pln-tl-text-muted)' }}>—</span>
          )}
        </td>
      )}

      {/* Assignee - Inline Dropdown */}
      {visibleColumns.has('assignee') && (
        <td style={{ width: getWidth('assignee') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-cell-editable flex items-center gap-2">
                {task.assignee_name ? (
                  <>
                    <div className="tl-avatar">
                      {task.assignee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm truncate" style={{ color: 'var(--pln-tl-text-secondary)' }}>
                      {task.assignee_name}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--pln-tl-text-muted)' }}>Unassigned</span>
                )}
                <ChevronDown className="w-3 h-3 opacity-50" />
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

      {/* Due Date - Inline Calendar */}
      {visibleColumns.has('dueDate') && (
        <td style={{ width: getWidth('dueDate') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn('tl-cell-editable inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded', getDueDateClass())}>
                <CalendarIcon className="w-3 h-3" />
                {task.due_date ? formatDate(task.due_date) : <span style={{ color: 'var(--pln-tl-text-muted)' }}>Set date</span>}
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

      {/* Progress - Inline Slider */}
      {visibleColumns.has('progress') && (
        <td style={{ width: getWidth('progress') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-cell-editable tl-progress-bar w-full">
                <div className="tl-progress-track">
                  <div
                    className="tl-progress-fill"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: task.progress >= 100 ? '#22c55e' : task.progress >= 50 ? '#22c55e' : '#94a3b8',
                    }}
                  />
                </div>
                <span className="tl-progress-label">{task.progress}%</span>
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
                          : "text-slate-600 hover:bg-slate-100"
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
              <button className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{
                color: 'var(--pln-tl-text-tertiary)',
              }}>
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
