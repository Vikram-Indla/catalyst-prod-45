// ============================================================
// MY TASKS LAYOUT
// Planner V9: Single-column focused personal task view
// Per justification matrix: No sidebar, no right panel
// ============================================================

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MyTasksLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MyTasksLayout({ children, className }: MyTasksLayoutProps) {
  return (
    <div 
      className={cn(
        'my-tasks-module flex h-full min-h-0 w-full overflow-hidden',
        'bg-slate-50 dark:bg-slate-900',
        className
      )}
    >
      {children}
    </div>
  );
}

// Main content wrapper - Full width single column
interface MyTasksContentWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MyTasksContentWrapper({ children, className }: MyTasksContentWrapperProps) {
  return (
    <main 
      className={cn(
        'flex-1 min-w-0 flex flex-col h-full overflow-hidden',
        'bg-white dark:bg-slate-900',
        className
      )}
    >
      {children}
    </main>
  );
}
