import React from 'react';
import { cn } from '@/lib/utils';

interface StatusLozengeProps {
  status: string;
  statusCategory?: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

const formatStatus = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * StatusLozenge - Neutral status display component
 * HARD RULE: No colored text/background - all statuses use neutral styling
 */
export const StatusLozenge: React.FC<StatusLozengeProps> = ({ status }) => {
  return (
    <span className={cn(
      "catalyst-status",
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase border",
      "bg-muted/50 text-foreground border-border"
    )}>
      {formatStatus(status)}
    </span>
  );
};
