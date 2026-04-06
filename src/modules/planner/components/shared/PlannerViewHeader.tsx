// ============================================================
// PLANNER VIEW HEADER - Unified V9 style header for all views
// Matches Dashboard header pattern: icon + title + subtitle + actions
// Includes Add Task button as standard action
// ============================================================

import React, { ReactNode } from 'react';
import { Plus } from 'lucide-react';
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
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2E2E2E] bg-white dark:bg-[#0A0A0A]">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[#EDEDED]">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#A1A1A1]">
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
