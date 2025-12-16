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
  value: string | number;
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

const QUICK_ACTIONS = [
  { key: 'thisYear', label: 'This Year' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'last12', label: 'Last 12 Mo' },
  { key: 'next12', label: 'Next 12 Mo' },
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
  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    (appliedFilter?.type === 'quarter' ? String(appliedFilter.value) : null) || currentQuarter
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    appliedFilter?.type === 'month' ? Number(appliedFilter.value) : currentMonth
  );
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

  const getPreviewText = (): string => {
    switch (mode) {
      case 'year':
        return `01 Jan ${selectedYear} – 31 Dec ${selectedYear}`;
      case 'quarter': {
        const qIndex = parseInt(selectedQuarter[1]) - 1;
        const startMonth = MONTHS[qIndex * 3];
        const endMonth = MONTHS[qIndex * 3 + 2];
        return `01 ${startMonth} ${selectedYear} – ${getLastDay(qIndex * 3 + 2, selectedYear)} ${endMonth} ${selectedYear}`;
      }
      case 'month': {
        const lastDay = getLastDay(selectedMonth, selectedYear);
        return `01 ${MONTHS[selectedMonth]} ${selectedYear} – ${lastDay} ${MONTHS[selectedMonth]} ${selectedYear}`;
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
      case 'quarter':
        return `${appliedFilter.value} ${appliedFilter.year}`;
      case 'month':
        return `${MONTHS[Number(appliedFilter.value)]} ${appliedFilter.year}`;
      case 'custom':
        return 'Custom Range';
      default:
        return 'Select Range';
    }
  };

  const handleApply = () => {
    const filter: AppliedDateFilter = {
      type: mode,
      year: selectedYear,
      value: mode === 'year' ? selectedYear : mode === 'quarter' ? selectedQuarter : selectedMonth,
    };
    
    if (mode === 'custom' && customStartDate && customEndDate) {
      filter.startDate = customStartDate;
      filter.endDate = customEndDate;
    }
    
    onApplyFilter(filter);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearFilter();
    setSelectedYear(currentYear);
    setSelectedQuarter(currentQuarter);
    setSelectedMonth(currentMonth);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'thisYear':
        setMode('year');
        setSelectedYear(currentYear);
        break;
      case 'thisQuarter':
        setMode('quarter');
        setSelectedYear(currentYear);
        setSelectedQuarter(currentQuarter);
        break;
      case 'thisMonth':
        setMode('month');
        setSelectedYear(currentYear);
        setSelectedMonth(currentMonth);
        break;
      case 'last12':
      case 'next12':
        // These would set custom date range
        setMode('custom');
        const now = new Date();
        if (action === 'last12') {
          const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          setCustomStartDate(start.toISOString().split('T')[0]);
          setCustomEndDate(now.toISOString().split('T')[0]);
        } else {
          const end = new Date(now.getFullYear() + 1, now.getMonth(), 0);
          setCustomStartDate(now.toISOString().split('T')[0]);
          setCustomEndDate(end.toISOString().split('T')[0]);
        }
        break;
    }
  };

  const years = Array.from({ length: 12 }, (_, i) => yearGridStart + i);

  const getDisplayText = (): string => {
    if (mode === 'year') return String(selectedYear);
    if (mode === 'quarter') return `${selectedQuarter} ${selectedYear}`;
    if (mode === 'month') return `${MONTHS[selectedMonth]} ${selectedYear}`;
    return 'Custom';
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200",
          isOpen 
            ? "bg-brand-dark text-white border-brand-dark shadow-lg" 
            : "bg-background text-foreground border-border hover:border-muted-foreground hover:shadow-md"
        )}
      >
        <Calendar className="w-4 h-4" />
        <span className="font-medium text-sm">{getAppliedLabel()}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50">
          {/* Arrow */}
          <div className="absolute -top-2 right-8 w-4 h-4 bg-background rotate-45 border-l border-t border-border" />
          
          <div className="bg-background rounded-2xl border border-border shadow-2xl overflow-hidden w-[380px]">
            
            {/* Status Bar */}
            <div className="px-5 py-4 bg-muted/50 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Showing</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-foreground">{getDisplayText()}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{getPreviewText()}</span>
                  </div>
                </div>
                {appliedFilter && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-brand-gold/15 text-brand-gold">
                    <Check className="w-3 h-3" />
                    Applied
                  </div>
                )}
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="px-5 pt-4">
              <div className="flex gap-1 p-1 bg-muted rounded-xl">
                {(['year', 'quarter', 'month', 'custom'] as FilterMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
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

            {/* Content Area */}
            <div className="p-5">
              
              {/* Year Mode */}
              {mode === 'year' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setYearGridStart(y => y - 12)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-muted-foreground">
                      {yearGridStart} – {yearGridStart + 11}
                    </span>
                    <button 
                      onClick={() => setYearGridStart(y => y + 12)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {years.map((year) => {
                      const isSelected = selectedYear === year;
                      const isCurrent = currentYear === year;
                      return (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={cn(
                            "relative py-3 rounded-xl text-sm font-medium transition-all duration-200",
                            isSelected 
                              ? "text-white shadow-lg bg-brand-gold" 
                              : "text-foreground hover:bg-muted"
                          )}
                          style={isSelected ? { boxShadow: '0 4px 14px hsl(var(--brand-gold) / 0.4)' } : {}}
                        >
                          {year}
                          {isCurrent && !isSelected && (
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quarter Mode */}
              {mode === 'quarter' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedYear(y => y - 1)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold text-foreground">{selectedYear}</span>
                    <button 
                      onClick={() => setSelectedYear(y => y + 1)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {QUARTERS.map((q) => {
                      const isSelected = selectedQuarter === q.id;
                      const isCurrent = selectedYear === currentYear && currentQuarter === q.id;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setSelectedQuarter(q.id)}
                          className={cn(
                            "relative p-4 rounded-xl text-left transition-all duration-200 border-2",
                            isSelected 
                              ? "border-brand-gold bg-brand-gold text-white" 
                              : "border-border hover:border-muted-foreground hover:bg-muted"
                          )}
                        >
                          <div className={cn("text-lg font-bold", isSelected ? "text-white" : "text-foreground")}>
                            {q.label}
                          </div>
                          <div className={cn("text-xs mt-1", isSelected ? "text-white/70" : "text-muted-foreground")}>
                            {q.months} {selectedYear}
                          </div>
                          {isCurrent && !isSelected && (
                            <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-gold/20 text-brand-gold">
                              Now
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month Mode */}
              {mode === 'month' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedYear(y => y - 1)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold text-foreground">{selectedYear}</span>
                    <button 
                      onClick={() => setSelectedYear(y => y + 1)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-2">
                    {MONTHS.map((month, idx) => {
                      const isSelected = selectedMonth === idx;
                      const isCurrent = selectedYear === currentYear && currentMonth === idx;
                      return (
                        <button
                          key={month}
                          onClick={() => setSelectedMonth(idx)}
                          className={cn(
                            "relative py-3 rounded-xl text-sm font-medium transition-all duration-200",
                            isSelected 
                              ? "text-white shadow-lg bg-brand-gold" 
                              : "text-foreground hover:bg-muted"
                          )}
                          style={isSelected ? { boxShadow: '0 4px 14px hsl(var(--brand-gold) / 0.4)' } : {}}
                        >
                          {month}
                          {isCurrent && !isSelected && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Mode */}
              {mode === 'custom' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Start Date</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border text-sm bg-background focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">End Date</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border text-sm bg-background focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {customStartDate && customEndDate && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">{customStartDate} – {customEndDate}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-5 pb-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-border" />

            {/* Fiscal Toggle (Future) */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-4 h-4 rounded-full border-2 border-foreground flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-foreground" />
                  </div>
                  <span className="text-foreground font-medium">Calendar Year</span>
                </label>
                <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                  <span className="text-muted-foreground">Fiscal Year</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">Soon</span>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-5 py-4 bg-muted/50 border-t border-border">
              <button 
                onClick={handleClear}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={handleApply}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-gold hover:bg-brand-gold-hover transition-all duration-200 shadow-lg"
                style={{ boxShadow: '0 4px 14px hsl(var(--brand-gold) / 0.3)' }}
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
