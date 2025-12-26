// Enterprise Roadmap Toolbar

import { Search, Filter, Calendar, Flag, Download, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeScale } from './types';

interface RoadmapToolbarProps {
  timeScale: TimeScale;
  onTimeScaleChange: (scale: TimeScale) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showMilestones: boolean;
  onToggleMilestones: () => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onTodayClick: () => void;
  onExportClick: () => void;
  onFullscreenClick: () => void;
}

export function RoadmapToolbar({
  timeScale,
  onTimeScaleChange,
  searchQuery,
  onSearchChange,
  showMilestones,
  onToggleMilestones,
  selectedYear,
  onYearChange,
  onTodayClick,
  onExportClick,
  onFullscreenClick,
}: RoadmapToolbarProps) {
  return (
    <div className={cn(
      "flex items-center justify-between px-6 py-3",
      "bg-white dark:bg-[#161B22]",
      "border-b border-[#E1E4E8] dark:border-[#30363D]"
    )}>
      {/* Left Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg w-64",
          "bg-[#FAFBFC] dark:bg-[#0D1117]",
          "border border-[#E1E4E8] dark:border-[#30363D]",
          "focus-within:border-[#C69C6D] focus-within:ring-1 focus-within:ring-[rgba(198,156,109,0.3)]"
        )}>
          <Search size={16} className="text-[#8B949E] dark:text-[#6E7681]" />
          <input 
            type="text"
            placeholder="Search themes, objectives..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "flex-1 bg-transparent text-sm outline-none",
              "text-[#24292F] dark:text-[#E6EDF3]",
              "placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681]"
            )}
          />
        </div>

        {/* Time Scale Toggle */}
        <div className={cn(
          "inline-flex rounded-lg p-1",
          "bg-[#F6F8FA] dark:bg-[#21262D]",
          "border border-[#E1E4E8] dark:border-[#30363D]"
        )}>
          {(['monthly', 'quarterly', 'yearly'] as TimeScale[]).map((scale) => (
            <button 
              key={scale}
              onClick={() => onTimeScaleChange(scale)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                timeScale === scale 
                  ? "bg-white dark:bg-[#30363D] text-[#24292F] dark:text-[#E6EDF3] shadow-sm"
                  : "text-[#57606A] dark:text-[#8B949E] hover:text-[#24292F] dark:hover:text-[#E6EDF3]"
              )}
            >
              {scale}
            </button>
          ))}
        </div>

        {/* Filter Button */}
        <button className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          "bg-white dark:bg-[#161B22]",
          "border border-[#E1E4E8] dark:border-[#30363D]",
          "text-[#57606A] dark:text-[#8B949E]",
          "hover:border-[rgba(198,156,109,0.3)]"
        )}>
          <Filter size={16} />
          Filters
        </button>

        {/* Year Picker */}
        <button className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          "bg-white dark:bg-[#161B22]",
          "border border-[#E1E4E8] dark:border-[#30363D]",
          "text-[#57606A] dark:text-[#8B949E]",
          "hover:border-[rgba(198,156,109,0.3)]"
        )}>
          <Calendar size={16} />
          {selectedYear}
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Today Button */}
        <button 
          onClick={onTodayClick}
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium",
            "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          )}
        >
          Today
        </button>

        {/* Milestones Toggle */}
        <button 
          onClick={onToggleMilestones}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "bg-white dark:bg-[#161B22]",
            "border border-[#E1E4E8] dark:border-[#30363D]",
            "text-[#57606A] dark:text-[#8B949E]",
            showMilestones && "border-[#C69C6D] bg-[rgba(198,156,109,0.05)]"
          )}
        >
          <Flag size={16} />
          Milestones
        </button>

        {/* Export Button */}
        <button 
          onClick={onExportClick}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "bg-white dark:bg-[#161B22]",
            "border border-[#E1E4E8] dark:border-[#30363D]",
            "text-[#57606A] dark:text-[#8B949E]",
            "hover:border-[rgba(198,156,109,0.3)]"
          )}
        >
          <Download size={16} />
          Export
        </button>

        {/* Fullscreen */}
        <button 
          onClick={onFullscreenClick}
          className={cn(
            "p-2 rounded-lg",
            "bg-white dark:bg-[#161B22]",
            "border border-[#E1E4E8] dark:border-[#30363D]",
            "text-[#57606A] dark:text-[#8B949E]",
            "hover:border-[rgba(198,156,109,0.3)]"
          )}
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}
