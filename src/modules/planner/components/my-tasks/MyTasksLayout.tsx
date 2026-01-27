// ============================================================
// MY TASKS LAYOUT
// Planner V9: 3-column layout for personal task management
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
        'my-tasks-module flex h-full min-h-0 w-full',
        'bg-[var(--planner-bg-secondary)]',
        className
      )}
      style={{
        // Planner V9 CSS variables
        '--planner-bg-primary': '#ffffff',
        '--planner-bg-secondary': '#f8fafc',
        '--planner-bg-hover': '#f1f5f9',
        '--planner-bg-active': '#e2e8f0',
        '--planner-text-primary': '#0f172a',
        '--planner-text-secondary': '#475569',
        '--planner-text-muted': '#94a3b8',
        '--planner-border': '#e2e8f0',
        '--planner-border-strong': '#cbd5e1',
        '--planner-primary': '#8b5cf6',
        '--planner-primary-muted': 'rgba(139, 92, 246, 0.12)',
        '--planner-success': '#10b981',
        '--planner-success-muted': 'rgba(16, 185, 129, 0.12)',
        '--planner-warning': '#f59e0b',
        '--planner-warning-muted': 'rgba(245, 158, 11, 0.12)',
        '--planner-danger': '#ef4444',
        '--planner-danger-muted': 'rgba(239, 68, 68, 0.12)',
        '--planner-sidebar-width': '280px',
        '--planner-right-panel-width': '320px',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// Sidebar wrapper
interface MyTasksSidebarWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MyTasksSidebarWrapper({ children, className }: MyTasksSidebarWrapperProps) {
  return (
    <aside 
      className={cn(
        'flex-shrink-0 flex flex-col h-full border-r',
        'bg-[var(--planner-bg-primary)] border-[var(--planner-border)]',
        className
      )}
      style={{ width: 'var(--planner-sidebar-width)' }}
    >
      {children}
    </aside>
  );
}

// Main content wrapper
interface MyTasksContentWrapperProps {
  children: ReactNode;
  className?: string;
}

export function MyTasksContentWrapper({ children, className }: MyTasksContentWrapperProps) {
  return (
    <main 
      className={cn(
        'flex-1 min-w-0 flex flex-col h-full overflow-hidden',
        'bg-[var(--planner-bg-primary)]',
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
        'flex-shrink-0 flex flex-col h-full border-l overflow-hidden',
        'bg-[var(--planner-bg-primary)] border-[var(--planner-border)]',
        className
      )}
      style={{ width: 'var(--planner-right-panel-width)' }}
    >
      {children}
    </aside>
  );
}
