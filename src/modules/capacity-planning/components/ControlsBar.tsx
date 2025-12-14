import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addWeeks, subWeeks } from 'date-fns';

interface ControlsBarProps {
  viewMode: 'list' | 'gantt';
  timeSpan: '2weeks' | '5weeks';
  onTimeSpanChange: (span: '2weeks' | '5weeks') => void;
  groupBy: string;
  onGroupByChange: (group: string) => void;
  startDate: Date;
  onStartDateChange: (date: Date) => void;
  onAddResource: () => void;
}

export function ControlsBar({
  viewMode,
  timeSpan,
  onTimeSpanChange,
  groupBy,
  onGroupByChange,
  startDate,
  onStartDateChange,
  onAddResource,
}: ControlsBarProps) {
  const handlePrev = () => {
    onStartDateChange(subWeeks(startDate, timeSpan === '2weeks' ? 2 : 5));
  };

  const handleNext = () => {
    onStartDateChange(addWeeks(startDate, timeSpan === '2weeks' ? 2 : 5));
  };

  const handleToday = () => {
    onStartDateChange(new Date());
  };

  return (
    <div 
      className="h-[44px] flex items-center justify-between px-6 border-b bg-muted/30"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      {/* Left Controls */}
      <div className="flex items-center gap-3">
        {viewMode === 'list' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select value={groupBy} onValueChange={onGroupByChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {viewMode === 'gantt' && (
          <>
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
            <div className="flex items-center gap-1 ml-4">
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
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 h-8"
          onClick={onAddResource}
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>
    </div>
  );
}
