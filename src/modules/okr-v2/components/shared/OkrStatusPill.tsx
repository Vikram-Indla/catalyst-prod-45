// ═══════════════════════════════════════════════════════════════════════════════
// OKR Status Pill — Shared Presentational Component
// Used by both OKRHubV1 (Objectives Table) and OKRHubV2 (Strategy Tree)
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'pending': { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  'in-progress': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'on-track': { bg: 'bg-secondary-green/10', text: 'text-secondary-green', border: 'border-secondary-green/30' },
  'at-risk': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'off-track': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  'blocked': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  'completed': { bg: 'bg-secondary-green/10', text: 'text-secondary-green', border: 'border-secondary-green/30' },
};

interface OkrStatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export function OkrStatusPill({ status, size = 'md' }: OkrStatusPillProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');
  const styles = STATUS_STYLES[normalizedStatus] || STATUS_STYLES['pending'];
  
  // Convert status to display format
  const displayStatus = status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium border whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {displayStatus}
    </span>
  );
}
