import React from 'react';
import { Database, Search, Filter, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'empty' | 'no-results' | 'error';
  className?: string;
}

export function TableEmptyState({
  icon,
  title,
  description,
  action,
  variant = 'empty',
  className,
}: TableEmptyStateProps) {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'no-results':
        return <Search className="h-12 w-12 text-muted-foreground/50 dark:text-foreground/40" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-destructive/60" />;
      default:
        return <Database className="h-12 w-12 text-muted-foreground/50 dark:text-foreground/40" />;
    }
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4",
      className
    )}>
      <div className="mb-4">
        {icon || getDefaultIcon()}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground dark:text-foreground/60 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states
export function NoDataEmptyState({ action }: { action?: React.ReactNode }) {
  return (
    <TableEmptyState
      variant="empty"
      title="No items found"
      description="Create your first item to get started"
      action={action}
    />
  );
}

export function NoResultsEmptyState({ 
  onClearFilters 
}: { 
  onClearFilters?: () => void 
}) {
  return (
    <TableEmptyState
      variant="no-results"
      title="No results match your filters"
      description="Try adjusting your search or filter criteria"
      action={
        onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-primary hover:underline"
          >
            Clear all filters
          </button>
        )
      }
    />
  );
}

export function ErrorEmptyState({ 
  error,
  onRetry 
}: { 
  error?: Error | string;
  onRetry?: () => void 
}) {
  return (
    <TableEmptyState
      variant="error"
      title="Failed to load data"
      description={typeof error === 'string' ? error : error?.message || 'An unexpected error occurred'}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        )
      }
    />
  );
}
