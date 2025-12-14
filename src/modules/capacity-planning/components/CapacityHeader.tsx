import { useState } from 'react';
import { Search, Download, List, LayoutGrid, ChevronLeft, ChevronRight, Info, Layers, CalendarIcon, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addWeeks, subWeeks, addDays } from 'date-fns';
import { getGCCWeekStart } from '../utils/dateUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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
  // Group by
  groupBy: string;
  onGroupByChange: (group: string) => void;
  // Insights panel
  showInsights: boolean;
  onToggleInsights: () => void;
  // Save View
  onSaveView: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
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
  groupBy,
  onGroupByChange,
  showInsights,
  onToggleInsights,
  onSaveView,
  isSaving,
  saveDisabled,
}: CapacityHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Calculate end date based on time span
  const weeksCount = timeSpan === '2weeks' ? 2 : 5;
  const endDate = addDays(addWeeks(startDate, weeksCount), -1);

  const handlePrev = () => {
    onStartDateChange(subWeeks(startDate, weeksCount));
  };

  const handleNext = () => {
    onStartDateChange(addWeeks(startDate, weeksCount));
  };

  const handleToday = () => {
    onStartDateChange(getGCCWeekStart(new Date()));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onStartDateChange(getGCCWeekStart(date));
      setCalendarOpen(false);
    }
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
        <div className="flex items-center gap-3">
          {/* Timeline Navigation: < DateRange > */}
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Date Range Display with Calendar Popover */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-3 gap-2 text-foreground font-medium">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[400]" align="center">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Group By Dropdown */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant={groupBy !== 'none' ? 'secondary' : 'ghost'} 
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Group by</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="z-[400]">
                <DropdownMenuRadioGroup value={groupBy} onValueChange={onGroupByChange}>
                  <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="quarter">Quarter</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="resource">Resource</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="type">Type</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>

          {/* Info/Insights Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showInsights ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleInsights}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showInsights ? 'Hide details' : 'Show details'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Save View Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm"
                  onClick={onSaveView}
                  disabled={isSaving || saveDisabled}
                  className="gap-1.5 bg-brand-gold hover:bg-brand-gold-hover text-white border-brand-gold disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save View
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save current view configuration</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
