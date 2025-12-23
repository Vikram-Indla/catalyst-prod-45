import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateCellProps {
  date: string | null | undefined;
  showRelative?: boolean;
}

export function DateCell({ date, showRelative = true }: DateCellProps) {
  if (!date) {
    return <span className="text-[var(--industry-text-disabled)]">—</span>;
  }
  
  try {
    const dateObj = new Date(date);
    const now = new Date();
    const daysUntil = differenceInDays(dateObj, now);
    
    const absoluteDate = format(dateObj, 'MMM d, yyyy');
    
    if (!showRelative) {
      return <span className="text-sm text-foreground">{absoluteDate}</span>;
    }
    
    let relativeText = '';
    let colorClass = 'text-foreground';
    
    if (isPast(dateObj) && daysUntil < 0) {
      relativeText = 'Overdue';
      colorClass = 'text-[var(--industry-status-blocked)]';
    } else if (daysUntil === 0) {
      relativeText = 'Today';
      colorClass = 'text-[var(--industry-status-blocked)]';
    } else if (daysUntil === 1) {
      relativeText = 'Tomorrow';
      colorClass = 'text-amber-600 dark:text-amber-400';
    } else if (daysUntil <= 14) {
      relativeText = `In ${daysUntil} days`;
      colorClass = 'text-amber-600 dark:text-amber-400';
    } else if (daysUntil <= 30) {
      relativeText = `In ${Math.ceil(daysUntil / 7)} weeks`;
      colorClass = 'text-foreground';
    } else if (daysUntil <= 365) {
      const months = Math.ceil(daysUntil / 30);
      relativeText = months === 1 ? 'In 1 month' : `In ${months} months`;
      colorClass = 'text-foreground';
    } else {
      relativeText = 'Over a year';
      colorClass = 'text-foreground';
    }
    
    return (
      <div className="flex flex-col">
        <span className={cn("text-[13px] font-medium", colorClass)}>
          {relativeText}
        </span>
        <span className="text-[11px] text-[var(--industry-text-disabled)]">
          {absoluteDate}
        </span>
      </div>
    );
  } catch {
    return <span className="text-[var(--industry-text-disabled)]">—</span>;
  }
}
