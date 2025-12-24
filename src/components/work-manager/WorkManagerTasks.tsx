// src/components/work-manager/WorkManagerTasks.tsx
// Tasks Table View - Dark Mode Optimized

import { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Link2
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
        'text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 bg-gray-50/80 cursor-pointer hover:text-foreground whitespace-nowrap transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Status dot colors
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-500';
      case 'In Progress': return 'bg-amber-500';
      default: return 'bg-gray-300 dark:bg-gray-600';
    }
  };

  // Priority dot colors
  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-amber-500';
      case 'Low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 shadow-catalyst-sm overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#5c7c5c]/15 dark:bg-[#5c7c5c]/20 border-b border-[#2c2c2c]">
              <SortableHeader field="key" label="ID" className="w-[100px]" />
              <SortableHeader field="title" label="Title" />
              <SortableHeader field="team" label="Team" className="w-[160px]" />
              <SortableHeader field="assignee" label="Assignee" className="w-[180px]" />
              <SortableHeader field="type" label="Type" className="w-[100px]" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 bg-gray-50/80 w-[120px]">
                Linked Item
              </th>
              <SortableHeader field="status" label="Status" className="w-[120px]" />
              <SortableHeader field="priority" label="Priority" className="w-[100px]" />
              <SortableHeader field="dueDate" label="Due Date" className="w-[120px]" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 bg-gray-50/80 w-[80px]">
                Blocked
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const assignee = getUserById(task.assigneeId);
              const team = getTeamById(task.teamId);
              const isDone = task.status === 'Done';
              
              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className={cn(
                    'border-b border-[#242424] hover:bg-[#1c1c1c] transition-smooth cursor-pointer',
                    isDone && 'opacity-50'
                  )}
                >
                  {/* ID Column - mono font, muted */}
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{task.key}</td>
                  
                  {/* Title - muted for done */}
                  <td className={cn(
                    'px-4 py-3 text-[13px] font-medium',
                    isDone ? 'text-muted-foreground line-through decoration-muted-foreground/50' : 'text-foreground'
                  )}>
                    {task.title}
                  </td>
                  
                  {/* Team */}
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{team?.name || '—'}</td>
                  
                  {/* Assignee - monochrome avatar */}
                  <td className="px-4 py-3">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                          {assignee.initials}
                        </div>
                        <span className="text-[13px] text-foreground">{assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Type - plain text only */}
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-muted-foreground">{task.type}</span>
                  </td>
                  
                  {/* Linked Item - muted mono text */}
                  <td className="px-4 py-3">
                    {task.linkedItem ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {task.linkedItem.key}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  
                  {/* Status - tiny dot + gray text */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', getStatusDotColor(task.status))} />
                      <span className="text-[13px] text-gray-600 dark:text-gray-400">{task.status}</span>
                    </div>
                  </td>
                  
                  {/* Priority - dot + gray text */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', getPriorityDotColor(task.priority))} />
                      <span className="text-[12px] text-gray-400">{task.priority}</span>
                    </div>
                  </td>
                  
                  {/* Due Date - conditional color text only */}
                  <td className="px-4 py-3">
                    {task.dueDate ? (
                      <span className={cn(
                        'text-[12px]',
                        task.isOverdue && 'text-red-400',
                        task.dueBucket === 'today' && !task.isOverdue && 'text-amber-400',
                        !task.isOverdue && task.dueBucket !== 'today' && 'text-muted-foreground'
                      )}>
                        {task.isOverdue && `${task.daysOverdue}d overdue`}
                        {task.dueBucket === 'today' && !task.isOverdue && 'Today'}
                        {!task.isOverdue && task.dueBucket !== 'today' && formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Blocked - minimal text */}
                  <td className="px-4 py-3">
                    {task.blocked ? (
                      <span className="text-red-500 text-[11px] font-medium">Yes</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Empty state */}
      {sortedTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No tasks found matching your filters.
        </div>
      )}
    </div>
  );
}

export default WorkManagerTasks;
