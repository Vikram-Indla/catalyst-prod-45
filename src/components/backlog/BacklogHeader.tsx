import { Eye, Filter, Search, List, LayoutGrid, Circle, TrendingUp, ArrowUpDown } from 'lucide-react';
import { ViewingDropdown } from './ViewingDropdown';
import { ColumnsDropdown, ColumnConfig } from './ColumnsDropdown';
import { LabelsDropdown, LabelConfig } from './LabelsDropdown';
import { ViewingOption } from '@/types/backlog.types';
import { Button } from '@/components/ui/button';

interface BacklogHeaderProps {
  viewingOptions: ViewingOption[];
  selectedViewingId: string;
  onViewingSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeView: 'list' | 'kanban' | 'unassigned';
  onViewChange: (view: 'list' | 'kanban' | 'unassigned') => void;
  columnConfig: ColumnConfig[];
  onColumnConfigChange: (config: ColumnConfig[]) => void;
  labelConfig: LabelConfig;
  onLabelConfigChange: (config: LabelConfig) => void;
  onApplyWSJF?: () => void;
  onPullRank?: () => void;
}

export function BacklogHeader({
  viewingOptions,
  selectedViewingId,
  onViewingSelect,
  searchTerm,
  onSearchChange,
  activeView,
  onViewChange,
  columnConfig,
  onColumnConfigChange,
  labelConfig,
  onLabelConfigChange,
  onApplyWSJF,
  onPullRank
}: BacklogHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground uppercase">Viewing:</span>
        <ViewingDropdown 
          options={viewingOptions}
          selectedId={selectedViewingId}
          onSelect={onViewingSelect}
        />
      </div>

      <div className="flex items-center gap-3">
        {onApplyWSJF && (
          <Button
            variant="outline"
            size="sm"
            onClick={onApplyWSJF}
            className="flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            Apply WSJF to Rank
          </Button>
        )}
        
        {onPullRank && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPullRank}
            className="flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-4 h-4" />
            Pull Rank
          </Button>
        )}

        <button className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors">
          <Eye className="w-4 h-4" />
          Orphan Objects
        </button>

        <ColumnsDropdown 
          columns={columnConfig}
          onChange={onColumnConfigChange}
        />

        <button className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors">
          <Filter className="w-4 h-4" />
          Apply Filters
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[200px] pl-9 pr-3 py-2 border rounded text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex border rounded overflow-hidden">
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm border-r transition-colors ${
              activeView === 'list' 
                ? 'bg-accent text-foreground font-medium' 
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => onViewChange('list')}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm border-r transition-colors ${
              activeView === 'kanban' 
                ? 'bg-accent text-foreground font-medium' 
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => onViewChange('kanban')}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${
              activeView === 'unassigned' 
                ? 'bg-accent text-foreground font-medium' 
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => onViewChange('unassigned')}
          >
            <Circle className="w-4 h-4" />
            Unassigned Backlog
          </button>
        </div>
      </div>
    </div>
  );
}