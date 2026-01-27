// ============================================================
// MY TASKS LAYOUT - V8 Design System (Budget Planner Aligned)
// Simplified wrapper - main styling handled by PageChrome
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
        'my-tasks-module flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden',
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
        className
      )}
    >
      {children}
    </main>
  );
}
