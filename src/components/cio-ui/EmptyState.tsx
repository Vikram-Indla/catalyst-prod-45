import React from 'react';
import { cn } from '@/lib/utils';
import { CIOButton } from './CIOButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {icon && (
        <div className="w-12 h-12 mb-4 rounded-xl bg-[var(--empty-state-bg)] flex items-center justify-center text-[var(--text-faint)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-[var(--text-muted)] max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <CIOButton onClick={action.onClick} variant="primary" size="sm">
          {action.label}
        </CIOButton>
      )}
    </div>
  );
}
