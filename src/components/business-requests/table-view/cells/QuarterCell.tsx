import { cn } from '@/lib/utils';

interface QuarterCellProps {
  quarter: string | null;
  isCurrentQuarter?: boolean;
}

/**
 * Normalizes quarter format to "Q1 2025" style
 * Handles formats like "Q2-2026", "q1_2025", "Q1 2025"
 */
function formatQuarter(quarter: string): string {
  let normalized = quarter.toUpperCase().replace(/[-_]/g, ' ').trim();
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

/**
 * Checks if a quarter is the current quarter
 */
function checkIsCurrentQuarter(quarter: string): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQ = Math.ceil(currentMonth / 3);
  const currentQStr = `Q${currentQ} ${currentYear}`;
  
  const formatted = formatQuarter(quarter);
  return formatted === currentQStr;
}

export function QuarterCell({ quarter, isCurrentQuarter }: QuarterCellProps) {
  if (!quarter) {
    return <span className="text-[var(--industry-text-disabled)]">—</span>;
  }

  const isCurrent = isCurrentQuarter ?? checkIsCurrentQuarter(quarter);

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium",
        isCurrent 
          ? "bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/30" 
          : "bg-muted text-muted-foreground"
      )}
    >
      {formatQuarter(quarter)}
    </span>
  );
}
