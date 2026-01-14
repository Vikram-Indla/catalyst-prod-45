import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { DefectViewTabs } from './DefectViewTabs';
import type { SavedView, DefectFilters } from '@/types/defect.types';

interface DefectListHeaderProps {
  views: SavedView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  onCreateView: () => void;
  onCreateDefect: () => void;
  onExport: () => void;
  filters: DefectFilters;
  defectCounts: Record<string, number>;
}

export const DefectListHeader = memo(function DefectListHeader({
  views,
  activeViewId,
  onViewChange,
  onCreateView,
  onCreateDefect,
  onExport,
  defectCounts,
}: DefectListHeaderProps) {
  return (
    <div className="flex items-center justify-between h-[52px] px-4 bg-background border-b border-border">
      {/* Left: Title */}
      <h1 className="text-lg font-semibold text-foreground">Defects</h1>

      {/* Center: View Tabs */}
      <DefectViewTabs
        views={views}
        activeViewId={activeViewId}
        onViewChange={onViewChange}
        onCreateView={onCreateView}
        counts={defectCounts}
      />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="text-muted-foreground hover:text-foreground"
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <Button
          size="sm"
          onClick={onCreateDefect}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Defect
          <kbd className="ml-2 text-[10px] font-mono bg-primary-foreground/20 px-1 rounded">
            C
          </kbd>
        </Button>
      </div>
    </div>
  );
});
