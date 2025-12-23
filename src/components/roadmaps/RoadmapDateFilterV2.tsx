// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST ROADMAP DATE FILTER V2
// Design #2: Scale-integrated period selector with multi-select years/quarters
// Fully staged: changes update draft only, applied on explicit Apply click
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES (exported for consumers)
// ─────────────────────────────────────────────────────────────────────────────────

export type RoadmapScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RoadmapViewport {
  scale: RoadmapScale;
  start: Date;
  end: Date;
  selectedYears: number[];
  selectedQuarters: number[]; // 1-4
  mode: 'year' | 'quarter';
}

interface RoadmapDateFilterV2Props {
  // Controlled: receives draft viewport from parent
  draftViewport: RoadmapViewport;
  appliedViewport: RoadmapViewport;
  onDraftChange: (viewport: RoadmapViewport) => void;
  onApply: () => void;
  onClear: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.floor(new Date().getMonth() / 3) + 1;

const QUARTER_BOUNDARIES: Record<number, { startMonth: number; endMonth: number }> = {
  1: { startMonth: 0, endMonth: 2 },   // Jan-Mar
  2: { startMonth: 3, endMonth: 5 },   // Apr-Jun
  3: { startMonth: 6, endMonth: 8 },   // Jul-Sep
  4: { startMonth: 9, endMonth: 11 },  // Oct-Dec
};

export function getDefaultViewport(): RoadmapViewport {
  return {
    scale: 'quarterly',
    start: new Date(CURRENT_YEAR, 0, 1),
    end: new Date(CURRENT_YEAR, 11, 31),
    selectedYears: [CURRENT_YEAR],
    selectedQuarters: [1, 2, 3, 4],
    mode: 'year',
  };
}

export function computeDateRange(
  selectedYears: number[],
  selectedQuarters: number[],
  mode: 'year' | 'quarter'
): { start: Date; end: Date } {
  if (selectedYears.length === 0) {
    return { start: new Date(CURRENT_YEAR, 0, 1), end: new Date(CURRENT_YEAR, 11, 31) };
  }

  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const firstYear = sortedYears[0];
  const lastYear = sortedYears[sortedYears.length - 1];

  if (mode === 'year' || selectedQuarters.length === 0 || selectedQuarters.length === 4) {
    // Full year(s) range
    return {
      start: new Date(firstYear, 0, 1),
      end: new Date(lastYear, 11, 31),
    };
  }

  // Quarter mode: constrain to quarter boundaries
  const sortedQuarters = [...selectedQuarters].sort((a, b) => a - b);
  const firstQuarter = sortedQuarters[0];
  const lastQuarter = sortedQuarters[sortedQuarters.length - 1];

  const startMonth = QUARTER_BOUNDARIES[firstQuarter].startMonth;
  const endMonth = QUARTER_BOUNDARIES[lastQuarter].endMonth;

  return {
    start: new Date(firstYear, startMonth, 1),
    end: new Date(lastYear, endMonth + 1, 0), // Last day of end month
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT (Controlled)
// ─────────────────────────────────────────────────────────────────────────────────

export const RoadmapDateFilterV2: React.FC<RoadmapDateFilterV2Props> = ({
  draftViewport,
  appliedViewport,
  onDraftChange,
  onApply,
  onClear,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Derive mode from draft quarters
  const draftMode = draftViewport.selectedQuarters.length > 0 && draftViewport.selectedQuarters.length < 4 ? 'quarter' : 'year';
  
  // Derive draft date range
  const draftDateRange = useMemo(
    () => computeDateRange(draftViewport.selectedYears, draftViewport.selectedQuarters, draftMode),
    [draftViewport.selectedYears, draftViewport.selectedQuarters, draftMode]
  );

  // Year options: current year ± 2
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR - 2; y <= CURRENT_YEAR + 2; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const updateDraft = (updates: Partial<RoadmapViewport>) => {
    const newDraft = { ...draftViewport, ...updates };
    // Recompute dates based on new selections
    const newMode = newDraft.selectedQuarters.length > 0 && newDraft.selectedQuarters.length < 4 ? 'quarter' : 'year';
    const { start, end } = computeDateRange(newDraft.selectedYears, newDraft.selectedQuarters, newMode);
    onDraftChange({
      ...newDraft,
      start,
      end,
      mode: newMode,
    });
  };

  const toggleYear = (year: number) => {
    const prev = draftViewport.selectedYears;
    let newYears: number[];
    if (prev.includes(year)) {
      // Don't allow deselecting all years
      if (prev.length === 1) return;
      newYears = prev.filter(y => y !== year).sort((a, b) => a - b);
    } else {
      newYears = [...prev, year].sort((a, b) => a - b);
    }
    updateDraft({ selectedYears: newYears });
  };

  const toggleQuarter = (q: number) => {
    const prev = draftViewport.selectedQuarters;
    let newQuarters: number[];
    if (prev.includes(q)) {
      newQuarters = prev.filter(x => x !== q).sort((a, b) => a - b);
    } else {
      newQuarters = [...prev, q].sort((a, b) => a - b);
    }
    updateDraft({ selectedQuarters: newQuarters });
  };

  const selectAllQuarters = () => {
    updateDraft({ selectedQuarters: [1, 2, 3, 4] });
  };

  const setScale = (scale: RoadmapScale) => {
    updateDraft({ scale });
  };

  const handleApply = () => {
    onApply();
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  // Label for trigger button (shows APPLIED state)
  const getAppliedLabel = (): string => {
    const years = appliedViewport.selectedYears;
    const quarters = appliedViewport.selectedQuarters;
    
    if (years.length === 1 && quarters.length === 4) {
      return `${years[0]}`;
    }
    if (years.length === 1 && quarters.length > 0 && quarters.length < 4) {
      const qLabels = quarters.map(q => `Q${q}`).join(', ');
      return `${qLabels} ${years[0]}`;
    }
    if (years.length > 1) {
      return `${years[0]} – ${years[years.length - 1]}`;
    }
    return 'Select Range';
  };

  const scaleOptions: { value: RoadmapScale; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  // Check if there are unsaved changes
  const hasChanges = 
    draftViewport.scale !== appliedViewport.scale ||
    JSON.stringify(draftViewport.selectedYears) !== JSON.stringify(appliedViewport.selectedYears) ||
    JSON.stringify(draftViewport.selectedQuarters) !== JSON.stringify(appliedViewport.selectedQuarters);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm",
            isOpen 
              ? "bg-brand-primary text-white border-brand-primary shadow-md" 
              : "bg-background text-foreground border-border hover:border-brand-primary/50",
            className
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{getAppliedLabel()}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[360px] p-0 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50"
        align="end"
        sideOffset={8}
      >
        {/* View Scale Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">View Scale</h4>
          <div className="flex gap-2">
            {scaleOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setScale(opt.value)}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                  draftViewport.scale === opt.value
                    ? "bg-[#c69c6d] text-white border-[#c69c6d]"
                    : "bg-transparent border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Select Years Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Select Years</h4>
          <div className="flex gap-2 flex-wrap">
            {yearOptions.map(year => {
              const isSelected = draftViewport.selectedYears.includes(year);
              const isCurrent = year === CURRENT_YEAR;
              return (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={cn(
                    "relative px-4 py-2.5 text-sm font-medium rounded-lg border transition-all min-w-[72px]",
                    isSelected
                      ? "bg-[#c69c6d] text-white border-[#c69c6d]"
                      : "bg-transparent border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
                  )}
                >
                  {year}
                  {isCurrent && !isSelected && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c69c6d]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Select Quarters Section - only show when scale is quarterly or monthly */}
        {(draftViewport.scale === 'quarterly' || draftViewport.scale === 'monthly') && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Select Quarters</h4>
              <button
                onClick={selectAllQuarters}
                className={cn(
                  "text-sm font-medium transition-colors",
                  "text-[#c69c6d] hover:text-[#8b7355] dark:text-[#d4b896] dark:hover:text-[#c69c6d]"
                )}
              >
                All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(q => {
                const isSelected = draftViewport.selectedQuarters.includes(q);
                const isCurrent = q === CURRENT_QUARTER && draftViewport.selectedYears.includes(CURRENT_YEAR);
                return (
                  <button
                    key={q}
                    onClick={() => toggleQuarter(q)}
                    className={cn(
                      "relative px-3 py-2.5 text-sm font-medium rounded-lg border transition-all",
                      isSelected
                        ? "bg-[#c69c6d] text-white border-[#c69c6d]"
                        : "bg-transparent border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
                    )}
                  >
                    Q{q}
                    {isCurrent && !isSelected && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#c69c6d]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview & Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          {/* Preview */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="font-medium text-gray-700 dark:text-gray-300">Preview: </span>
            {draftDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' – '}
            {draftDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              disabled={!hasChanges && draftViewport.selectedYears.length > 0}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                hasChanges || draftViewport.selectedYears.length === 0
                  ? "bg-[#c69c6d] hover:bg-[#b08b5c] text-white border-0"
                  : "bg-[#c69c6d]/50 text-white/70 cursor-not-allowed"
              )}
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─────────────────────────────────────────────────────────────────────────────────
// DEBUG OVERLAY (enabled via ?debugViewport=1)
// ─────────────────────────────────────────────────────────────────────────────────

interface RoadmapDebugOverlayProps {
  appliedViewport: RoadmapViewport;
  draftViewport?: RoadmapViewport;
  rowCountBefore: number;
  rowCountAfter: number;
}

export const RoadmapDebugOverlay: React.FC<RoadmapDebugOverlayProps> = ({
  appliedViewport,
  draftViewport,
  rowCountBefore,
  rowCountAfter,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-black/90 text-white text-xs font-mono rounded-lg shadow-xl max-w-sm">
      <div className="text-brand-primary font-semibold mb-2">🔍 Viewport Debug</div>
      
      <div className="mb-2">
        <div className="text-muted-foreground">Applied Viewport:</div>
        <div>Scale: {appliedViewport.scale}</div>
        <div>Start: {appliedViewport.start.toISOString().split('T')[0]}</div>
        <div>End: {appliedViewport.end.toISOString().split('T')[0]}</div>
        <div>Years: [{appliedViewport.selectedYears.join(', ')}]</div>
        <div>Quarters: [{appliedViewport.selectedQuarters.join(', ')}]</div>
      </div>

      {draftViewport && (
        <div className="mb-2 pt-2 border-t border-white/20">
          <div className="text-muted-foreground">Draft Viewport:</div>
          <div>Scale: {draftViewport.scale}</div>
          <div>Start: {draftViewport.start.toISOString().split('T')[0]}</div>
          <div>End: {draftViewport.end.toISOString().split('T')[0]}</div>
        </div>
      )}

      <div className="pt-2 border-t border-white/20">
        <div className="text-muted-foreground">Row Counts:</div>
        <div>Before filter: {rowCountBefore}</div>
        <div>After filter: {rowCountAfter}</div>
      </div>
    </div>
  );
};

export default RoadmapDateFilterV2;
