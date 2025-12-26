/**
 * EpicStatusBadge - Renders epic status with label and color from database config
 * Uses the epic_statuses table configured in admin panel
 */

import { useActiveEpicStatuses, EpicStatus } from '@/hooks/useEpicStatuses';
import { getBrandColorHex } from '@/components/admin/BrandColorPicker';
import { cn } from '@/lib/utils';

// Get styles from a color value
function getStatusStyles(colorValue: string | null | undefined) {
  const hex = getBrandColorHex(colorValue);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    text: hex,
    dot: hex,
    border: `rgba(${r}, ${g}, ${b}, 0.25)`,
  };
}

// Get status config from list
function getStatusConfigFromList(
  value: string | null | undefined, 
  statuses: EpicStatus[]
): { label: string; color: string | null } {
  if (!value) {
    const firstStatus = statuses[0];
    return firstStatus 
      ? { label: firstStatus.label, color: firstStatus.color }
      : { label: 'Unknown', color: 'neutral' };
  }
  
  const normalized = value.toLowerCase();
  const status = statuses.find(s => s.value.toLowerCase() === normalized);
  
  if (status) {
    return { label: status.label, color: status.color };
  }
  
  // Fallback for unknown values
  return { 
    label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), 
    color: 'neutral' 
  };
}

interface EpicStatusBadgeProps {
  status: string | null | undefined;
  /** Show the colored dot indicator */
  showDot?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

export function EpicStatusBadge({ 
  status, 
  showDot = true,
  size = 'sm',
  className,
}: EpicStatusBadgeProps) {
  const { data: statuses = [] } = useActiveEpicStatuses();
  const config = getStatusConfigFromList(status, statuses);
  const styles = getStatusStyles(config.color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide",
        size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        className
      )}
      style={{
        background: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
      }}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full",
            size === 'sm' ? "w-1 h-1" : "w-1.5 h-1.5"
          )}
          style={{ background: styles.dot }}
        />
      )}
      {config.label}
    </span>
  );
}

// Export a simple text-only version for tooltips/inline text
export function useEpicStatusLabel(status: string | null | undefined): string {
  const { data: statuses = [] } = useActiveEpicStatuses();
  return getStatusConfigFromList(status, statuses).label;
}
