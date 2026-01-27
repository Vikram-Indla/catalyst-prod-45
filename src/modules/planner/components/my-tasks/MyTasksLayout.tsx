// ============================================================
// MY TASKS LAYOUT
// Planner V9: Enterprise 3-column layout for personal task management
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
        'bg-slate-100 dark:bg-slate-900',
        className
      )}
    >
      {children}
    </div>
  );
}

// Sidebar wrapper (Left)
interface MyTasksSidebarWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MyTasksSidebarWrapper({ children, className }: MyTasksSidebarWrapperProps) {
  return (
    <aside 
      className={cn(
        'flex-shrink-0 flex flex-col h-full border-r w-[280px]',
        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {children}
    </aside>
  );
}

// Main content wrapper (Center)
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

// Right panel wrapper
interface MyTasksRightPanelWrapperProps {
  children: ReactNode;
  className?: string;
  isVisible?: boolean;
}

export function MyTasksRightPanelWrapper({ children, className, isVisible = true }: MyTasksRightPanelWrapperProps) {
  if (!isVisible) return null;
  
  return (
    <aside 
      className={cn(
        'flex-shrink-0 flex flex-col h-full border-l overflow-hidden w-[320px]',
        'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {children}
    </aside>
  );
}
