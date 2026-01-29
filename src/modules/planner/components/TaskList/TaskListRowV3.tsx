/**
 * Task List Row V3 - Enterprise Clean Implementation
 * Matches QA spec: gray priority text, outline status badges, gray ID
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2, Check, Plus } from 'lucide-react';
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

// Enterprise Clean spec colors - inline styles to ensure specificity
const STATUS_CONFIG: Record<string, { 
  label: string; 
  dotColor: string; 
  bgColor: string;
  borderColor: string;
}> = {
  'backlog': { 
    label: 'Backlog', 
    dotColor: '#94a3b8', 
    bgColor: 'transparent', 
    borderColor: '#e2e8f0' 
  },
  'planned': { 
    label: 'Planned', 
    dotColor: '#3b82f6', 
    bgColor: 'transparent', 
    borderColor: '#e2e8f0' 
  },
  'in-progress': { 
    label: 'In Progress', 
    dotColor: '#f59e0b', 
    bgColor: '#fffbeb',  // Subtle amber tint
    borderColor: '#fde68a' 
  },
  'in progress': { 
    label: 'In Progress', 
    dotColor: '#f59e0b', 
    bgColor: '#fffbeb',  // Subtle amber tint
    borderColor: '#fde68a' 
  },
  'review': { 
    label: 'Review', 
    dotColor: '#8b5cf6', 
    bgColor: 'transparent', 
    borderColor: '#e2e8f0' 
  },
  'done': { 
    label: 'Done', 
    dotColor: '#16a34a', 
    bgColor: '#f0fdf4',  // Subtle green tint
    borderColor: '#bbf7d0' 
  },
};

// Priority dot colors (spec A2)
const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
  critical: '#dc2626', // red-600
  high: '#f97316',     // orange-500
  medium: '#eab308',   // yellow-500 (NOT green)
  low: '#94a3b8',      // gray-400
};

// ============================================================
// ASSIGNEE DROPDOWN - Searchable with colored avatars
// Matches the Task Detail drawer design
// ============================================================
interface AssigneeDropdownProps {
  task: TaskListTask;
  users: Array<{ id: string; name: string; initials: string }>;
  workstreamColor: string;
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

function AssigneeDropdown({ task, users, workstreamColor, width, onUpdate }: AssigneeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const lower = search.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(lower));
  }, [users, search]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Generate a color based on user name for consistent avatar colors
  const getAvatarColor = (name: string) => {
    const colors = [
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#6366f1', // indigo
      '#14b8a6', // teal
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
        <PopoverTrigger asChild>
          <button className="tl-assignee-cell">
            {task.assignee_name ? (
              <>
                {/* Avatar - 24px with colored background */}
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: workstreamColor || getAvatarColor(task.assignee_name) }}
                >
                  {getInitials(task.assignee_name)}
                </div>
                {/* Assignee name */}
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
        <PopoverContent 
          className="w-64 p-0 z-[500] bg-popover border border-border shadow-lg" 
          align="start"
        >
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto p-1.5">
            {/* Unassigned option */}
            <button
              onClick={() => { onUpdate(task.id, 'assignee_id', null); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                !task.assignee_id ? "bg-muted font-semibold" : "hover:bg-muted/50"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                ?
              </div>
              <span className="text-muted-foreground">Unassigned</span>
              {!task.assignee_id && <Check className="w-4 h-4 ml-auto text-primary" />}
            </button>
            
            {/* User options */}
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => { onUpdate(task.id, 'assignee_id', user.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  user.id === task.assignee_id ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(user.name) }}
                >
                  {user.initials}
                </div>
                <span className="truncate">{user.name || 'Unnamed'}</span>
                {user.id === task.assignee_id && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </td>
  );
}

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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const workstreamColors = getWorkstreamColor(task.workstream_name);
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

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

      {/* Status - OUTLINE badge with GRAY text (A3, spec) */}
      {visibleColumns.has('status') && (
        <td style={{ width: getWidth('status') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button 
                className="tl-status-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: statusConfig.bgColor,
                  border: `1px solid ${statusConfig.borderColor}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Status dot - 6px (G2) */}
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor: statusConfig.dotColor,
                  }}
                />
                {/* GRAY text - #475569 (A3.3, A3.7) */}
                <span style={{ color: '#475569' }}>{task.status_name || 'Unknown'}</span>
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
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: s.color }} 
                  />
                  <span style={{ color: '#64748b' }}>{s.name}</span>
                  {s.id === task.status_id && <Check className="w-4 h-4 ml-auto text-blue-600" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Priority - Colored dot + GRAY text (A1, A2) */}
      {visibleColumns.has('priority') && (
        <td style={{ width: getWidth('priority') }} onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  margin: '-4px -8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                {/* Priority dot - 8px (G1) */}
                <span 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor: PRIORITY_DOT_COLORS[task.priority],
                  }} 
                />
                {/* GRAY text - #64748b (A1.1-A1.4) */}
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>
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
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: PRIORITY_DOT_COLORS[p] }} 
                    />
                    <span style={{ color: '#64748b' }}>{config.label}</span>
                    {p === task.priority && <Check className="w-4 h-4 ml-auto text-blue-600" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </td>
      )}

      {/* Workstream - Colored dot + GRAY name (D1-D6) */}
      {visibleColumns.has('workstream') && (
        <td style={{ width: getWidth('workstream') }}>
          {task.workstream_name ? (
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {/* Workstream dot - 8px (D2) */}
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: workstreamColors.hex,
                }}
              />
              {/* GRAY text - #64748b (D1) */}
              <span style={{ color: '#64748b' }}>{task.workstream_name}</span>
            </span>
          ) : (
            <span style={{ color: '#94a3b8' }}>—</span>
          )}
        </td>
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
}
