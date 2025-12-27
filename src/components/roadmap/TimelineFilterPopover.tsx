import React, { useState, useMemo } from 'react';
import { Calendar, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter, setMonth, setYear as setDateYear } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type ViewScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TimelineFilterState {
  viewScale: ViewScale;
  selectedYears: number[];
  selectedQuarters: number[]; // 1, 2, 3, 4
}

interface TimelineFilterPopoverProps {
  value: TimelineFilterState;
  onChange: (value: TimelineFilterState) => void;
  availableYears?: number[];
  className?: string;
}

const VIEW_SCALE_OPTIONS: { value: ViewScale; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const QUARTER_OPTIONS = [1, 2, 3, 4];

const DEFAULT_YEARS = [2023, 2024, 2025, 2026, 2027];

export function TimelineFilterPopover({
  value,
  onChange,
  availableYears = DEFAULT_YEARS,
  className,
}: TimelineFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<TimelineFilterState>(value);

  // Reset draft when popover opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraft(value);
    }
    setIsOpen(open);
  };

  // Calculate preview date range
  const previewRange = useMemo(() => {
    if (draft.selectedYears.length === 0) return null;

    const sortedYears = [...draft.selectedYears].sort((a, b) => a - b);
    const sortedQuarters = draft.selectedQuarters.length > 0 
      ? [...draft.selectedQuarters].sort((a, b) => a - b) 
      : [1, 2, 3, 4];

    const firstYear = sortedYears[0];
    const lastYear = sortedYears[sortedYears.length - 1];
    const firstQuarter = sortedQuarters[0];
    const lastQuarter = sortedQuarters[sortedQuarters.length - 1];

    // Calculate start date (first day of first quarter of first year)
    const startMonth = (firstQuarter - 1) * 3;
    const startDate = setMonth(setDateYear(new Date(), firstYear), startMonth);
    const rangeStart = startOfQuarter(startDate);

    // Calculate end date (last day of last quarter of last year)
    const endMonth = (lastQuarter - 1) * 3;
    const endDate = setMonth(setDateYear(new Date(), lastYear), endMonth);
    const rangeEnd = endOfQuarter(endDate);

    return {
      start: rangeStart,
      end: rangeEnd,
    };
  }, [draft.selectedYears, draft.selectedQuarters]);

  const toggleYear = (year: number) => {
    setDraft(prev => {
      const years = prev.selectedYears.includes(year)
        ? prev.selectedYears.filter(y => y !== year)
        : [...prev.selectedYears, year];
      return { ...prev, selectedYears: years };
    });
  };

  const toggleQuarter = (quarter: number) => {
    setDraft(prev => {
      const quarters = prev.selectedQuarters.includes(quarter)
        ? prev.selectedQuarters.filter(q => q !== quarter)
        : [...prev.selectedQuarters, quarter];
      return { ...prev, selectedQuarters: quarters };
    });
  };

  const selectAllQuarters = () => {
    setDraft(prev => ({ ...prev, selectedQuarters: [1, 2, 3, 4] }));
  };

  const handleClear = () => {
    const currentYear = new Date().getFullYear();
    setDraft({
      viewScale: 'quarterly',
      selectedYears: [currentYear],
      selectedQuarters: [1, 2, 3, 4],
    });
  };

  const handleApply = () => {
    onChange(draft);
    setIsOpen(false);
  };

  // Display text for trigger button
  const displayYear = value.selectedYears.length === 1 
    ? value.selectedYears[0].toString()
    : value.selectedYears.length > 1 
      ? `${value.selectedYears.length} years`
      : new Date().getFullYear().toString();

  const allQuartersSelected = draft.selectedQuarters.length === 4;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-9 px-3 flex items-center gap-2 text-sm rounded-lg transition-colors",
            "bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
            className
          )}
        >
          <Calendar size={16} />
          <span>{displayYear}</span>
          <ChevronUp size={12} className={cn("transition-transform", isOpen && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 z-[500]" 
        align="end"
        sideOffset={8}
      >
        <div className="space-y-5">
          {/* View Scale */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2.5 block">
              View Scale
            </label>
            <div className="flex gap-1">
              {VIEW_SCALE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-lg border transition-colors",
                    draft.viewScale === option.value
                      ? "bg-[#2563eb] text-white border-[#2563eb]"
                      : "bg-background border-border hover:bg-muted text-foreground"
                  )}
                  onClick={() => setDraft(prev => ({ ...prev, viewScale: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Select Years */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2.5 block">
              Select Years
            </label>
            <div className="flex flex-wrap gap-2">
              {availableYears.map(year => (
                <button
                  key={year}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg border transition-colors",
                    draft.selectedYears.includes(year)
                      ? "bg-[hsl(var(--brand-primary))] text-white border-[hsl(var(--brand-primary))]"
                      : "bg-background border-border hover:bg-muted text-foreground"
                  )}
                  onClick={() => toggleYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Select Quarters */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-sm font-medium text-foreground">
                Select Quarters
              </label>
              <button
                className={cn(
                  "text-sm transition-colors",
                  allQuartersSelected 
                    ? "text-muted-foreground" 
                    : "text-[hsl(var(--brand-primary))] hover:underline"
                )}
                onClick={selectAllQuarters}
              >
                All
              </button>
            </div>
            <div className="flex gap-2">
              {QUARTER_OPTIONS.map(quarter => (
                <button
                  key={quarter}
                  className={cn(
                    "flex-1 px-4 py-2 text-sm rounded-lg border transition-colors",
                    draft.selectedQuarters.includes(quarter)
                      ? "bg-[hsl(var(--brand-primary))] text-white border-[hsl(var(--brand-primary))]"
                      : "bg-background border-border hover:bg-muted text-foreground"
                  )}
                  onClick={() => toggleQuarter(quarter)}
                >
                  Q{quarter}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {previewRange && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Preview:</span>{' '}
              {format(previewRange.start, 'MMM d, yyyy')} – {format(previewRange.end, 'MMM d, yyyy')}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted text-foreground transition-colors"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                draft.selectedYears.length > 0
                  ? "bg-[hsl(var(--secondary-olive))] text-white hover:bg-[hsl(var(--secondary-olive)/0.9)]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              onClick={handleApply}
              disabled={draft.selectedYears.length === 0}
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const DEFAULT_TIMELINE_FILTER: TimelineFilterState = {
  viewScale: 'quarterly',
  selectedYears: [new Date().getFullYear()],
  selectedQuarters: [1, 2, 3, 4],
};
