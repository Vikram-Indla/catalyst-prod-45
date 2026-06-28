// ============================================================
// PLANNER VIEW HEADER - Unified V9 style header for all views
// Matches Dashboard header pattern: icon + title + subtitle + actions
// Includes Add Task button as standard action
// ============================================================

import React, { ReactNode } from 'react';
import { Plus } from '@/lib/atlaskit-icons';
import { Button } from '@/components/ui/button';

interface PlannerViewHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  onAddTask?: () => void;
  showAddTask?: boolean;
}

export function PlannerViewHeader({ 
  title, 
  subtitle, 
  actions,
  onAddTask,
  showAddTask = true,
}: PlannerViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1))] bg-white dark:bg-[var(--ds-surface)]">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[var(--ds-text,var(--cp-bg-neutral))]">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[var(--ds-text-subtlest)]">
          {subtitle}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {actions}
        
        {showAddTask && onAddTask && (
          <Button
            onClick={onAddTask}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>
    </div>
  );
}
