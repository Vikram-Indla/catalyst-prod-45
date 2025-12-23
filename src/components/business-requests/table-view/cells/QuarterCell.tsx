import { Badge } from '@/components/ui/badge';

interface QuarterCellProps {
  quarter: string | null;
}

/**
 * Normalizes quarter format to "Q1 2025" style
 * Handles formats like "Q2-2026", "q1_2025", "Q1 2025"
 */
function formatQuarter(quarter: string): string {
  // Normalize: uppercase, replace separators with space
  let normalized = quarter.toUpperCase().replace(/[-_]/g, ' ').trim();
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

export function QuarterCell({ quarter }: QuarterCellProps) {
  if (!quarter) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Badge 
      variant="outline" 
      className="text-[10px] px-1.5 py-0 h-5 border-[hsl(var(--brand-primary))]/50 text-[hsl(var(--brand-primary))] font-medium"
    >
      {formatQuarter(quarter)}
    </Badge>
  );
}