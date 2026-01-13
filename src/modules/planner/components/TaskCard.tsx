// ============================================================
// TASK CARD COMPONENT
// Enhanced card showing assignee name, reporter, progress, due dates
// ============================================================

import { useMemo } from 'react';
import { Lock, User, FileText, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '../types';
import { PRIORITY_CONFIG } from '../types';
import { motion } from 'framer-motion';
import { differenceInDays, format, isAfter, isBefore, isToday, startOfDay } from 'date-fns';

interface TaskCardProps {
  task: PlannerTask;
  onClick: () => void;
  isDragging?: boolean;
  className?: string;
}

export function TaskCard({ task, onClick, isDragging = false, className }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  
  // Calculate due date urgency
  const dueBadge = useMemo(() => {
    if (!task.dueDate || task.status === 'done') return null;
    
    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(task.dueDate));
    const daysUntilDue = differenceInDays(dueDate, today);
    
    if (daysUntilDue < 0) {
      return { label: `${Math.abs(daysUntilDue)}d overdue`, variant: 'danger' as const };
    } else if (daysUntilDue === 0) {
      return { label: 'Due today', variant: 'warning' as const };
    } else if (daysUntilDue <= 2) {
      return { label: `${daysUntilDue}d left`, variant: 'warning' as const };
    } else if (daysUntilDue <= 7) {
      return { label: `${daysUntilDue}d left`, variant: 'info' as const };
    }
    return null;
  }, [task.dueDate, task.status]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-lg border shadow-sm cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        task.blocked && "border-l-4 border-l-destructive",
        isDragging && "opacity-50 shadow-lg rotate-2",
        className
      )}
    >
      {/* Header: ID + Blocked + Priority */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {task.key}
        </span>
        <div className="flex items-center gap-2">
          {task.blocked && (
            <div className="flex items-center gap-1 text-destructive" title={task.blockedReason || 'Blocked'}>
              <Lock className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: priorityConfig.color }}
            />
            <span className="text-[10px] font-medium" style={{ color: priorityConfig.color }}>
              {priorityConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="px-3 pb-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">
          {task.title}
        </h4>
      </div>

      {/* Progress Bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progress</span>
          <span className="font-medium">{task.progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${task.progress}%`, 
              backgroundColor: task.progress === 100 ? '#10b981' : priorityConfig.color 
            }}
          />
        </div>
      </div>

      {/* Assignee & Reporter */}
      <div className="px-3 pb-2 space-y-1 border-t border-border pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <span>Assigned:</span>
          <span className="font-medium text-foreground truncate">
            {task.assigneeName || 'Unassigned'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span>Reporter:</span>
          <span className="font-medium text-foreground truncate">
            {task.reporterName || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Footer: Dates + Due Badge */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDate(task.startDate)} - {formatDate(task.dueDate)}
          </span>
        </div>
        {dueBadge && (
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            dueBadge.variant === 'danger' && "bg-destructive/10 text-destructive",
            dueBadge.variant === 'warning' && "bg-orange-100 text-orange-700",
            dueBadge.variant === 'info' && "bg-blue-100 text-blue-700"
          )}>
            ⚠️ {dueBadge.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}
