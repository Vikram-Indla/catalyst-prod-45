// RoadmapToolbar.tsx — Toolbar row for ExecutiveRoadmap

import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ads';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  Clock,
  Filter,
  Calendar,
  Download,
  Info,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import {
  TimeScale,
  Language,
  TimePeriodSelection,
  MONTH_NAMES,
  QUARTER_NAMES,
  AVAILABLE_YEARS,
  TRANSLATIONS,
  currentYear,
} from './roadmapConstants';
import { getWeeksForMonth } from './roadmapTimeUtils';

interface RoadmapToolbarProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  timeScale: TimeScale;
  setTimeScale: (scale: TimeScale) => void;
  timePeriodSelection: TimePeriodSelection;
  showMilestones: boolean;
  setShowMilestones: (v: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  showLegend: boolean;
  setShowLegend: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isRTL: boolean;
  setFiltersDialogOpen: (v: boolean) => void;
  handleExport: () => void;
  toggleYear: (year: number) => void;
  toggleMonth: (month: number) => void;
  toggleQuarter: (quarter: number) => void;
  toggleWeek: (week: number) => void;
  selectWeeklyMonth: (month: number) => void;
  toggleAllMonths: () => void;
  toggleAllQuarters: () => void;
  toggleAllWeeksInMonth: () => void;
  availableWeeksForSelectedMonth: { week: number; startDate: Date; label: string }[];
}

export function RoadmapToolbar({
  language,
  setLanguage,
  timeScale,
  setTimeScale,
  timePeriodSelection,
  showMilestones,
  setShowMilestones,
  isFullscreen,
  toggleFullscreen,
  showLegend,
  setShowLegend,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  isRTL,
  setFiltersDialogOpen,
  handleExport,
  toggleYear,
  toggleMonth,
  toggleQuarter,
  toggleWeek,
  selectWeeklyMonth,
  toggleAllMonths,
  toggleAllQuarters,
  toggleAllWeeksInMonth,
  availableWeeksForSelectedMonth,
}: RoadmapToolbarProps) {
  const t = TRANSLATIONS[language];

  return (
    <div
      className="h-[52px] flex items-center justify-between px-6 print:hidden shrink-0 relative z-[100]"
      style={{
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--divider)'
      }}
    >
      {/* Left - Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={isRTL ? 'بحث...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-[200px] text-xs bg-white dark:bg-[#1A1A1A] dark:text-[#EDEDED] pl-9 pr-3"
          style={{ border: '1px solid hsl(var(--roadmap-sandstone))', borderRadius: '12px' }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('');
            }
          }}
        />
      </div>

      {/* Right - Toolbar */}
      <div className="inline-flex items-center gap-1.5 relative z-[100]" style={{ direction: 'ltr' }}>

        {/* Milestones Toggle */}
        <Tooltip delay={200} position="bottom" content="Milestones">
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all shadow-sm hover:shadow-md",
              showMilestones ? "text-white" : "bg-white dark:bg-[#1A1A1A] text-[hsl(var(--roadmap-charcoal))]"
            )}
            style={{
              backgroundColor: showMilestones ? 'hsl(var(--roadmap-status-new))' : undefined,
              border: showMilestones ? 'none' : '1px solid hsl(var(--roadmap-sandstone))'
            }}
          >
            <Clock className="w-[18px] h-[18px]" />
          </button>
        </Tooltip>

        <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

        {/* Filter */}
        <Tooltip delay={200} position="bottom" content="Filters">
          <button
            onClick={() => setFiltersDialogOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white dark:bg-[#1A1A1A] shadow-sm hover:shadow-md"
            style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
          >
            <Filter className="w-[18px] h-[18px]" />
          </button>
        </Tooltip>

        {/* Time Period Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white dark:bg-[#1A1A1A] shadow-sm hover:shadow-md"
              style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
              title="Time Period"
            >
              <Calendar className="w-[18px] h-[18px]" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[360px] p-0 bg-white dark:bg-[#1A1A1A] shadow-xl rounded-xl z-[400]"
            style={{ border: '1px solid hsl(var(--roadmap-sandstone))' }}
          >
            {/* View Scale Section */}
            <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
              <div className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                {t.viewScale}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['weekly', 'monthly', 'quarterly', 'yearly'] as TimeScale[]).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setTimeScale(scale)}
                    className={cn(
                      "px-2 py-2.5 text-xs font-medium rounded-lg transition-all",
                      timeScale === scale
                        ? "text-white"
                        : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                    )}
                    style={{
                      backgroundColor: timeScale === scale ? 'hsl(var(--roadmap-status-new))' : undefined,
                      color: timeScale === scale ? 'white' : 'hsl(var(--roadmap-charcoal))'
                    }}
                  >
                    {t[scale]}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Selection - Always Visible */}
            <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
              <div className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                {t.selectYears}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {AVAILABLE_YEARS.map(year => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={cn(
                      "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                      timePeriodSelection.years.includes(year)
                        ? "text-white"
                        : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                    )}
                    style={{
                      backgroundColor: timePeriodSelection.years.includes(year) ? 'hsl(var(--roadmap-status-new))' : undefined,
                      color: timePeriodSelection.years.includes(year) ? 'white' : 'hsl(var(--roadmap-charcoal))'
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* MONTHLY Scale: Show Months ONLY */}
            {timeScale === 'monthly' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                    {t.selectMonths}
                  </div>
                  <button onClick={toggleAllMonths} className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--roadmap-status-new))' }}>
                    {timePeriodSelection.months.length === 12 ? 'Clear' : t.allMonths}
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {MONTH_NAMES.map((month, index) => {
                    const isSelected = timePeriodSelection.months.length === 0 || timePeriodSelection.months.includes(index);
                    return (
                      <button
                        key={month}
                        onClick={() => toggleMonth(index)}
                        className={cn(
                          "px-1 py-2 text-xs font-medium rounded-lg transition-all",
                          isSelected ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                        )}
                        style={{
                          backgroundColor: isSelected ? 'hsl(var(--roadmap-status-new))' : undefined,
                          color: isSelected ? 'white' : 'hsl(var(--roadmap-fossil))'
                        }}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QUARTERLY Scale: Show Quarters ONLY */}
            {timeScale === 'quarterly' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                    {t.selectQuarters}
                  </div>
                  <button onClick={toggleAllQuarters} className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--roadmap-status-new))' }}>
                    {timePeriodSelection.quarters.length === 4 ? 'Clear' : t.allQuarters}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUARTER_NAMES.map((quarter, index) => {
                    const isSelected = timePeriodSelection.quarters.length === 0 || timePeriodSelection.quarters.includes(index);
                    return (
                      <button
                        key={quarter}
                        onClick={() => toggleQuarter(index)}
                        className={cn(
                          "px-3 py-2.5 text-xs font-medium rounded-lg transition-all",
                          isSelected ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                        )}
                        style={{
                          backgroundColor: isSelected ? 'hsl(var(--roadmap-status-new))' : undefined,
                          color: isSelected ? 'white' : 'hsl(var(--roadmap-charcoal))'
                        }}
                      >
                        {quarter}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEKLY Scale: Show Months FIRST, then Weeks AFTER month selection */}
            {timeScale === 'weekly' && (
              <div className="p-4">
                {/* Step 1: Select Month */}
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                    {t.selectMonths}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {MONTH_NAMES.map((month, index) => {
                      const isSelected = timePeriodSelection.weeklyMonth === index;
                      return (
                        <button
                          key={month}
                          onClick={() => selectWeeklyMonth(index)}
                          className={cn(
                            "px-1 py-2 text-xs font-medium rounded-lg transition-all",
                            isSelected ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                          )}
                          style={{
                            backgroundColor: isSelected ? 'hsl(var(--roadmap-status-new))' : undefined,
                            color: isSelected ? 'white' : 'hsl(var(--roadmap-fossil))'
                          }}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Select Weeks (only visible after month is selected) */}
                {timePeriodSelection.weeklyMonth !== null && availableWeeksForSelectedMonth.length > 0 && (
                  <div className="pt-3 border-t" style={{ borderColor: 'hsl(var(--roadmap-sandstone))' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-semibold" style={{ color: 'hsl(var(--roadmap-graphite))' }}>
                        {t.selectWeeks} ({MONTH_NAMES[timePeriodSelection.weeklyMonth]})
                      </div>
                      <button
                        onClick={toggleAllWeeksInMonth}
                        className="text-xs font-medium hover:underline"
                        style={{ color: 'hsl(var(--roadmap-status-new))' }}
                      >
                        {timePeriodSelection.weeks.length === availableWeeksForSelectedMonth.length ? 'Clear' : t.allWeeks}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {availableWeeksForSelectedMonth.map((weekInfo) => {
                        const isSelected = timePeriodSelection.weeks.includes(weekInfo.week);
                        return (
                          <button
                            key={weekInfo.week}
                            onClick={() => toggleWeek(weekInfo.week)}
                            className={cn(
                              "px-2 py-2 text-xs font-medium rounded-lg transition-all",
                              isSelected ? "text-white" : "bg-[hsl(var(--roadmap-parchment))] hover:bg-[hsl(var(--roadmap-sandstone))]"
                            )}
                            style={{
                              backgroundColor: isSelected ? 'hsl(var(--roadmap-status-new))' : undefined,
                              color: isSelected ? 'white' : 'hsl(var(--roadmap-fossil))'
                            }}
                          >
                            {weekInfo.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hint when no month selected */}
                {timePeriodSelection.weeklyMonth === null && (
                  <div className="text-xs text-center py-2" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                    Select a month to view its weeks
                  </div>
                )}
              </div>
            )}

            {/* YEARLY Scale: No additional selection needed */}
            {timeScale === 'yearly' && (
              <div className="p-4">
                <div className="text-xs text-center py-4" style={{ color: 'hsl(var(--roadmap-fossil))' }}>
                  Showing selected year(s) only
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="h-9 px-2 flex items-center gap-1 rounded-[10px] cursor-pointer transition-all bg-white dark:bg-[#1A1A1A] shadow-sm hover:shadow-md"
          style={{ border: '1px solid hsl(var(--roadmap-sandstone))' }}
        >
          <span className={cn("text-xs font-semibold px-1 py-0.5 rounded", language === 'en' ? "text-white" : "")} style={{ backgroundColor: language === 'en' ? 'hsl(var(--roadmap-status-new))' : 'transparent', color: language === 'en' ? 'white' : 'hsl(var(--roadmap-charcoal))' }}>EN</span>
          <span className={cn("text-xs font-semibold px-1 py-0.5 rounded", language === 'ar' ? "text-white" : "")} style={{ backgroundColor: language === 'ar' ? 'hsl(var(--roadmap-status-new))' : 'transparent', color: language === 'ar' ? 'white' : 'hsl(var(--roadmap-charcoal))' }}>ع</span>
        </button>

        <div className="w-px h-6 mx-1" style={{ backgroundColor: 'hsl(var(--roadmap-driftwood))' }} />

        {/* Export */}
        <Tooltip delay={200} position="bottom" content="Export">
          <button
            onClick={handleExport}
            className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white dark:bg-[#1A1A1A] shadow-sm hover:shadow-md"
            style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
          >
            <Download className="w-[18px] h-[18px]" />
          </button>
        </Tooltip>

        {/* Legend Toggle */}
        <Tooltip delay={200} position="bottom" content="Legend">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all shadow-sm hover:shadow-md",
              showLegend ? "text-white" : "bg-white dark:bg-[#1A1A1A] text-[hsl(var(--roadmap-charcoal))]"
            )}
            style={{
              backgroundColor: showLegend ? 'hsl(var(--roadmap-status-new))' : undefined,
              border: showLegend ? 'none' : '1px solid hsl(var(--roadmap-sandstone))'
            }}
          >
            <Info className="w-[18px] h-[18px]" />
          </button>
        </Tooltip>

        {/* Fullscreen Toggle */}
        <Tooltip delay={200} position="bottom" content={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 flex items-center justify-center rounded-[10px] cursor-pointer transition-all bg-white dark:bg-[#1A1A1A] shadow-sm hover:shadow-md"
            style={{ border: '1px solid hsl(var(--roadmap-sandstone))', color: 'hsl(var(--roadmap-charcoal))' }}
          >
            {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
