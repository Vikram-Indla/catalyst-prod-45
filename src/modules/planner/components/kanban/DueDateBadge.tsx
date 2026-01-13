// ============================================================
// DUE DATE BADGE COMPONENT
// Shows due date with contextual status (overdue, soon, etc.)
// ============================================================

import { Calendar, Clock, Check } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '../../types/kanban';

interface DueDateBadgeProps {
  dueDate: string | null;
  isCompleted?: boolean;
  className?: string;
}

export function DueDateBadge({ dueDate, isCompleted, className }: DueDateBadgeProps) {
  if (!dueDate) return null;
  
  const date = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  const isOverdue = isPast(date) && !isToday(date) && !isCompleted;
  const isDueSoon = isTomorrow(date) || isToday(date);
  
  const getDisplayText = () => {
    if (isCompleted) {
      return format(date, 'MMM d');
    }
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isOverdue) {
      const daysOverdue = Math.abs(differenceInDays(today, date));
      return `${daysOverdue}d overdue`;
    }
    return format(date, 'MMM d');
  };
  
  const getStyles = () => {
    if (isCompleted) {
      return { bg: CATALYST_COLORS.successLight, text: CATALYST_COLORS.success };
    }
    if (isOverdue) {
      return { bg: CATALYST_COLORS.dangerLight, text: CATALYST_COLORS.danger };
    }
    if (isDueSoon) {
      return { bg: CATALYST_COLORS.warningLight, text: CATALYST_COLORS.warning };
    }
    return { bg: CATALYST_COLORS.gray50, text: CATALYST_COLORS.gray500 };
  };
  
  const styles = getStyles();
  
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded',
        className
      )}
      style={{ backgroundColor: styles.bg, color: styles.text }}
    >
      {isCompleted ? (
        <Check className="w-3 h-3" />
      ) : isOverdue || isDueSoon ? (
        <Clock className="w-3 h-3" />
      ) : (
        <Calendar className="w-3 h-3" />
      )}
      {getDisplayText()}
    </div>
  );
}
