// ============================================================
// PLANNER VIEW HEADER - Unified V9 style header for all views
// Matches Dashboard header pattern: icon + title + subtitle + actions
// Includes Add Task button as standard action
// ============================================================

import React, { ReactNode } from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlannerViewHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  onAddTask?: () => void;
  showAddTask?: boolean;
}

export function PlannerViewHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions,
  onAddTask,
  showAddTask = true,
}: PlannerViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
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
