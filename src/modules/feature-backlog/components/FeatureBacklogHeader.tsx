/**
 * FeatureBacklogHeader — Toolbar for Feature Backlog
 * Matches EpicBacklogHeader structure exactly
 */
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Columns, 
  Download,
  Plus,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureBacklogHeaderProps {
  programId: string;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onExport: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}

export function FeatureBacklogHeader({
  programId,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onOpenFilters,
  onOpenColumns,
  onExport,
  selectedCount,
  onClearSelection,
}: FeatureBacklogHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card">
      {/* Left: Title + Selection */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">Feature Backlog</h1>
        
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
            <span className="font-medium">{selectedCount} selected</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 p-0 hover:bg-transparent"
              onClick={onClearSelection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-[200px] h-9"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 px-3 rounded-r-none",
              viewMode === 'list' && "bg-muted"
            )}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 px-3 rounded-l-none",
              viewMode === 'kanban' && "bg-muted"
            )}
            onClick={() => onViewModeChange('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter */}
        <Button variant="outline" size="sm" onClick={onOpenFilters}>
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>

        {/* Columns */}
        <Button variant="outline" size="sm" onClick={onOpenColumns}>
          <Columns className="h-4 w-4 mr-1" />
          Columns
        </Button>

        {/* Export */}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>

        {/* Create - placeholder, will navigate to create flow */}
        <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover text-white">
          <Plus className="h-4 w-4 mr-1" />
          Create Feature
        </Button>
      </div>
    </div>
  );
}
