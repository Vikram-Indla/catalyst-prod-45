import React from 'react';
import { cn } from '@/lib/utils';

interface StatusPillProps {
  statusId: string;
  statusName: string;
  category: 'todo' | 'in_progress' | 'done';
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusPill({
  statusId,
  statusName,
  category,
  color,
  size = 'md',
  className,
}: StatusPillProps) {
  const getCategoryStyles = () => {
    switch (category) {
      case 'todo':
        return 'bg-muted text-muted-foreground';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-1.5 py-0.5 text-[10px]';
      case 'md':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-3 py-1.5 text-sm';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold uppercase rounded',
        getCategoryStyles(),
        getSizeStyles(),
        className
      )}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
      data-status-id={statusId}
    >
      {statusName}
    </span>
  );
}
