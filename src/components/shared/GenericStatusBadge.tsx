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
 * BRAND COLORS (Blue + Teal Professional Palette):
 * - Teal #0d9488: Success states (done, complete, active)
 * - Amber #f59e0b: Warning/attention states (at risk, pending)
 * - Red #ef4444: Critical/blocked states (off track, blocked)
 * - Gray #6b7280: Neutral states (draft, backlog)
 * - Blue #2563eb: Progress/active states
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

// Brand-aligned color configuration - Blue + Teal palette
const CATEGORY_STYLES: Record<StatusCategory, { bg: string; text: string; border: string; dot: string }> = {
  success: {
    bg: 'rgba(13, 148, 136, 0.1)',     // Teal 10%
    text: '#0d9488',                    // Teal
    border: 'transparent',
    dot: '#0d9488',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',     // Amber 10%
    text: '#b45309',                    // Amber dark
    border: 'transparent',
    dot: '#f59e0b',
  },
  critical: {
    bg: 'rgba(239, 68, 68, 0.1)',      // Red 10%
    text: '#ef4444',                    // Red
    border: 'transparent',
    dot: '#ef4444',
  },
  neutral: {
    bg: 'rgba(107, 114, 128, 0.1)',    // Gray 10%
    text: '#6b7280',
    border: 'transparent',
    dot: '#6b7280',
  },
  info: {
    bg: 'rgba(107, 114, 128, 0.1)',
    text: '#6b7280',
    border: 'transparent',
    dot: '#9ca3af',
  },
  progress: {
    bg: 'rgba(37, 99, 235, 0.1)',      // Blue 10%
    text: '#2563eb',
    border: '#2563eb',
    dot: '#2563eb',
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