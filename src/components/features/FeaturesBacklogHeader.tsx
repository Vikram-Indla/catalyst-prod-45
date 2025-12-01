import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutList, LayoutGrid, Plus, MoreVertical, Search, Grid3x3, Filter, TrendingUp, ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FeaturesBacklogHeaderProps {
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  onCreateFeature: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onColumnsClick: () => void;
  onFiltersClick: () => void;
  onExport: () => void;
  onApplyWSJF?: () => void;
  onPullRank?: () => void;
}

export function FeaturesBacklogHeader({
  viewMode,
  onViewModeChange,
  onCreateFeature,
  searchQuery,
  onSearchChange,
  onColumnsClick,
  onFiltersClick,
  onExport,
  onApplyWSJF,
  onPullRank,
}: FeaturesBacklogHeaderProps) {
  return (
    <div className="border-b bg-card">
      {/* Title Row */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Features</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Mid-level work items that deliver value to end users</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onCreateFeature} className="gap-2 text-xs sm:text-sm" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Feature</span>
              <span className="sm:hidden">Create</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 text-xs sm:text-sm" size="sm">
                  <MoreVertical className="h-4 w-4" />
                  <span className="hidden sm:inline">More Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onExport}>
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Import Features
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Bulk Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Manage Labels
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="px-3 sm:px-6 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-r-none gap-2",
                viewMode === 'list' && "bg-accent"
              )}
              onClick={() => onViewModeChange('list')}
            >
              <LayoutList className="h-4 w-4" />
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-l-none gap-2",
                viewMode === 'kanban' && "bg-accent"
              )}
              onClick={() => onViewModeChange('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onApplyWSJF && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-xs sm:text-sm"
              onClick={onApplyWSJF}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Apply WSJF</span>
            </Button>
          )}
          {onPullRank && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-xs sm:text-sm"
              onClick={onPullRank}
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">Pull Rank</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-xs sm:text-sm"
            onClick={onColumnsClick}
          >
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-xs sm:text-sm"
            onClick={onFiltersClick}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-[140px] sm:w-[200px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
