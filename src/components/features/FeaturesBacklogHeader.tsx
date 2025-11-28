import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutList, LayoutGrid, Plus, MoreVertical, Search, Grid3x3, Filter } from 'lucide-react';
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
}: FeaturesBacklogHeaderProps) {
  return (
    <div className="border-b bg-card">
      {/* Title Row */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Features</h1>
            <p className="text-sm text-muted-foreground">Mid-level work items that deliver value to end users</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onCreateFeature} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Feature
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="h-4 w-4" />
                  More Actions
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
      <div className="px-6 py-3 border-t flex items-center justify-between gap-4">
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

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={onColumnsClick}
          >
            <Grid3x3 className="h-4 w-4" />
            Columns
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={onFiltersClick}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
