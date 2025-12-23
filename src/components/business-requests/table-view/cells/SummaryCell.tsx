import { formatDistanceToNow } from 'date-fns';

interface SummaryCellProps {
  title: string;
  department?: string | null;
  createdAt?: string | null;
}

export function SummaryCell({ title, department, createdAt }: SummaryCellProps) {
  let timeAgo = '';
  if (createdAt) {
    try {
      timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: false });
      timeAgo = `Created ${timeAgo} ago`;
    } catch {
      timeAgo = '';
    }
  }

  const subtitle = [department, timeAgo].filter(Boolean).join(' • ');

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[14px] font-medium text-[var(--industry-text-primary)] hover:text-[var(--brand-gold)] transition-colors truncate">
        {title || '—'}
      </span>
      {subtitle && (
        <span className="text-[12px] text-[var(--industry-text-muted)] truncate">
          {subtitle}
        </span>
      )}
    </div>
  );
}
