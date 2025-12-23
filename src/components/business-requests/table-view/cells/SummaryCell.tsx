interface SummaryCellProps {
  title: string;
}

export function SummaryCell({ title }: SummaryCellProps) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <span 
        className="text-[14px] font-medium text-[var(--industry-text-primary)] truncate block"
        title={title || '—'}
      >
        {title || '—'}
      </span>
    </div>
  );
}
