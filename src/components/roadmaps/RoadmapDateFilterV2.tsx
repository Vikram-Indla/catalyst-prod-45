// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST ROADMAP DATE FILTER V2
// Design #2: Scale-integrated period selector with multi-select years/quarters
// Reusable across Enterprise Roadmap, Product Roadmap, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';
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
  appliedViewport: RoadmapViewport;
  onApply: (viewport: RoadmapViewport) => void;
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

function computeDateRange(
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export const RoadmapDateFilterV2: React.FC<RoadmapDateFilterV2Props> = ({
  appliedViewport,
  onApply,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Draft state (user is selecting)
  const [draftScale, setDraftScale] = useState<RoadmapScale>(appliedViewport.scale);
  const [draftYears, setDraftYears] = useState<number[]>(appliedViewport.selectedYears);
  const [draftQuarters, setDraftQuarters] = useState<number[]>(appliedViewport.selectedQuarters);

  // Reset draft when popover opens
  useEffect(() => {
    if (isOpen) {
      setDraftScale(appliedViewport.scale);
      setDraftYears(appliedViewport.selectedYears);
      setDraftQuarters(appliedViewport.selectedQuarters);
    }
  }, [isOpen, appliedViewport]);

  // Derive draft date range
  const draftMode = draftQuarters.length > 0 && draftQuarters.length < 4 ? 'quarter' : 'year';
  const draftDateRange = useMemo(
    () => computeDateRange(draftYears, draftQuarters, draftMode),
    [draftYears, draftQuarters, draftMode]
  );

  // Year options: current year ± 3
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = CURRENT_YEAR - 2; y <= CURRENT_YEAR + 2; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const toggleYear = (year: number) => {
    setDraftYears(prev => {
      if (prev.includes(year)) {
        // Don't allow deselecting all years
        if (prev.length === 1) return prev;
        return prev.filter(y => y !== year).sort((a, b) => a - b);
      }
      return [...prev, year].sort((a, b) => a - b);
    });
  };

  const toggleQuarter = (q: number) => {
    setDraftQuarters(prev => {
      if (prev.includes(q)) {
        return prev.filter(x => x !== q).sort((a, b) => a - b);
      }
      return [...prev, q].sort((a, b) => a - b);
    });
  };

  const selectAllQuarters = () => {
    setDraftQuarters([1, 2, 3, 4]);
  };

  const handleApply = () => {
    const { start, end } = computeDateRange(draftYears, draftQuarters, draftMode);
    
    const viewport: RoadmapViewport = {
      scale: draftScale,
      start,
      end,
      selectedYears: draftYears,
      selectedQuarters: draftQuarters,
      mode: draftMode,
    };
    
    onApply(viewport);
    setIsOpen(false);
  };

  const handleClear = () => {
    const defaultViewport = getDefaultViewport();
    setDraftScale(defaultViewport.scale);
    setDraftYears(defaultViewport.selectedYears);
    setDraftQuarters(defaultViewport.selectedQuarters);
    onApply(defaultViewport);
    setIsOpen(false);
  };

  // Label for trigger button
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
    draftScale !== appliedViewport.scale ||
    JSON.stringify(draftYears) !== JSON.stringify(appliedViewport.selectedYears) ||
    JSON.stringify(draftQuarters) !== JSON.stringify(appliedViewport.selectedQuarters);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm",
            isOpen 
              ? "bg-brand-gold text-white border-brand-gold shadow-md" 
              : "bg-background text-foreground border-border hover:border-brand-gold/50",
            className
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{getAppliedLabel()}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[360px] p-0 bg-background border border-border rounded-xl shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* View Scale Section */}
        <div className="p-4 border-b border-border">
          <div className="text-sm font-semibold text-foreground mb-3">View Scale</div>
          <div className="flex gap-2">
            {scaleOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDraftScale(opt.value)}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                  draftScale === opt.value
                    ? "bg-brand-gold text-white border-brand-gold"
                    : "bg-background text-foreground border-border hover:border-brand-gold/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Select Years Section */}
        <div className="p-4 border-b border-border">
          <div className="text-sm font-semibold text-foreground mb-3">Select Years</div>
          <div className="flex gap-2 flex-wrap">
            {yearOptions.map(year => {
              const isSelected = draftYears.includes(year);
              const isCurrent = year === CURRENT_YEAR;
              return (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={cn(
                    "relative px-4 py-2.5 text-sm font-medium rounded-lg border transition-all min-w-[72px]",
                    isSelected
                      ? "bg-brand-gold text-white border-brand-gold"
                      : "bg-muted/50 text-foreground border-border hover:border-brand-gold/50"
                  )}
                >
                  {year}
                  {isCurrent && !isSelected && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-gold" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Select Quarters Section - only show when scale is quarterly or monthly */}
        {(draftScale === 'quarterly' || draftScale === 'monthly') && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Select Quarters</span>
              <button
                onClick={selectAllQuarters}
                className={cn(
                  "text-xs font-medium transition-colors",
                  draftQuarters.length === 4
                    ? "text-brand-gold"
                    : "text-muted-foreground hover:text-brand-gold"
                )}
              >
                All
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(q => {
                const isSelected = draftQuarters.includes(q);
                const isCurrent = q === CURRENT_QUARTER && draftYears.includes(CURRENT_YEAR);
                return (
                  <button
                    key={q}
                    onClick={() => toggleQuarter(q)}
                    className={cn(
                      "relative px-3 py-2.5 text-sm font-medium rounded-lg border transition-all",
                      isSelected
                        ? "bg-brand-gold text-white border-brand-gold"
                        : "bg-muted/50 text-foreground border-border hover:border-brand-gold/50"
                    )}
                  >
                    Q{q}
                    {isCurrent && !isSelected && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-gold" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview & Actions */}
        <div className="p-4 bg-muted/30">
          {/* Preview */}
          <div className="mb-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Preview: </span>
            {draftDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' – '}
            {draftDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              disabled={!hasChanges && draftYears.length > 0}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                hasChanges || draftYears.length === 0
                  ? "bg-brand-gold text-white hover:bg-brand-gold-hover"
                  : "bg-brand-gold/50 text-white/70 cursor-not-allowed"
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
      <div className="text-brand-gold font-semibold mb-2">🔍 Viewport Debug</div>
      
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
