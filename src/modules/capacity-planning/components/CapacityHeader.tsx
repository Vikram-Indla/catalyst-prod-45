import { Search, Download, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addWeeks, subWeeks } from 'date-fns';
import { getGCCWeekStart } from '../utils/dateUtils';

interface CapacityHeaderProps {
  viewMode: 'list' | 'gantt';
  onViewModeChange: (mode: 'list' | 'gantt') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExport: () => void;
  // Gantt controls
  startDate: Date;
  onStartDateChange: (date: Date) => void;
  timeSpan: '2weeks' | '5weeks';
  onTimeSpanChange: (span: '2weeks' | '5weeks') => void;
}

export function CapacityHeader({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onExport,
  startDate,
  onStartDateChange,
  timeSpan,
  onTimeSpanChange,
}: CapacityHeaderProps) {
  const handlePrev = () => {
    onStartDateChange(subWeeks(startDate, timeSpan === '2weeks' ? 2 : 5));
  };

  const handleNext = () => {
    onStartDateChange(addWeeks(startDate, timeSpan === '2weeks' ? 2 : 5));
  };

  const handleToday = () => {
    onStartDateChange(getGCCWeekStart(new Date()));
  };

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

        {/* Right: Date Navigation + Export */}
        <div className="flex items-center gap-2">
          {/* Timeline Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={handleToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Range Display */}
          <span className="text-sm text-muted-foreground">
            {format(startDate, 'MMM d, yyyy')}
          </span>

          {/* Time Span Toggle */}
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant={timeSpan === '2weeks' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => onTimeSpanChange('2weeks')}
            >
              2 Weeks
            </Button>
            <Button
              variant={timeSpan === '5weeks' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => onTimeSpanChange('5weeks')}
            >
              5 Weeks
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-2" />

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
