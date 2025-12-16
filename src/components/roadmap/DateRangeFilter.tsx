// ═══════════════════════════════════════════════════════════════════════════════
// CATALYST DATE RANGE FILTER
// Excel/PowerBI-style period selection for Enterprise Roadmap
// Reusable across Enterprise Roadmap, Product Roadmap, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type FilterMode = 'year' | 'quarter' | 'month' | 'custom';

export interface AppliedDateFilter {
  type: FilterMode;
  year: number;
  value: string | number | string[] | number[];
  startDate?: string;
  endDate?: string;
}

interface DateRangeFilterProps {
  appliedFilter: AppliedDateFilter | null;
  onApplyFilter: (filter: AppliedDateFilter) => void;
  onClearFilter: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const QUARTERS = [
  { id: 'Q1', label: 'Q1', months: 'Jan – Mar' },
  { id: 'Q2', label: 'Q2', months: 'Apr – Jun' },
  { id: 'Q3', label: 'Q3', months: 'Jul – Sep' },
  { id: 'Q4', label: 'Q4', months: 'Oct – Dec' },
];

// ─────────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

const getLastDay = (monthIndex: number, year: number): number => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

const getCurrentQuarter = (): string => {
  const month = new Date().getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
};

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  appliedFilter,
  onApplyFilter,
  onClearFilter,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = getCurrentQuarter();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FilterMode>(appliedFilter?.type || 'quarter');
  const [selectedYear, setSelectedYear] = useState(appliedFilter?.year || currentYear);
  
  // Multi-select for quarters
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>(() => {
    if (appliedFilter?.type === 'quarter') {
      const val = appliedFilter.value;
      return Array.isArray(val) ? val as string[] : [String(val)];
    }
    return [currentQuarter];
  });
  
  // Multi-select for months
  const [selectedMonths, setSelectedMonths] = useState<number[]>(() => {
    if (appliedFilter?.type === 'month') {
      const val = appliedFilter.value;
      return Array.isArray(val) ? val as number[] : [Number(val)];
    }
    return [currentMonth];
  });
  
  const [yearGridStart, setYearGridStart] = useState(Math.floor(currentYear / 12) * 12);
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleQuarter = (qId: string) => {
    setSelectedQuarters(prev => 
      prev.includes(qId) 
        ? prev.filter(q => q !== qId) 
        : [...prev, qId].sort()
    );
  };

  const toggleMonth = (monthIdx: number) => {
    setSelectedMonths(prev => 
      prev.includes(monthIdx) 
        ? prev.filter(m => m !== monthIdx) 
        : [...prev, monthIdx].sort((a, b) => a - b)
    );
  };

  const getPreviewText = (): string => {
    switch (mode) {
      case 'year':
        return `01 Jan – 31 Dec ${selectedYear}`;
      case 'quarter': {
        if (selectedQuarters.length === 0) return 'Select quarters';
        if (selectedQuarters.length === 1) {
          const qIndex = parseInt(selectedQuarters[0][1]) - 1;
          const startMonth = MONTHS[qIndex * 3];
          const endMonth = MONTHS[qIndex * 3 + 2];
          return `${startMonth} – ${endMonth} ${selectedYear}`;
        }
        const sorted = [...selectedQuarters].sort();
        return `${sorted[0]} – ${sorted[sorted.length - 1]} ${selectedYear}`;
      }
      case 'month': {
        if (selectedMonths.length === 0) return 'Select months';
        if (selectedMonths.length === 1) {
          return `${MONTHS[selectedMonths[0]]} ${selectedYear}`;
        }
        const sorted = [...selectedMonths].sort((a, b) => a - b);
        return `${MONTHS[sorted[0]]} – ${MONTHS[sorted[sorted.length - 1]]} ${selectedYear}`;
      }
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate} – ${customEndDate}`;
        }
        return 'Select dates';
      default:
        return '';
    }
  };

  const getAppliedLabel = (): string => {
    if (!appliedFilter) return 'Select Range';
    switch (appliedFilter.type) {
      case 'year':
        return String(appliedFilter.year);
      case 'quarter': {
        const val = appliedFilter.value;
        if (Array.isArray(val)) {
          if (val.length === 1) return `${val[0]} ${appliedFilter.year}`;
          return `${val.length} Quarters`;
        }
        return `${val} ${appliedFilter.year}`;
      }
      case 'month': {
        const val = appliedFilter.value;
        if (Array.isArray(val)) {
          if (val.length === 1) return `${MONTHS[val[0] as number]} ${appliedFilter.year}`;
          return `${val.length} Months`;
        }
        return `${MONTHS[Number(val)]} ${appliedFilter.year}`;
      }
      case 'custom':
        return 'Custom Range';
      default:
        return 'Select Range';
    }
  };

  const handleApply = () => {
    let filter: AppliedDateFilter;
    
    switch (mode) {
      case 'year':
        filter = { type: 'year', year: selectedYear, value: selectedYear };
        break;
      case 'quarter':
        filter = { type: 'quarter', year: selectedYear, value: selectedQuarters };
        break;
      case 'month':
        filter = { type: 'month', year: selectedYear, value: selectedMonths };
        break;
      case 'custom':
        filter = { 
          type: 'custom', 
          year: selectedYear, 
          value: 'custom',
          startDate: customStartDate,
          endDate: customEndDate
        };
        break;
      default:
        return;
    }
    
    onApplyFilter(filter);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearFilter();
    setSelectedYear(currentYear);
    setSelectedQuarters([currentQuarter]);
    setSelectedMonths([currentMonth]);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const years = Array.from({ length: 12 }, (_, i) => yearGridStart + i);

  const getDisplayText = (): string => {
    if (mode === 'year') return String(selectedYear);
    if (mode === 'quarter') {
      if (selectedQuarters.length === 0) return 'None';
      if (selectedQuarters.length === 1) return `${selectedQuarters[0]} ${selectedYear}`;
      return `${selectedQuarters.length} Quarters`;
    }
    if (mode === 'month') {
      if (selectedMonths.length === 0) return 'None';
      if (selectedMonths.length === 1) return `${MONTHS[selectedMonths[0]]} ${selectedYear}`;
      return `${selectedMonths.length} Months`;
    }
    return 'Custom';
  };

  const canApply = (): boolean => {
    if (mode === 'quarter') return selectedQuarters.length > 0;
    if (mode === 'month') return selectedMonths.length > 0;
    if (mode === 'custom') return !!(customStartDate && customEndDate);
    return true;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm",
          isOpen 
            ? "bg-brand-dark text-white border-brand-dark shadow-md" 
            : "bg-background text-foreground border-border hover:border-muted-foreground"
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span className="font-medium">{getAppliedLabel()}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50">
          {/* Arrow */}
          <div className="absolute -top-1.5 right-6 w-3 h-3 bg-background rotate-45 border-l border-t border-border" />
          
          <div className="bg-background rounded-xl border border-border shadow-xl overflow-hidden w-[320px]">
            
            {/* Status Bar - Compact */}
            <div className="px-3 py-2 bg-muted/50 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Showing</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-foreground truncate">{getDisplayText()}</span>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <span className="text-[10px] text-muted-foreground truncate">{getPreviewText()}</span>
                  </div>
                </div>
                {appliedFilter && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-gold/15 text-brand-gold ml-2">
                    <Check className="w-2.5 h-2.5" />
                    Applied
                  </div>
                )}
              </div>
            </div>

            {/* Mode Tabs - Compact */}
            <div className="px-3 pt-2">
              <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
                {(['year', 'quarter', 'month', 'custom'] as FilterMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                      mode === m 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area - Compact */}
            <div className="p-3">
              
              {/* Year Mode */}
              {mode === 'year' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setYearGridStart(y => y - 12)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-medium text-muted-foreground">
                      {yearGridStart} – {yearGridStart + 11}
                    </span>
                    <button 
                      onClick={() => setYearGridStart(y => y + 12)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1">
                    {years.map((year) => {
                      const isSelected = selectedYear === year;
                      const isCurrent = currentYear === year;
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={cn(
                            "relative py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            isSelected 
                              ? "text-white bg-brand-gold" 
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {year}
                          {isCurrent && !isSelected && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quarter Mode - Multi-select */}
              {mode === 'quarter' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedYear(y => y - 1)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-foreground">{selectedYear}</span>
                    <button 
                      onClick={() => setSelectedYear(y => y + 1)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {QUARTERS.map((q) => {
                      const isSelected = selectedQuarters.includes(q.id);
                      const isCurrent = selectedYear === currentYear && currentQuarter === q.id;
                      return (
                        <button
                          key={q.id}
                          onClick={() => toggleQuarter(q.id)}
                          className={cn(
                            "relative p-2.5 rounded-lg text-left transition-all duration-200 border",
                            isSelected 
                              ? "border-brand-gold bg-brand-gold text-white" 
                              : "border-border hover:border-muted-foreground hover:bg-muted"
                          )}
                        >
                          <div className={cn("text-sm font-bold", isSelected ? "text-white" : "text-foreground")}>
                            {q.label}
                          </div>
                          <div className={cn("text-[10px]", isSelected ? "text-white/70" : "text-muted-foreground")}>
                            {q.months}
                          </div>
                          {isCurrent && !isSelected && (
                            <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-medium bg-brand-gold/20 text-brand-gold">
                              Now
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Click to select multiple quarters</p>
                </div>
              )}

              {/* Month Mode - Multi-select */}
              {mode === 'month' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedYear(y => y - 1)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-foreground">{selectedYear}</span>
                    <button 
                      onClick={() => setSelectedYear(y => y + 1)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1">
                    {MONTHS.map((month, idx) => {
                      const isSelected = selectedMonths.includes(idx);
                      const isCurrent = selectedYear === currentYear && currentMonth === idx;
                      return (
                        <button
                          key={month}
                          onClick={() => toggleMonth(idx)}
                          className={cn(
                            "relative py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            isSelected 
                              ? "text-white bg-brand-gold" 
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {month}
                          {isCurrent && !isSelected && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
                          )}
                          {isSelected && (
                            <div className="absolute top-0.5 right-0.5">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Click to select multiple months</p>
                </div>
              )}

              {/* Custom Mode */}
              {mode === 'custom' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">Start Date</label>
                      <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-background focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-muted-foreground mb-1">End Date</label>
                      <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-background focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions - Compact */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-t border-border">
              <button 
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={handleApply}
                disabled={!canApply()}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                  canApply()
                    ? "text-white bg-brand-gold hover:bg-brand-gold-hover"
                    : "text-muted-foreground bg-muted cursor-not-allowed"
                )}
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
