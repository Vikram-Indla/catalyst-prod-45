// src/components/work-manager/WorkManagerTasks.tsx
// Tasks Table View - Enterprise Grade

import { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Link2, 
  Folder, 
  CheckSquare, 
  FileText 
} from 'lucide-react';
import { getUserById, getTeamById } from '@/lib/work-manager-data';
import type { TaskExtended } from './types';
import { cn } from '@/lib/utils';

// Avatar color mapping for consistent colors
const avatarColors: Record<string, string> = {
  'u1': '#5c7c5c', // Sarah Ahmed - olive
  'u2': '#8b7355', // Mohammed Al-Rashid - bronze
  'u3': '#c69c6d', // Layla Hassan - gold
  'u4': '#2563eb', // Omar Khalid - blue
  'u5': '#16a34a', // Fatima Al-Saud - green
  'u6': '#ea580c', // Ahmed Mansour - orange
  'u7': '#dc2626', // Nadia Qureshi - red
  'u8': '#ca8a04', // Khalid Ibrahim - amber
};

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
        'text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 cursor-pointer hover:text-foreground whitespace-nowrap transition-colors',
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

  // Status badge classes with full coverage
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'In Progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      case 'Planned': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'Waiting': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400';
      case 'Backlog': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Priority badge classes
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'High': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400';
      case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      case 'Low': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Type badge config with icons
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Project': return { 
        classes: 'bg-[#5c7c5c] text-white', 
        Icon: Folder 
      };
      case 'Task': return { 
        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', 
        Icon: CheckSquare 
      };
      case 'General': return { 
        classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', 
        Icon: FileText 
      };
      default: return { 
        classes: 'bg-gray-100 text-gray-500', 
        Icon: FileText 
      };
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <SortableHeader field="key" label="ID" className="w-[100px]" />
              <SortableHeader field="title" label="Title" />
              <SortableHeader field="team" label="Team" className="w-[160px]" />
              <SortableHeader field="assignee" label="Assignee" className="w-[180px]" />
              <SortableHeader field="type" label="Type" className="w-[110px]" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 w-[120px]">
                Linked Item
              </th>
              <SortableHeader field="status" label="Status" className="w-[120px]" />
              <SortableHeader field="priority" label="Priority" className="w-[100px]" />
              <SortableHeader field="dueDate" label="Due Date" className="w-[120px]" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 w-[80px]">
                Blocked
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const assignee = getUserById(task.assigneeId);
              const team = getTeamById(task.teamId);
              const typeConfig = getTypeConfig(task.type);
              const TypeIcon = typeConfig.Icon;
              const isDone = task.status === 'Done';
              const avatarColor = avatarColors[task.assigneeId] || '#5c7c5c';
              
              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className={cn(
                    'border-b border-border hover:bg-muted/50 cursor-pointer transition-colors',
                    isDone && 'opacity-60',
                    task.blocked && !isDone && 'bg-red-50/50 dark:bg-red-950/20'
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
                  
                  {/* Assignee with avatar */}
                  <td className="px-4 py-3">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {assignee.initials}
                        </div>
                        <span className="text-[13px] text-foreground">{assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Type badge with icon */}
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded', typeConfig.classes)}>
                      <TypeIcon className="w-3 h-3" />
                      {task.type}
                    </span>
                  </td>
                  
                  {/* Linked Item - clickable styling */}
                  <td className="px-4 py-3">
                    {task.linkedItem ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded font-mono text-[11px] hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors">
                        <Link2 className="w-3 h-3" />
                        {task.linkedItem.key}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getStatusClasses(task.status))}>
                      {task.status}
                    </span>
                  </td>
                  
                  {/* Priority badge */}
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getPriorityClasses(task.priority))}>
                      {task.priority}
                    </span>
                  </td>
                  
                  {/* Due Date */}
                  <td className="px-4 py-3">
                    {task.dueDate ? (
                      <span className={cn(
                        'text-[12px]',
                        task.isOverdue && 'text-red-600 dark:text-red-400 font-medium',
                        task.dueBucket === 'today' && 'text-amber-600 dark:text-amber-400 font-medium'
                      )}>
                        {task.isOverdue && `${task.daysOverdue}d overdue`}
                        {task.dueBucket === 'today' && 'Today'}
                        {!task.isOverdue && task.dueBucket !== 'today' && formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </td>
                  
                  {/* Blocked indicator */}
                  <td className="px-4 py-3">
                    {task.blocked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-semibold uppercase rounded">
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
        <div className="text-center py-12 text-muted-foreground">
          No tasks found matching your filters.
        </div>
      )}
    </div>
  );
}

export default WorkManagerTasks;
