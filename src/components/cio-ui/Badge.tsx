import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'theme' | 'objective' | 'kr' | 'epic' | 'feature' | 'default' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  theme: 'bg-[rgba(92,124,92,0.15)] text-[var(--section-accent-green)]',
  objective: 'bg-[rgba(198,156,109,0.15)] text-[var(--section-accent-gold)]',
  kr: 'bg-[rgba(139,115,85,0.15)] text-[var(--section-accent-bronze)]',
  epic: 'bg-[rgba(139,115,85,0.15)] text-[var(--section-accent-bronze)]',
  feature: 'bg-[rgba(200,204,208,0.25)] text-[var(--text-muted)]',
  default: 'bg-[var(--surface-tinted)] text-[var(--text-secondary)]',
  success: 'bg-[rgba(92,124,92,0.15)] text-[var(--section-accent-green)]',
  warning: 'bg-[rgba(198,156,109,0.15)] text-[var(--section-accent-gold)]',
  danger: 'bg-[rgba(184,92,92,0.15)] text-[var(--danger)]',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded',
        'text-[10px] font-semibold uppercase tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'draft' | 'archived' | 'completed' | 'at-risk' | 'blocked';
  className?: string;
}

const statusConfig: Record<StatusBadgeProps['status'], { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  draft: { label: 'Draft', variant: 'default' },
  archived: { label: 'Archived', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  'at-risk': { label: 'At Risk', variant: 'warning' },
  blocked: { label: 'Blocked', variant: 'danger' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
