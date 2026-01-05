/**
 * TMPageHeader - Page header component for Test Management pages
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TMPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function TMPageHeader({ 
  title, 
  description, 
  actions, 
  badge,
  className 
}: TMPageHeaderProps) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 pb-4 border-b border-border',
      className
    )}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
