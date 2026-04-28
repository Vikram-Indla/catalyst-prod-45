import { format, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks } from 'date-fns';
import { Tooltip } from '@/components/ads';

interface RelativeDateProps {
  date: string | null;
  isOverdue?: boolean;
  showTooltip?: boolean;
}

function formatRelative(date: Date): string {
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return 'now';
  const hrs = differenceInHours(now, date);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d ago`;
  const weeks = differenceInWeeks(now, date);
  if (weeks < 4) return `${weeks}w ago`;
  return format(date, 'MMM dd, yyyy');
}

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 6V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7" cy="10.25" r="0.75" fill="currentColor" />
  </svg>
);

export function RelativeDate({ date, isOverdue = false, showTooltip = true }: RelativeDateProps) {
  if (!date) return <span className="text-zinc-400">—</span>;

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span className="text-zinc-400">—</span>;

  const relative = formatRelative(parsed);
  const absolute = format(parsed, "MMM dd, yyyy 'at' h:mm a");

  const el = (
    <span className={`inline-flex items-center gap-1 text-[12px] whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-zinc-500'}`}>
      {isOverdue && <WarningIcon />}
      {relative}
    </span>
  );

  if (!showTooltip) return el;

  return (
    <Tooltip content={absolute} delay={500}>
      <span>{el}</span>
    </Tooltip>
  );
}
