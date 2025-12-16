import React, { useState, useRef, useEffect } from 'react';
import { Scale, GroupBy, ActiveFilters, Theme, Owner } from '@/types/objective-roadmap';
import { DATE_FILTER_PRESETS, countActiveFilters } from '@/utils/objective-roadmap-utils';
import { Search, Layers, Filter, Calendar, Clock, ChevronDown, Check, X } from 'lucide-react';
import { SmartFiltersPanel } from './SmartFiltersPanel';
import { cn } from '@/lib/utils';

interface RoadmapToolbarProps {
  scale: Scale;
  onScaleChange: (scale: Scale) => void;
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  showMilestones: boolean;
  onToggleMilestones: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStartDate: string;
  filterEndDate: string;
  onApplyDateFilter: (start: string, end: string) => void;
  onScrollToToday: () => void;
  activeFilters: ActiveFilters;
  onApplyFilters: (filters: ActiveFilters) => void;
  onClearFilters: () => void;
  themes: Theme[];
  owners: Owner[];
  totalObjectives: number;
  matchingObjectives: number;
}

export const RoadmapToolbar: React.FC<RoadmapToolbarProps> = ({
  scale,
  onScaleChange,
  groupBy,
  onGroupByChange,
  showMilestones,
  onToggleMilestones,
  searchQuery,
  onSearchChange,
  filterStartDate,
  filterEndDate,
  onApplyDateFilter,
  onScrollToToday,
  activeFilters,
  onApplyFilters,
  onClearFilters,
  themes,
  owners,
  matchingObjectives,
}) => {
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(filterStartDate);
  const [tempEndDate, setTempEndDate] = useState(filterEndDate);
  const [activePreset, setActivePreset] = useState('year');
  
  const groupByRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const activeFilterCount = countActiveFilters(activeFilters);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (groupByRef.current && !groupByRef.current.contains(e.target as Node)) {
        setGroupByOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handlePresetClick = (preset: typeof DATE_FILTER_PRESETS[0]) => {
    setActivePreset(preset.key);
    setTempStartDate(preset.start);
    setTempEndDate(preset.end);
  };
  
  const handleCalendarApply = () => {
    onApplyDateFilter(tempStartDate, tempEndDate);
    setCalendarOpen(false);
  };
  
  const handleCalendarReset = () => {
    setTempStartDate('2025-01-01');
    setTempEndDate('2025-12-31');
    setActivePreset('year');
  };
  
  const groupByOptions: { key: GroupBy; label: string }[] = [
    { key: 'theme', label: 'Theme' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'none', label: 'None' },
  ];
  
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-1">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-gold"
            placeholder="Search objectives..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {/* Group By */}
        <div className="relative" ref={groupByRef}>
          <button 
            className="h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted"
            onClick={() => setGroupByOpen(!groupByOpen)}
          >
            <Layers size={16} />
            Group by
            <ChevronDown size={12} />
          </button>
          {groupByOpen && (
            <div className="absolute top-full mt-1 left-0 w-40 py-1 bg-background border border-border rounded-lg shadow-lg z-50">
              {groupByOptions.map(opt => (
                <div
                  key={opt.key}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                    groupBy === opt.key && "text-brand-gold"
                  )}
                  onClick={() => { onGroupByChange(opt.key); setGroupByOpen(false); }}
                >
                  {opt.label}
                  {groupBy === opt.key && <Check size={16} className="text-brand-gold" />}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Smart Filters */}
        <div className="relative" ref={filtersRef}>
          <button 
            className={cn(
              "h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted",
              activeFilterCount > 0 && "border-brand-gold text-brand-gold"
            )}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-brand-gold text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filtersOpen && (
            <SmartFiltersPanel
              activeFilters={activeFilters}
              onApplyFilters={(filters) => { onApplyFilters(filters); setFiltersOpen(false); }}
              onClearFilters={onClearFilters}
              onClose={() => setFiltersOpen(false)}
              themes={themes}
              owners={owners}
              matchingCount={matchingObjectives}
            />
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Milestones Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Milestones</span>
          <div 
            className={cn(
              "w-10 h-5 rounded-full cursor-pointer transition-colors relative",
              showMilestones ? "bg-brand-gold" : "bg-muted"
            )}
            onClick={onToggleMilestones}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
              showMilestones ? "translate-x-5" : "translate-x-0.5"
            )} />
          </div>
        </div>
        
        <div className="w-px h-6 bg-border" />
        
        {/* Scale Toggle */}
        <div className="flex bg-muted rounded-lg p-0.5">
          {(['monthly', 'quarterly', 'yearly'] as Scale[]).map(s => (
            <button
              key={s}
              className={cn(
                "w-8 h-7 flex items-center justify-center text-xs font-medium rounded-md transition-colors",
                scale === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onScaleChange(s)}
            >
              {s.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
        
        {/* Calendar Filter */}
        <div className="relative" ref={calendarRef}>
          <button 
            className="w-9 h-9 flex items-center justify-center border border-border rounded-lg bg-background hover:bg-muted"
            onClick={() => setCalendarOpen(!calendarOpen)}
            title="Date Filter"
          >
            <Calendar size={16} />
          </button>
          {calendarOpen && (
            <div className="absolute top-full mt-1 right-0 w-80 bg-background border border-border rounded-lg shadow-xl z-50">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Date Range Filter</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Quick Select</div>
                  <div className="grid grid-cols-4 gap-2">
                    {DATE_FILTER_PRESETS.map(preset => (
                      <button
                        key={preset.key}
                        className={cn(
                          "px-2 py-1.5 text-xs border rounded-md transition-colors",
                          activePreset === preset.key 
                            ? "bg-brand-gold/15 border-brand-gold text-brand-gold" 
                            : "border-border text-muted-foreground hover:border-brand-gold"
                        )}
                        onClick={() => handlePresetClick(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Custom Range</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      className="flex-1 h-9 px-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-brand-gold"
                      value={tempStartDate}
                      onChange={(e) => { setTempStartDate(e.target.value); setActivePreset(''); }}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                      type="date"
                      className="flex-1 h-9 px-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-brand-gold"
                      value={tempEndDate}
                      onChange={(e) => { setTempEndDate(e.target.value); setActivePreset(''); }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/50">
                <button 
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-background"
                  onClick={handleCalendarReset}
                >
                  Reset
                </button>
                <button 
                  className="px-4 py-1.5 text-sm font-medium bg-brand-gold text-white rounded-md hover:bg-brand-gold-hover"
                  onClick={handleCalendarApply}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Today Button */}
        <button 
          className="w-9 h-9 flex items-center justify-center border border-border rounded-lg bg-background hover:bg-muted"
          onClick={onScrollToToday}
          title="Jump to Today"
        >
          <Clock size={16} />
        </button>
      </div>
    </div>
  );
};
