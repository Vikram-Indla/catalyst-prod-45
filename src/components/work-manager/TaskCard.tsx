// src/components/work-manager/TaskCard.tsx
// Premium Enterprise-Grade Kanban Task Card Component

import { 
  Calendar, 
  AlertTriangle, 
  Link2, 
  GripVertical, 
  CheckCircle,
  Folder,
  CheckSquare,
  FileText
} from 'lucide-react';
import { getUserById } from '@/lib/work-manager-data';
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

interface TaskCardProps {
  task: TaskExtended;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const assignee = getUserById(task.assigneeId);
  const isDone = task.status === 'Done';
  const avatarColor = avatarColors[task.assigneeId] || '#5c7c5c';
  
  // Format due date display
  const formatDueDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format completed date
  const formatCompletedDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get priority badge classes
  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'High': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
      case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      case 'Low': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // Get type badge classes and icon
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Project': return { 
        classes: 'bg-[#5c7c5c] text-white', 
        icon: Folder 
      };
      case 'Task': return { 
        classes: 'bg-blue-500 text-white dark:bg-blue-600', 
        icon: CheckSquare 
      };
      case 'General': return { 
        classes: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300', 
        icon: FileText 
      };
      default: return { 
        classes: 'bg-gray-100 text-gray-500', 
        icon: FileText 
      };
    }
  };

  // Get due date chip classes
  const getDueDateClasses = (bucket: string) => {
    switch (bucket) {
      case 'overdue': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      case 'today': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const typeConfig = getTypeConfig(task.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      tabIndex={0}
      role="button"
      className={cn(
        'relative group bg-white dark:bg-gray-800 border rounded-lg p-3 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-[#5c7c5c] hover:-translate-y-0.5',
        'focus:ring-2 focus:ring-[#5c7c5c] focus:outline-none',
        'shadow-sm',
        isDragging && 'shadow-xl cursor-grabbing',
        !isDragging && 'cursor-grab',
        // Blocked styling
        task.blocked && 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
        // Done styling
        isDone && !task.blocked && 'border-l-4 border-l-green-500 opacity-80',
        // Default border
        !task.blocked && !isDone && 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Drag Handle - visible on hover */}
      <div className="absolute top-2 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Done Checkmark */}
      {isDone && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
      )}

      {/* Header: Key + Blocked Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-4">
        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{task.key}</span>
        {task.blocked && (
          <span 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-semibold uppercase rounded"
            title={task.blockedReason || 'Task is blocked'}
          >
            <AlertTriangle className="w-3 h-3" />
            Blocked
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className={cn(
        'text-[13px] font-medium leading-snug mb-2 line-clamp-2 pl-4',
        isDone 
          ? 'text-gray-500 dark:text-gray-400 line-through' 
          : 'text-gray-900 dark:text-gray-100'
      )}>
        {task.title}
      </h4>

      {/* Meta: Type, Priority, Linked Item */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 pl-4">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded', typeConfig.classes)}>
          <TypeIcon className="w-3 h-3" />
          {task.type}
        </span>
        <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded', getPriorityClasses(task.priority))}>
          {task.priority}
        </span>
        {task.linkedItem && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#d4b896]/30 text-[#5c7c5c] dark:text-[#d4b896] text-[11px] font-mono rounded hover:bg-[#d4b896]/50 transition-colors">
            <Link2 className="w-3 h-3" />
            {task.linkedItem.key}
          </span>
        )}
      </div>

      {/* Footer: Due Date/Completed + Recurrence + Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 pl-4">
        <div className="flex items-center gap-2">
          {/* Show completed date for done tasks, otherwise due date */}
          {isDone && task.completedAt ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              Completed {formatCompletedDate(task.completedAt)}
            </span>
          ) : task.dueDate ? (
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded',
              getDueDateClasses(task.dueBucket)
            )}>
              <Calendar className="w-3 h-3" />
              {task.dueBucket === 'overdue' && `${task.daysOverdue}d overdue`}
              {task.dueBucket === 'today' && 'Due today'}
              {(task.dueBucket === 'next7' || task.dueBucket === 'future' || task.dueBucket === 'none') && formatDueDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">No due date</span>
          )}

          {/* Recurrence indicator */}
          {task.recurrence !== 'None' && (
            <span className="text-[10px] text-gray-500" title={`Repeats ${task.recurrence.toLowerCase()}`}>
              ↻ {task.recurrence}
            </span>
          )}
        </div>
        
        {/* Assignee Avatar - Always visible */}
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0 ring-2 ring-white dark:ring-gray-800"
          style={{ backgroundColor: avatarColor }}
          title={assignee?.name || 'Unassigned'}
        >
          {assignee?.initials || '??'}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
