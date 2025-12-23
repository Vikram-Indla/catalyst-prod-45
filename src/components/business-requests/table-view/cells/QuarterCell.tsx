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
 * Quarter badge styling using ONLY Catalyst brand colors
 * Brand palette: olive (#5c7c5c), bronze (#8b7355), gold (#c69c6d), champagne (#d4b896)
 */
export function QuarterCell({ quarter, isCurrentQuarter }: QuarterCellProps) {
  if (!quarter) {
    return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
  }

  const isCurrent = isCurrentQuarter ?? checkIsCurrentQuarter(quarter);

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
        isCurrent 
          ? cn(
              // Current quarter - gold highlight
              "bg-[#c69c6d]/15 text-[#8b7355] border-[#c69c6d]/40",
              "dark:bg-[#c69c6d]/25 dark:text-[#d4b896] dark:border-[#c69c6d]/50"
            )
          : cn(
              // Regular quarter - olive tint
              "bg-[#5c7c5c]/10 text-[#5c7c5c] border-[#5c7c5c]/30",
              "dark:bg-[#5c7c5c]/20 dark:text-[#6b8b6b] dark:border-[#5c7c5c]/40"
            )
      )}
    >
      {formatQuarter(quarter)}
    </span>
  );
}
