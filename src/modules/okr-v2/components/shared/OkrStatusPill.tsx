// ═══════════════════════════════════════════════════════════════════════════════
// OKR Status Pill — Shared Presentational Component
// Status pills with Catalyst brand colors matching the executive OKR design
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

// Status styles matching the reference design
const STATUS_STYLES: Record<string, { 
  bg: string; 
  text: string; 
  border: string;
  variant: 'filled' | 'outline';
}> = {
  'pending': { 
    bg: 'bg-[#f5f3f0]', 
    text: 'text-[#8b8178]', 
    border: 'border-[#e8e4dc]',
    variant: 'filled'
  },
  'in-progress': { 
    bg: 'bg-transparent', 
    text: 'text-brand-gold', 
    border: 'border-brand-gold',
    variant: 'outline'
  },
  'on-track': { 
    bg: 'bg-secondary-green', 
    text: 'text-white', 
    border: 'border-secondary-green',
    variant: 'filled'
  },
  'at-risk': { 
    bg: 'bg-[#e07830]', 
    text: 'text-white', 
    border: 'border-[#e07830]',
    variant: 'filled'
  },
  'off-track': { 
    bg: 'bg-[#c44536]', 
    text: 'text-white', 
    border: 'border-[#c44536]',
    variant: 'filled'
  },
  'blocked': { 
    bg: 'bg-[#c44536]', 
    text: 'text-white', 
    border: 'border-[#c44536]',
    variant: 'filled'
  },
  'completed': { 
    bg: 'bg-secondary-green', 
    text: 'text-white', 
    border: 'border-secondary-green',
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
        'inline-flex items-center justify-center rounded-full font-medium border whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1 text-xs',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {displayLabel}
    </span>
  );
}
