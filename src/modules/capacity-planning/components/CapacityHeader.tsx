import { Search, Download, List, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CapacityHeaderProps {
  viewMode: 'list' | 'gantt';
  onViewModeChange: (mode: 'list' | 'gantt') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
}

export function CapacityHeader({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onExport,
}: CapacityHeaderProps) {
  return (
    <div className="space-y-0">
      {/* Row 1: Title */}
      <div className="h-[44px] flex items-center px-6">
        <h1 className="text-xl font-semibold text-secondary-green">Capacity Planning</h1>
      </div>

      {/* Row 2: Controls */}
      <div 
        className="h-[52px] flex items-center justify-between px-6 border-b"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        {/* Left: View Toggle + Search */}
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'list' 
                  ? 'text-brand-gold bg-brand-gold/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-label="Switch to List view"
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => onViewModeChange('gantt')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'gantt' 
                  ? 'text-brand-gold bg-brand-gold/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-label="Switch to Gantt view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Gantt</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ⌘K
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onExport}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
