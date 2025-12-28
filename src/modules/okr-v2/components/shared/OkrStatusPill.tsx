// ═══════════════════════════════════════════════════════════════════════════════
// OKR Status Pill — Shared Presentational Component
// Status pills using Catalyst semantic tokens (NO hardcoded hex values)
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

// Status styles using ONLY valid Tailwind classes
const STATUS_STYLES: Record<string, { 
  bg: string; 
  text: string; 
  border: string;
  variant: 'filled' | 'outline';
}> = {
  'pending': { 
    bg: 'bg-muted', 
    text: 'text-muted-foreground', 
    border: 'border-border',
    variant: 'filled'
  },
  'in-progress': { 
    bg: 'bg-transparent',
    text: 'text-teal-600 dark:text-teal-400', 
    border: 'border-teal-600 dark:border-teal-400',
    variant: 'outline'
  },
  'on-track': { 
    bg: 'bg-teal-600', 
    text: 'text-white', 
    border: 'border-teal-600',
    variant: 'filled'
  },
  'at-risk': { 
    bg: 'bg-bronze', 
    text: 'text-white', 
    border: 'border-bronze',
    variant: 'filled'
  },
  'off-track': { 
    bg: 'bg-destructive', 
    text: 'text-destructive-foreground', 
    border: 'border-destructive',
    variant: 'filled'
  },
  'blocked': { 
    bg: 'bg-destructive', 
    text: 'text-destructive-foreground', 
    border: 'border-destructive',
    variant: 'filled'
  },
  'completed': { 
    bg: 'bg-teal-600', 
    text: 'text-white', 
    border: 'border-teal-600',
    variant: 'filled'
  },
};

// Display labels for statuses
const STATUS_LABELS: Record<string, string> = {
  'pending': 'Pending',
  'in-progress': 'In Progress',
  'on-track': 'On track',
  'at-risk': 'At risk',
  'off-track': 'Off track',
  'blocked': 'Blocked',
  'completed': 'Completed',
};

interface OkrStatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export function OkrStatusPill({ status, size = 'md' }: OkrStatusPillProps) {
  // Normalize status: lowercase, replace spaces and underscores with hyphens
  const normalizedStatus = status.toLowerCase().replace(/[\s_]+/g, '-');
  const styles = STATUS_STYLES[normalizedStatus] || STATUS_STYLES['pending'];
  const displayLabel = STATUS_LABELS[normalizedStatus] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium border whitespace-nowrap text-center',
        // Uniform width based on longest status "In Progress", flatter height
        'min-w-[70px] px-2 py-[3px] text-[10px]',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {displayLabel}
    </span>
  );
}
