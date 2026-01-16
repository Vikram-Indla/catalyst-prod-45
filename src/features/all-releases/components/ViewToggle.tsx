/**
 * View Toggle Component
 * Toggle between Cards, Timeline, and Table views
 */

import React from 'react';
import { LayoutGrid, GanttChartSquare, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from '../types';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'cards', icon: <LayoutGrid className="w-4 h-4" />, label: 'Cards' },
  { mode: 'timeline', icon: <GanttChartSquare className="w-4 h-4" />, label: 'Timeline' },
  { mode: 'table', icon: <Table2 className="w-4 h-4" />, label: 'Table' },
];

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
      {views.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            viewMode === mode
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
