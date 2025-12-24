// src/components/work-manager/WorkManagerTasks.tsx
// Tasks Table View - 9.5 Executive Grade

import { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertCircle,
  ListTodo,
  Plus
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

// Status configuration
const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  'Backlog': {
    label: 'Backlog',
    dot: 'bg-gray-400 dark:bg-gray-500',
    text: 'text-gray-600 dark:text-gray-400',
  },
  'To Do': {
    label: 'To Do',
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  'In Progress': {
    label: 'In Progress',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  'In Review': {
    label: 'In Review',
    dot: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
  'Done': {
    label: 'Done',
    dot: 'bg-[#5c7c5c]',
    text: 'text-[#5c7c5c] dark:text-[#7a9a7a]',
  },
};

// Priority configuration
const priorityConfig: Record<string, { label: string; dot: string; text: string }> = {
  'critical': {
    label: 'Critical',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
  },
  'high': {
    label: 'High',
    dot: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
  'medium': {
    label: 'Medium',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  'low': {
    label: 'Low',
    dot: 'bg-[#5c7c5c]',
    text: 'text-[#5c7c5c] dark:text-[#7a9a7a]',
  },
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || statusConfig['Backlog'];
  
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full", config.dot)} />
      <span className={cn("text-sm font-medium", config.text)}>
        {config.label}
      </span>
    </div>
  );
};

// Priority Badge Component
const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig['medium'];
  
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full", config.dot)} />
      <span className={cn("text-sm font-medium", config.text)}>
        {config.label}
      </span>
    </div>
  );
};

// Due Date Cell Component
const DueDateCell = ({ date, isOverdue, dueBucket }: { date: string | null; isOverdue?: boolean; dueBucket?: string }) => {
  if (!date) {
    return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;
  }
  
  const isToday = dueBucket === 'today';
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <span className={cn(
      "text-sm font-medium",
      isOverdue && "text-red-600 dark:text-red-400",
      isToday && !isOverdue && "text-[#c69c6d] dark:text-[#d4a855]",
      !isOverdue && !isToday && "text-gray-600 dark:text-gray-400"
    )}>
      {isToday && !isOverdue ? 'Today' : formatDate(date)}
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
        aVal = parseInt(a.key.split('-')[1]);
        bVal = parseInt(b.key.split('-')[1]);
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
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder];
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder];
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

  // Column header with sort
  const SortableHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(field)}
      className={cn(
        'text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
        'text-gray-500 dark:text-gray-400',
        'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortField === field && (
          sortDirection === 'asc' 
            ? <ChevronUp className="w-3 h-3 text-[#c69c6d] dark:text-[#d4a855]" /> 
            : <ChevronDown className="w-3 h-3 text-[#c69c6d] dark:text-[#d4a855]" />
        )}
      </div>
    </th>
  );

  return (
    <div className={cn(
      "rounded-xl overflow-hidden",
      "border border-gray-200 dark:border-[#2c2c2c]",
      "bg-white dark:bg-[#141414]",
      "shadow-catalyst-sm"
    )}>
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className={cn(
              "bg-gray-50/80 dark:bg-[#5c7c5c]/12",
              "border-b border-gray-200 dark:border-[#2c2c2c]"
            )}>
              <SortableHeader field="key" label="ID" className="w-[100px]" />
              <SortableHeader field="title" label="Title" />
              <SortableHeader field="team" label="Team" className="w-[160px]" />
              <SortableHeader field="assignee" label="Assignee" className="w-[180px]" />
              <SortableHeader field="type" label="Type" className="w-[100px]" />
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 w-[120px]">
                Linked Item
              </th>
              <SortableHeader field="status" label="Status" className="w-[120px]" />
              <SortableHeader field="priority" label="Priority" className="w-[110px]" />
              <SortableHeader field="dueDate" label="Due Date" className="w-[110px]" />
              <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 w-[100px]">
                Blocked
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#242424]">
            {sortedTasks.map((task) => {
              const assignee = getUserById(task.assigneeId);
              const team = getTeamById(task.teamId);
              const isDone = task.status === 'Done';
              
              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className={cn(
                    'group cursor-pointer',
                    'hover:bg-gray-50/80 dark:hover:bg-[#1c1c1c]',
                    'transition-all duration-150',
                    isDone && 'opacity-50'
                  )}
                >
                  {/* ID Column - mono font, bronze/gold */}
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] font-mono font-medium text-[#8b7355] dark:text-[#d4a855]">
                      {task.key}
                    </span>
                  </td>
                  
                  {/* Title - with hover color change */}
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      'text-sm font-medium transition-colors',
                      isDone 
                        ? 'text-muted-foreground line-through decoration-muted-foreground/50' 
                        : 'text-gray-900 dark:text-white group-hover:text-[#5c7c5c] dark:group-hover:text-[#7a9a7a]'
                    )}>
                      {task.title}
                    </span>
                  </td>
                  
                  {/* Team */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {team?.name || '—'}
                    </span>
                  </td>
                  
                  {/* Assignee - styled avatar with ring */}
                  <td className="px-4 py-3.5">
                    {assignee ? (
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                          "bg-gradient-to-br from-[#5c7c5c] to-[#4a6a4a]",
                          "text-white text-[10px] font-bold",
                          "shadow-sm avatar-ring"
                        )}>
                          {assignee.initials || getInitials(assignee.name)}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">Unassigned</span>
                    )}
                  </td>
                  
                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {task.type || 'Task'}
                    </span>
                  </td>
                  
                  {/* Linked Item - mono text */}
                  <td className="px-4 py-3.5">
                    {task.linkedItem ? (
                      <span className="text-[13px] font-mono text-[#c69c6d] dark:text-[#d4a855] hover:underline cursor-pointer">
                        {task.linkedItem.key}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={task.status} />
                  </td>
                  
                  {/* Priority */}
                  <td className="px-4 py-3.5">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  
                  {/* Due Date */}
                  <td className="px-4 py-3.5">
                    <DueDateCell 
                      date={task.dueDate} 
                      isOverdue={task.isOverdue} 
                      dueBucket={task.dueBucket} 
                    />
                  </td>
                  
                  {/* Blocked */}
                  <td className="px-4 py-3.5">
                    {task.blocked ? (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">Yes</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Empty state - 9.5 executive grade */}
      {sortedTasks.length === 0 && (
        <div className="px-4 py-16">
          <div className="flex flex-col items-center justify-center">
            {/* Branded icon container */}
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-5",
              "bg-gradient-to-br from-[#d4b896]/30 to-[#d4b896]/10",
              "dark:from-[#c69c6d]/15 dark:to-[#c69c6d]/5",
              "border border-[#d4b896]/30 dark:border-[#c69c6d]/20",
              "shadow-catalyst-xs"
            )}>
              <ListTodo className="w-8 h-8 text-[#8b7355] dark:text-[#d4a855]" />
            </div>
            
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1.5">
              No tasks yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-6 leading-relaxed">
              Create your first task to start tracking work.
            </p>
            
            <button className={cn(
              "h-11 px-6 flex items-center gap-2.5 rounded-xl",
              "bg-gradient-to-r from-[#5c7c5c] to-[#4a6a4a]",
              "hover:from-[#4a6a4a] hover:to-[#3d5a3d]",
              "text-white text-sm font-semibold",
              "shadow-catalyst-md transition-smooth press-scale"
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