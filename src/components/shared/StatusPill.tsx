/**
 * StatusPill - Canonical neutral status display component
 * 
 * HARD RULE: Status must be neutral (no color) across the entire app.
 * - No colored text
 * - No colored background  
 * - No colored border
 * - No per-status theming
 * 
 * This component renders ALL status values with the same neutral styling.
 */

import { cn } from '@/lib/utils';

interface StatusPillProps {
  /** The status value to display */
  value: string | null | undefined;
  /** Optional custom label (if not provided, value will be formatted) */
  label?: string;
  /** Optional additional className */
  className?: string;
}

/**
 * Formats a status value into a human-readable label
 * e.g., "new_request" -> "New request"
 */
const formatStatusLabel = (value: string): string => {
  return value
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
};

export function StatusPill({ value, label, className }: StatusPillProps) {
  if (!value && !label) {
    return <span className="text-muted-foreground">—</span>;
  }

  const displayLabel = label || formatStatusLabel(value || '');

  return (
    <span
      className={cn(
        // Neutral styling - enforced globally
        "catalyst-status",
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded",
        "bg-muted/50 text-foreground border border-border",
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

export default StatusPill;
