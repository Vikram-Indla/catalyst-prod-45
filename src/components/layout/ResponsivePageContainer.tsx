import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsivePageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive container for all Catalyst pages
 * Provides consistent padding and max-width across all screen sizes
 */
export function ResponsivePageContainer({ children, className }: ResponsivePageContainerProps) {
  return (
    <div className={cn('w-full min-w-0 p-3 sm:p-4 md:p-6 lg:p-8', className)}>
      {children}
    </div>
  );
}

interface ResponsivePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Responsive page header with title, description, and action buttons
 */
export function ResponsivePageHeader({ title, description, actions, className }: ResponsivePageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6;
  className?: string;
}

/**
 * Responsive grid that adapts columns based on screen size
 */
export function ResponsiveGrid({ children, cols = 3, className }: ResponsiveGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-3 sm:gap-4', gridClasses[cols], className)}>
      {children}
    </div>
  );
}

interface ResponsiveTableWrapperProps {
  children: ReactNode;
  minWidth?: number;
  className?: string;
}

/**
 * Responsive table wrapper with horizontal scroll on mobile
 */
export function ResponsiveTableWrapper({ children, minWidth = 800, className }: ResponsiveTableWrapperProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div style={{ minWidth: `${minWidth}px` }}>
        {children}
      </div>
    </div>
  );
}
