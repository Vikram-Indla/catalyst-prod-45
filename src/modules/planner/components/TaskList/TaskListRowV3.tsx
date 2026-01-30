/**
 * Task List Row V3 - Enterprise Clean Implementation
 * Matches QA spec: gray priority text, outline status badges, gray ID
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Lock, MoreHorizontal, ExternalLink, Copy, Trash2, Check, Plus, Tag, Search, Loader2 } from 'lucide-react';
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
import type { Label } from '@/components/planner/task-modal/types/labels';
import { LabelBadge } from '@/components/planner/task-modal/molecules/LabelBadge';
import { useLabels } from '@/components/planner/task-modal/hooks/useLabels';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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

// ============================================================
// STATUS DROPDOWN - Modal-style with colored dots
// ============================================================
interface StatusDropdownProps {
  task: TaskListTask;
  statuses: Array<{ id: string; name: string; slug?: string; color?: string }>;
  statusConfig: { bgColor: string; borderColor: string; dotColor: string };
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

function StatusDropdown({ task, statuses, statusConfig, width, onUpdate }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium cursor-pointer border-0"
            style={{
              backgroundColor: statusConfig.bgColor,
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusConfig.dotColor }}
            />
            <span style={{ color: '#475569' }}>{task.status_name || 'Unknown'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5 z-[500] bg-popover border border-border shadow-lg" align="start">
          {statuses.map((status) => {
            const isSelected = status.id === task.status_id;
            return (
              <button
                key={status.id}
                onClick={() => { onUpdate(task.id, 'status_id', status.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isSelected ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color || '#94a3b8' }} />
                <span>{status.name}</span>
                {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </td>
  );
}

// ============================================================
// PRIORITY DROPDOWN - Modal-style with colored dots
// ============================================================
interface PriorityDropdownProps {
  task: TaskListTask;
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

function PriorityDropdown({ task, width, onUpdate }: PriorityDropdownProps) {
  const [open, setOpen] = useState(false);
  const currentConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer bg-transparent border-0 hover:bg-muted/50 transition-colors">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }}
            />
            <span className="text-sm font-medium" style={{ color: '#334155' }}>{currentConfig.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 z-[500] bg-popover border border-border shadow-lg" align="start">
          {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            const isSelected = priority === task.priority;
            return (
              <button
                key={priority}
                onClick={() => { onUpdate(task.id, 'priority', priority); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isSelected ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_DOT_COLORS[priority] }} />
                <span>{config.label}</span>
                {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </td>
  );
}

// ============================================================
// WORKSTREAM DROPDOWN - Modal-style with colored dots
// ============================================================
interface WorkstreamDropdownProps {
  task: TaskListTask;
  workstreamColors: { hex: string };
  width: number | string;
  onUpdate: (taskId: string, field: string, value: any) => void;
}

function WorkstreamDropdown({ task, workstreamColors, width, onUpdate }: WorkstreamDropdownProps) {
  const [open, setOpen] = useState(false);
  const { data: workstreams = [] } = usePlannerWorkstreams();

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer bg-transparent border-0 hover:bg-muted/50 transition-colors">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.workstream_name ? workstreamColors.hex : '#9ca3af' }}
            />
            <span className="text-sm font-medium" style={{ color: '#334155' }}>
              {task.workstream_name || 'None'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1.5 z-[500] bg-popover border border-border shadow-lg max-h-[280px] overflow-y-auto" align="start">
          <button
            onClick={() => { onUpdate(task.id, 'workstream_id', null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
              !task.workstream_id ? "bg-muted font-semibold" : "hover:bg-muted/50"
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" />
            <span className="text-muted-foreground">None</span>
            {!task.workstream_id && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
          {workstreams.map((ws) => {
            const colors = getWorkstreamColor(ws.name);
            const isSelected = ws.id === task.workstream_id;
            return (
              <button
                key={ws.id}
                onClick={() => { onUpdate(task.id, 'workstream_id', ws.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isSelected ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.hex }} />
                <span>{ws.name}</span>
                {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </td>
  );
}

// ============================================================
// LABELS DROPDOWN - Inline editable labels with checkmarks
// ============================================================
interface LabelsDropdownProps {
  task: TaskListTask;
  taskLabels: Label[];
  width: number | string;
}

function LabelsDropdown({ task, taskLabels, width }: LabelsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [localLabels, setLocalLabels] = useState<Label[]>(taskLabels);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { labels: allLabels, isLoading: labelsLoading } = useLabels();

  // Sync with props
  useEffect(() => {
    setLocalLabels(taskLabels);
  }, [taskLabels]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filteredLabels = useMemo(() => {
    if (!search.trim()) return allLabels;
    const lower = search.toLowerCase();
    return allLabels.filter(l => l.name?.toLowerCase().includes(lower));
  }, [allLabels, search]);

  const isLabelAssigned = useCallback((labelId: string) => {
    return localLabels.some(l => l.id === labelId);
  }, [localLabels]);

  const toggleLabel = async (label: Label) => {
    setIsUpdating(true);
    const isAssigned = isLabelAssigned(label.id);

    try {
      if (isAssigned) {
        // Remove label
        const { error } = await supabase
          .from('planner_task_labels')
          .delete()
          .eq('task_id', task.id)
          .eq('label_id', label.id);
        
        if (error) throw error;
        setLocalLabels(prev => prev.filter(l => l.id !== label.id));
      } else {
        // Add label
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('planner_task_labels')
          .insert({
            task_id: task.id,
            label_id: label.id,
            assigned_by: user?.id
          });
        
        if (error && error.code !== '23505') throw error;
        setLocalLabels(prev => [...prev, label]);
      }
      
      // Invalidate cache so table updates
      queryClient.invalidateQueries({ queryKey: ['task-labels-map'] });
    } catch (error) {
      console.error('Error toggling label:', error);
      toast.error('Failed to update label');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-1 min-h-[32px] px-1 py-1 rounded-md cursor-pointer bg-transparent border-0 hover:bg-muted/50 transition-colors text-left">
            {localLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1 items-center">
                {localLabels.slice(0, 2).map(label => (
                  <LabelBadge key={label.id} label={label} size="sm" />
                ))}
                {localLabels.length > 2 && (
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    +{localLabels.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-0 z-[500] bg-popover border border-border shadow-lg" 
          align="start"
        >
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search labels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Labels list */}
          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {labelsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {search ? 'No labels found' : 'No labels available'}
              </div>
            ) : (
              filteredLabels.map((label) => {
                const isAssigned = isLabelAssigned(label.id);
                return (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label)}
                    disabled={isUpdating}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isAssigned ? "bg-muted font-medium" : "hover:bg-muted/50",
                      isUpdating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {/* Color dot */}
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    {/* Label name */}
                    <span className="flex-1 text-left truncate">{label.name}</span>
                    {/* Checkmark if assigned */}
                    {isAssigned && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
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
  labels?: Label[];
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
  labels = [],
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
}
