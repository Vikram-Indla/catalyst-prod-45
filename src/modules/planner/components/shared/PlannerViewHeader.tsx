// ============================================================
// PLANNER VIEW HEADER - Unified V9 style header for all views
// Matches Dashboard header pattern: icon + title + subtitle + actions
// ============================================================

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PlannerViewHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PlannerViewHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions 
}: PlannerViewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {subtitle}
          </p>
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
