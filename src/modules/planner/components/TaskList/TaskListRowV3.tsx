/**
 * Task List Row V3 - Enterprise Clean Implementation
 * Matches QA spec: gray priority text, outline status badges, gray ID
 * Dropdowns match CreateTaskModal V10 styling
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2 } from 'lucide-react';
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
import type { TaskListTask } from '../../hooks/useTaskList';
import type { Label } from '@/components/planner/task-modal/types/labels';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { AssigneeDropdown } from './AssigneeDropdown';
import { StatusDropdown } from './StatusDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { WorkstreamDropdown } from './WorkstreamDropdown';
import { LabelsDropdown } from './LabelsDropdown';

// Enterprise Clean spec colors - inline styles to ensure specificity
const STATUS_CONFIG: Record<string, {
  label: string;
  dotColor: string;
  bgColor: string;
  borderColor: string;
  darkBgColor: string;
  darkBorderColor: string;
}> = {
  'backlog': {
    label: 'Backlog',
    dotColor: '#94a3b8',
    bgColor: 'transparent',
    borderColor: '#e2e8f0',
    darkBgColor: 'transparent',
    darkBorderColor: '#2E2E2E',
  },
  'planned': {
    label: 'Planned',
    dotColor: '#3b82f6',
    bgColor: 'transparent',
    borderColor: '#e2e8f0',
    darkBgColor: 'transparent',
    darkBorderColor: '#2E2E2E',
  },
  'in-progress': {
    label: 'In Progress',
    dotColor: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    darkBgColor: 'rgba(251,191,36,0.08)',
    darkBorderColor: 'rgba(251,191,36,0.2)',
  },
  'in progress': {
    label: 'In Progress',
    dotColor: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    darkBgColor: 'rgba(251,191,36,0.08)',
    darkBorderColor: 'rgba(251,191,36,0.2)',
  },
  'review': {
    label: 'Review',
    dotColor: '#8b5cf6',
    bgColor: 'transparent',
    borderColor: '#e2e8f0',
    darkBgColor: 'transparent',
    darkBorderColor: '#2E2E2E',
  },
  'done': {
    label: 'Done',
    dotColor: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    darkBgColor: 'rgba(74,222,128,0.08)',
    darkBorderColor: 'rgba(74,222,128,0.2)',
  },
};

// ============================================================
// INLINE SUB-COMPONENTS REMOVED — NOW IMPORTED FROM:
//   ./AssigneeDropdown
//   ./StatusDropdown
//   ./PriorityDropdown
//   ./WorkstreamDropdown
//   ./LabelsDropdown
// ============================================================

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
  labels?: Label[];
}

export const TaskListRowV3 = memo(function TaskListRowV3({
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
  labels = [],
}: TaskListRowV3Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const workstreamColors = getWorkstreamColor(task.workstream_name);

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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#22c55e';
    if (progress >= 50) return '#3b82f6';
    return '#94a3b8';
  };

  // Get status config for styling
  const getStatusConfig = () => {
    const slug = task.status_name?.toLowerCase().replace(/\s+/g, '-') || 'backlog';
    return STATUS_CONFIG[slug as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.backlog;
  };

  const statusConfig = getStatusConfig();

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
      {/* Checkbox - G4: 16px */}
      <td style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(task.id)}
          className="w-4 h-4"
        />
      </td>

      {/* ID - GRAY monospace (B1-B5) */}
      {visibleColumns.has('key') && (
        <td style={{ width: getWidth('key') }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(task);
            }}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '13px',
              fontWeight: 500,
              color: '#64748b',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.textDecoration = 'none';
            }}
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
              className="tl-inline-input"
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
                <Lock className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
              )}
              <span className="tl-title-text">
                {task.title}
              </span>
            </div>
          )}
        </td>
      )}

      {/* Status - Modal-style dropdown with colored dots */}
      {visibleColumns.has('status') && (
        <StatusDropdown
          task={task}
          statuses={statuses}
          statusConfig={statusConfig}
          width={getWidth('status')}
          onUpdate={onUpdate}
        />
      )}

      {/* Priority - Modal-style dropdown with colored dots */}
      {visibleColumns.has('priority') && (
        <PriorityDropdown
          task={task}
          width={getWidth('priority')}
          onUpdate={onUpdate}
        />
      )}

      {/* Workstream - Modal-style dropdown with colored dots */}
      {visibleColumns.has('workstream') && (
        <WorkstreamDropdown
          task={task}
          workstreamColors={workstreamColors}
          width={getWidth('workstream')}
          onUpdate={onUpdate}
        />
      )}

      {/* Labels - Inline editable dropdown */}
      {visibleColumns.has('labels') && (
        <LabelsDropdown
          task={task}
          taskLabels={labels}
          width={getWidth('labels')}
        />
      )}

      {/* Assignee - Avatar + name with searchable dropdown (K1-K5) */}
      {visibleColumns.has('assignee') && (
        <AssigneeDropdown
          task={task}
          users={users}
          workstreamColor={workstreamColors.hex}
          width={getWidth('assignee')}
          onUpdate={onUpdate}
        />
      )}

      {/* Due Date - Red if overdue (J1-J4) */}
      {visibleColumns.has('dueDate') && (
        <td style={{ width: getWidth('dueDate') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-date-cell">
                {task.due_date ? (
                  <>
                    {/* Normal: #334155, Overdue: #dc2626 (J1, J2) */}
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
                  /* Empty: em dash (J4) */
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

      {/* Progress - 6px bar (G5, G6, L1-L4) */}
      {visibleColumns.has('progress') && (
        <td style={{ width: getWidth('progress') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button className="tl-progress-cell">
                {/* Progress bar - 6px height, 60px min width */}
                <div className="tl-progress-track">
                  <div
                    className="tl-progress-fill"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: getProgressColor(task.progress),
                    }}
                  />
                </div>
                {/* Progress % - #64748b (L3) */}
                <span className="tl-progress-value">{task.progress}%</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-900">{task.progress}%</span>
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
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
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
});
