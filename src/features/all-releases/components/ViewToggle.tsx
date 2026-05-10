/**
 * View Toggle Component
 * Toggle between Cards, Timeline, and Table views
 */

import React from 'react';
import GridIcon from '@atlaskit/icon/core/grid';
// No @atlaskit/icon equivalent — inline SVG
const GanttChartSquareIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 8h7" /><path d="M8 12h6" /><path d="M11 16h5" />
  </svg>
);
const Table2Icon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
  </svg>
);
import { cn } from '@/lib/utils';
import { ViewMode } from '../types';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const views: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'cards', icon: <GridIcon label="" size="small" primaryColor="currentColor" />, label: 'Cards' },
  { mode: 'timeline', icon: <GanttChartSquareIcon size={16} />, label: 'Timeline' },
  { mode: 'table', icon: <Table2Icon size={16} />, label: 'Table' },
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
