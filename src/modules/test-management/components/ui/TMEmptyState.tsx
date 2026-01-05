/**
 * TMEmptyState - Empty state component for Test Management
 */

import { cn } from '@/lib/utils';
import { LucideIcon, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TMEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function TMEmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className,
}: TMEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-6 text-center',
      'border border-dashed border-border-subtle rounded-lg bg-surface-0',
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="default" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
