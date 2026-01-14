// =====================================================
// DEFECT VIEW TABS
// Saved view tabs with counts
// =====================================================

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/types/defect.types';

interface DefectViewTabsProps {
  views: SavedView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  onCreateView?: () => void;
}

export function DefectViewTabs({
  views,
  activeViewId,
  onViewChange,
  onCreateView,
}: DefectViewTabsProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            activeViewId === view.id
              ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          {view.name}
          {view.count !== undefined && (
            <span className={cn(
              "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
              activeViewId === view.id ? "bg-blue-100" : "bg-slate-100"
            )}>
              {view.count}
            </span>
          )}
        </button>
      ))}
      
      {onCreateView && (
        <button
          onClick={onCreateView}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
          aria-label="Create new view"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
