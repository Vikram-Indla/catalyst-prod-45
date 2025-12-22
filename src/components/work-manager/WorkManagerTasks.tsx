// src/components/work-manager/WorkManagerTasks.tsx
// Tasks Table View

import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle, Link2 } from 'lucide-react';
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
        'text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-muted cursor-pointer hover:text-text-primary whitespace-nowrap',
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

  // Badge classes
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-status-success-bg text-status-success';
      case 'In Progress': return 'bg-status-warning-bg text-status-warning';
      case 'Planned': return 'bg-status-info-bg text-status-info';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-status-danger-bg text-status-danger';
      case 'High': return 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400';
      case 'Medium': return 'bg-status-warning-bg text-status-warning';
      case 'Low': return 'bg-surface-muted text-text-muted';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  const getTypeClasses = (type: string) => {
    switch (type) {
      case 'Project': return 'bg-brand-primary text-white';
      case 'Task': return 'bg-status-info-bg text-status-info';
      case 'General': return 'bg-surface-muted text-text-secondary';
      default: return 'bg-surface-muted text-text-secondary';
    }
  };

  return (
    <div className="bg-surface-card border border-border-default rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              <SortableHeader field="key" label="ID" className="w-[100px]" />
              <SortableHeader field="title" label="Title" />
              <SortableHeader field="team" label="Team" className="w-[160px]" />
              <SortableHeader field="assignee" label="Assignee" className="w-[160px]" />
              <SortableHeader field="type" label="Type" className="w-[100px]" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-muted w-[120px]">
                Linked Item
              </th>
              <SortableHeader field="status" label="Status" className="w-[120px]" />
              <SortableHeader field="priority" label="Priority" className="w-[100px]" />
              <SortableHeader field="dueDate" label="Due Date" className="w-[120px]" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-muted w-[80px]">
                Blocked
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const assignee = getUserById(task.assigneeId);
              const team = getTeamById(task.teamId);
              
              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className="border-b border-border-subtle hover:bg-surface-muted cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-text-muted">{task.key}</td>
                  <td className="px-4 py-3 text-[13px] text-text-primary font-medium">{task.title}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{team?.name || '—'}</td>
                  <td className="px-4 py-3">
                    {assignee && (
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white',
                          assignee.avatarColor || 'bg-brand-primary'
                        )}>
                          {assignee.initials}
                        </div>
                        <span className="text-[13px] text-text-secondary">{assignee.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getTypeClasses(task.type))}>
                      {task.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.linkedItem ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-highlight/30 text-text-primary text-[11px] font-mono rounded dark:bg-brand-highlight/20 dark:text-brand-highlight">
                        <Link2 className="w-3 h-3" />
                        {task.linkedItem.key}
                      </span>
                    ) : (
                      <span className="text-[12px] text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getStatusClasses(task.status))}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getPriorityClasses(task.priority))}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.dueDate ? (
                      <span className={cn(
                        'text-[12px]',
                        task.isOverdue && 'text-status-danger font-medium',
                        task.dueBucket === 'today' && 'text-status-warning font-medium'
                      )}>
                        {task.isOverdue && `${task.daysOverdue}d overdue`}
                        {task.dueBucket === 'today' && 'Today'}
                        {!task.isOverdue && task.dueBucket !== 'today' && formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.blocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-status-danger-bg text-status-danger text-[10px] font-semibold uppercase rounded">
                        <AlertTriangle className="w-3 h-3" />
                        Yes
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Empty state */}
      {sortedTasks.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No tasks found matching your filters.
        </div>
      )}
    </div>
  );
}

export default WorkManagerTasks;