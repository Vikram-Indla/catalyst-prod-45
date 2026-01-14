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
  counts?: Record<string, number>;
}

export function DefectViewTabs({
  views,
  activeViewId,
  onViewChange,
  onCreateView,
  counts = {},
}: DefectViewTabsProps) {
  return (
    <div className="flex items-center gap-1">
      {views.map((view) => {
        const count = counts[view.id] ?? view.count;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              activeViewId === view.id
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {view.name}
            {count !== undefined && (
              <span className={cn(
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                activeViewId === view.id ? "bg-primary/20" : "bg-muted"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
      
      {onCreateView && (
        <button
          onClick={onCreateView}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          aria-label="Create new view"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
