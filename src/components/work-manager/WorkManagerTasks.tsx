// src/components/work-manager/WorkManagerTasks.tsx
// Tasks Table View - 9.8 Executive Grade (Bloomberg/Linear/Notion Standard)

import { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle,
  ListTodo,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { getUserById, getTeamById } from '@/lib/work-manager-data';
import type { TaskExtended } from './types';
import { cn } from '@/lib/utils';

interface WorkManagerTasksProps {
  tasks: TaskExtended[];
  onOpenTask: (taskId: string) => void;
}

type SortField = 'key' | 'title' | 'team' | 'assignee' | 'type' | 'status' | 'priority' | 'dueDate';
type SortDirection = 'asc' | 'desc';

// Status configuration - opaque semantic tokens, no opacity
const statusConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  'Backlog': {
    label: 'Backlog',
    dotClass: 'bg-text-muted',
    textClass: 'text-text-muted',
  },
  'Planned': {
    label: 'Planned',
    dotClass: 'bg-text-muted',
    textClass: 'text-text-muted',
  },
  'To Do': {
    label: 'To Do',
    dotClass: 'bg-brand-primary',
    textClass: 'text-brand-primary',
  },
  'In Progress': {
    label: 'In Progress',
    dotClass: 'bg-brand-primary',
    textClass: 'text-brand-primary',
  },
  'Waiting': {
    label: 'Waiting',
    dotClass: 'bg-warning',
    textClass: 'text-warning',
  },
  'In Review': {
    label: 'In Review',
    dotClass: 'bg-info',
    textClass: 'text-info',
  },
  'Done': {
    label: 'Done',
    dotClass: 'bg-success',
    textClass: 'text-success',
  },
};

// Priority configuration - only Critical/High get strong color
const priorityConfig: Record<string, { label: string; dotClass: string; textClass: string; isStrong: boolean }> = {
  'critical': {
    label: 'Critical',
    dotClass: 'bg-danger',
    textClass: 'text-danger',
    isStrong: true,
  },
  'high': {
    label: 'High',
    dotClass: 'bg-warning',
    textClass: 'text-warning',
    isStrong: true,
  },
  'medium': {
    label: 'Medium',
    dotClass: 'bg-text-muted',
    textClass: 'text-text-secondary',
    isStrong: false,
  },
  'low': {
    label: 'Low',
    dotClass: 'bg-text-muted',
    textClass: 'text-text-muted',
    isStrong: false,
  },
};

// Status Badge Component - calm, clear hierarchy
const StatusBadge = ({ status, isDone }: { status: string; isDone: boolean }) => {
  const config = statusConfig[status] || statusConfig['Backlog'];
  
  if (isDone) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-success">Done</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", config.dotClass)} />
      <span className={cn("text-sm font-medium", config.textClass)}>
        {config.label}
      </span>
    </div>
  );
};

// Priority Badge Component - contextual emphasis
const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig['medium'];
  
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", config.dotClass)} />
      <span className={cn(
        "text-sm",
        config.isStrong ? "font-semibold" : "font-medium",
        config.textClass
      )}>
        {config.label}
      </span>
    </div>
  );
};

// Due Date Cell Component - calm urgency signals
const DueDateCell = ({ date, isOverdue, dueBucket, isDone }: { 
  date: string | null; 
  isOverdue?: boolean; 
  dueBucket?: string;
  isDone?: boolean;
}) => {
  if (!date) {
    return <span className="text-sm text-text-muted">—</span>;
  }
  
  const isToday = dueBucket === 'today';
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Done tasks show date in muted style
  if (isDone) {
    return <span className="text-sm text-text-muted">{formatDate(date)}</span>;
  }
  
  return (
    <span className={cn(
      "text-sm font-medium",
      // Overdue: danger, clear but not panicked
      isOverdue && "text-danger",
      // Today: warning, noticeable but calm
      isToday && !isOverdue && "text-warning",
      // Future: secondary text
      !isOverdue && !isToday && "text-text-secondary"
    )}>
      {isOverdue ? 'Overdue' : isToday ? 'Today' : formatDate(date)}
    </span>
  );
};

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function WorkManagerTasks({ tasks, onOpenTask }: WorkManagerTasksProps) {
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'key':
        aVal = parseInt(a.key.split('-')[1]) || 0;
        bVal = parseInt(b.key.split('-')[1]) || 0;
        break;
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'team':
        aVal = getTeamById(a.teamId)?.name || '';
        bVal = getTeamById(b.teamId)?.name || '';
        break;
      case 'assignee':
        aVal = getUserById(a.assigneeId)?.name || '';
        bVal = getUserById(b.assigneeId)?.name || '';
        break;
      case 'type':
        aVal = a.type;
        bVal = b.type;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'priority':
        const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        break;
      case 'dueDate':
        aVal = a.dueDate || 'zzz';
        bVal = b.dueDate || 'zzz';
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Column header with sort - using semantic tokens
  const SortableHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(field)}
      className={cn(
        'text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider',
        'text-text-muted',
        'cursor-pointer hover:text-text-secondary transition-colors whitespace-nowrap',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortField === field && (
          sortDirection === 'asc' 
            ? <ChevronUp className="w-3 h-3 text-brand-primary" /> 
            : <ChevronDown className="w-3 h-3 text-brand-primary" />
        )}
      </div>
    </th>
  );

  return (
    <div className={cn(
      "rounded-xl overflow-hidden",
      "border border-border-subtle",
      "bg-surface-0",
      "shadow-sm"
    )}>
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-3 border-b border-border-default">
              <SortableHeader field="key" label="ID" className="w-[100px]" />
              <SortableHeader field="title" label="Title" />
              <SortableHeader field="team" label="Team" className="w-[160px]" />
              <SortableHeader field="assignee" label="Assignee" className="w-[180px]" />
              <SortableHeader field="type" label="Type" className="w-[100px]" />
              <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-muted w-[120px]">
                Linked Item
              </th>
              <SortableHeader field="status" label="Status" className="w-[130px]" />
              <SortableHeader field="priority" label="Priority" className="w-[110px]" />
              <SortableHeader field="dueDate" label="Due Date" className="w-[110px]" />
              <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-muted w-[100px]">
                Blocked
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task, index) => {
              const assignee = getUserById(task.assigneeId);
              const team = getTeamById(task.teamId);
              const isDone = task.status === 'Done';
              const isBlocked = task.blocked;
              
              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className={cn(
                    'group cursor-pointer transition-colors duration-150',
                    // Alternating row backgrounds for scan clarity
                    index % 2 === 0 ? 'bg-surface-0' : 'bg-surface-1',
                    // Hover state - obvious but calm
                    'hover:bg-brand-primary/5',
                    // Blocked row - subtle left accent
                    isBlocked && 'border-l-[3px] border-l-danger',
                    // Done row - resolved styling, NOT disabled
                    isDone && 'bg-surface-2'
                  )}
                >
                  {/* ID Column - brand primary for linkability */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <span className="text-sm font-mono font-medium text-brand-primary">
                      {task.key}
                    </span>
                  </td>
                  
                  {/* Title - DOMINANT element */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <span className={cn(
                      'text-sm font-semibold transition-colors',
                      isDone 
                        ? 'text-text-secondary line-through decoration-text-muted/50' 
                        : 'text-text-primary group-hover:text-brand-primary'
                    )}>
                      {task.title}
                    </span>
                  </td>
                  
                  {/* Team */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <span className="text-sm text-text-secondary">
                      {team?.name || '—'}
                    </span>
                  </td>
                  
                  {/* Assignee */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    {assignee ? (
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                          "bg-surface-3 text-text-secondary",
                          "text-xs font-semibold",
                          "ring-2 ring-surface-0"
                        )}>
                          {assignee.initials || getInitials(assignee.name)}
                        </div>
                        <span className="text-sm text-text-secondary truncate">
                          {assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">Unassigned</span>
                    )}
                  </td>
                  
                  {/* Type */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <span className="text-sm text-text-muted">
                      {task.type || 'Task'}
                    </span>
                  </td>
                  
                  {/* Linked Item */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    {task.linkedItem ? (
                      <span className="text-sm font-mono text-brand-primary hover:underline cursor-pointer">
                        {task.linkedItem.key}
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                  
                  {/* Status - secondary emphasis */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <StatusBadge status={task.status} isDone={isDone} />
                  </td>
                  
                  {/* Priority - contextual, only strong for Critical/High */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  
                  {/* Due Date - calm urgency */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    <DueDateCell 
                      date={task.dueDate} 
                      isOverdue={task.isOverdue} 
                      dueBucket={task.dueBucket}
                      isDone={isDone}
                    />
                  </td>
                  
                  {/* Blocked - isolated strong signal */}
                  <td className="px-4 py-3.5 border-b border-border-subtle">
                    {task.blocked ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-danger" />
                        <span className="text-sm font-semibold text-danger">Blocked</span>
                      </div>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Empty state - executive grade */}
      {sortedTasks.length === 0 && (
        <div className="px-4 py-16">
          <div className="flex flex-col items-center justify-center">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-5",
              "bg-info-bg border border-info-border"
            )}>
              <ListTodo className="w-8 h-8 text-brand-primary" />
            </div>
            
            <h3 className="font-semibold text-text-primary text-lg mb-1.5">
              No tasks yet
            </h3>
            <p className="text-sm text-text-muted text-center max-w-xs mb-6 leading-relaxed">
              Create your first task to start tracking work.
            </p>
            
            <button className={cn(
              "h-11 px-6 flex items-center gap-2.5 rounded-xl",
              "bg-brand-primary hover:bg-brand-primary-hover",
              "text-brand-primary-foreground text-sm font-semibold",
              "shadow-sm hover:shadow-md transition-all duration-200"
            )}>
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkManagerTasks;
