import { cn } from '@/lib/utils';

interface QuarterCellProps {
  quarter: string | null;
  isCurrentQuarter?: boolean;
}

/**
 * Normalizes quarter format to "Q1 2025" style
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

/**
 * Quarter badge styling using Blue + Teal Catalyst palette
 */
export function QuarterCell({ quarter, isCurrentQuarter }: QuarterCellProps) {
  if (!quarter) {
    return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
  }

  const isCurrent = isCurrentQuarter ?? checkIsCurrentQuarter(quarter);

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        isCurrent 
          ? cn(
              // Current quarter - blue highlight
              "bg-[rgba(37,99,235,0.1)] text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] border-[rgba(37,99,235,0.3)]",
              "dark:bg-[rgba(37,99,235,0.15)] dark:text-[var(--ds-text-brand,var(--ds-text-brand, #60a5fa))] dark:border-[rgba(37,99,235,0.4)]"
            )
          : cn(
              // Regular quarter - gray tint
              "bg-[rgba(107,114,128,0.1)] text-[#6b7280] border-[rgba(107,114,128,0.3)]",
              "dark:bg-[rgba(107,114,128,0.15)] dark:text-[#9ca3af] dark:border-[rgba(107,114,128,0.4)]"
            )
      )}
    >
      {formatQuarter(quarter)}
    </span>
  );
}