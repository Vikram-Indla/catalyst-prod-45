/**
 * =============================================================================
 * GenericStatusBadge - Universal Status Badge Component
 * =============================================================================
 * 
 * A centralized, brand-aligned status badge that uses Catalyst design tokens.
 * This component serves as the single source of truth for status visualization
 * across the entire application.
 * 
 * USAGE:
 * - Import and use for ANY status field (process steps, health, workflow, etc.)
 * - Automatically applies brand colors based on status category
 * - Supports admin-configurable statuses via props
 * 
 * BRAND COLORS (Catalyst Palette):
 * - Olive #5c7c5c: Success states (done, complete, active)
 * - Gold #c69c6d: Warning/attention states (at risk, pending)
 * - Bronze #8b7355: Critical/blocked states (off track, blocked)
 * - Grey #c8ccd0: Neutral states (draft, backlog)
 * - Champagne #d4b896: Highlight states
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Status category types
type StatusCategory = 
  | 'success' 
  | 'warning' 
  | 'critical' 
  | 'neutral' 
  | 'info' 
  | 'progress';

// Brand-aligned color configuration
const CATEGORY_STYLES: Record<StatusCategory, { bg: string; text: string; border: string; dot: string }> = {
  success: {
    bg: 'rgba(92, 124, 92, 0.12)',    // Olive 12%
    text: '#5c7c5c',                   // Olive
    border: 'transparent',
    dot: '#5c7c5c',
  },
  warning: {
    bg: 'rgba(198, 156, 109, 0.12)',  // Gold 12%
    text: '#c69c6d',                   // Gold
    border: 'transparent',
    dot: '#c69c6d',
  },
  critical: {
    bg: 'rgba(139, 115, 85, 0.12)',   // Bronze 12%
    text: '#8b7355',                   // Bronze
    border: 'transparent',
    dot: '#8b7355',
  },
  neutral: {
    bg: 'rgba(200, 204, 208, 0.2)',   // Grey 20%
    text: '#6b7280',
    border: 'transparent',
    dot: '#c8ccd0',
  },
  info: {
    bg: 'rgba(200, 204, 208, 0.15)',
    text: '#6b7280',
    border: 'transparent',
    dot: '#a1a1aa',
  },
  progress: {
    bg: 'rgba(92, 124, 92, 0.08)',    // Olive 8% (lighter)
    text: '#5c7c5c',
    border: '#5c7c5c',
    dot: '#5c7c5c',
  },
};

// Default status-to-category mappings (can be overridden via props)
const DEFAULT_STATUS_CATEGORY: Record<string, StatusCategory> = {
  // Success states
  'done': 'success',
  'complete': 'success',
  'completed': 'success',
  'resolved': 'success',
  'closed': 'success',
  'live': 'success',
  'released': 'success',
  'approved': 'success',
  'on_track': 'success',
  'green': 'success',
  
  // Progress states
  'active': 'progress',
  'in_progress': 'progress',
  'in progress': 'progress',
  'implementing': 'progress',
  'implement': 'progress',
  'open': 'progress',
  
  // Warning states
  'at_risk': 'warning',
  'at risk': 'warning',
  'yellow': 'warning',
  'amber': 'warning',
  'pending': 'warning',
  'review': 'warning',
  'in_review': 'warning',
  'analyse': 'warning',
  'triage': 'warning',
  'deferred': 'warning',
  
  // Critical states
  'blocked': 'critical',
  'off_track': 'critical',
  'off track': 'critical',
  'red': 'critical',
  'rejected': 'critical',
  'failed': 'critical',
  'overdue': 'critical',
  'breached': 'critical',
  'on_hold': 'critical',
  
  // Neutral states
  'draft': 'neutral',
  'backlog': 'neutral',
  'new': 'neutral',
  'new_request': 'neutral',
  'new_demand': 'neutral',
  'proposed': 'neutral',
  'not_started': 'neutral',
  'not started': 'neutral',
  'to_do': 'neutral',
  'todo': 'neutral',
  'converted': 'neutral',
  
  // Info states
  'ready': 'info',
  'ready_to_implement': 'info',
  'to_committee': 'info',
};

export interface GenericStatusBadgeProps {
  /** The status value to display */
  status: string | null | undefined;
  /** Optional custom label (defaults to formatted status) */
  label?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Show colored dot indicator */
  showDot?: boolean;
  /** Override the automatic category detection */
  category?: StatusCategory;
  /** Custom color configuration (overrides category) */
  customColor?: { bg: string; text: string; border?: string; dot?: string };
  /** Additional className */
  className?: string;
}

/**
 * Format a status string for display
 * e.g., "in_progress" → "In Progress"
 */
function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Detect the category for a given status value
 */
function detectCategory(status: string): StatusCategory {
  const normalized = status.toLowerCase().trim();
  return DEFAULT_STATUS_CATEGORY[normalized] || 'neutral';
}

export function GenericStatusBadge({
  status,
  label,
  size = 'sm',
  showDot = true,
  category,
  customColor,
  className,
}: GenericStatusBadgeProps) {
  if (!status) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  // Determine styling
  const resolvedCategory = category || detectCategory(status);
  const styles = customColor || CATEGORY_STYLES[resolvedCategory];
  const displayLabel = label || formatStatusLabel(status);

  // Size classes
  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-[11px] px-2.5 py-1',
    md: 'text-xs px-3 py-1.5',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        border: styles.border !== 'transparent' ? `1px solid ${styles.border}` : undefined,
      }}
    >
      {showDot && (
        <span
          className={cn('rounded-full flex-shrink-0', dotSizes[size])}
          style={{ backgroundColor: styles.dot || styles.text }}
        />
      )}
      {displayLabel}
    </span>
  );
}

// Export utilities for use elsewhere
export { CATEGORY_STYLES, DEFAULT_STATUS_CATEGORY, detectCategory, formatStatusLabel };
export type { StatusCategory };
