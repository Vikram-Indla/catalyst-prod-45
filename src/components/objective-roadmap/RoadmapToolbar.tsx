import React, { useState, useRef, useEffect } from 'react';
import { Scale, GroupBy, Theme, Owner } from '@/types/objective-roadmap';
import { FilterState, ProgressRange, KRCondition } from '@/types/canonical-roadmap-filters';
import { Search, Layers, Filter, ChevronDown, Check, X } from 'lucide-react';
import { SmartFiltersPanel } from './SmartFiltersPanel';
import { RoadmapDateFilterV2, RoadmapViewport } from '@/components/roadmaps/RoadmapDateFilterV2';
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
  appliedViewport: RoadmapViewport;
  onApplyViewport: (viewport: RoadmapViewport) => void;
  
  // Canonical filter props
  draftFilters: FilterState;
  activeFilterCount: number;
  onToggleStatus: (status: string) => void;
  onToggleTheme: (themeId: string) => void;
  onToggleOwner: (ownerId: string) => void;
  onToggleProgressRange: (range: ProgressRange) => void;
  onToggleKRCondition: (condition: KRCondition) => void;
  onOpenFilters: () => void;
  onApplyFilters: () => void;
  onCancelFilters: () => void;
  onClearAll: () => void;
  
  themes: Theme[];
  owners: Owner[];
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
  appliedViewport,
  onApplyViewport,
  draftFilters,
  activeFilterCount,
  onToggleStatus,
  onToggleTheme,
  onToggleOwner,
  onToggleProgressRange,
  onToggleKRCondition,
  onOpenFilters,
  onApplyFilters,
  onCancelFilters,
  onClearAll,
  themes,
  owners,
  matchingObjectives,
}) => {
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const groupByRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (groupByRef.current && !groupByRef.current.contains(e.target as Node)) {
        setGroupByOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        // On click outside, cancel and close
        if (filtersOpen) {
          onCancelFilters();
          setFiltersOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filtersOpen, onCancelFilters]);
  
  // Handle viewport changes - sync scale with parent
  const handleViewportApply = (viewport: RoadmapViewport) => {
    onApplyViewport(viewport);
    // Also sync scale to parent's scale state
    if (viewport.scale !== scale) {
      onScaleChange(viewport.scale);
    }
  };
  
  // Handle opening filters panel
  const handleOpenFilters = () => {
    onOpenFilters(); // Sync draft = applied
    setFiltersOpen(true);
  };
  
  // Handle apply filters
  const handleApplyFilters = () => {
    onApplyFilters();
    setFiltersOpen(false);
  };
  
  // Handle cancel filters
  const handleCancelFilters = () => {
    onCancelFilters();
    setFiltersOpen(false);
  };
  
  // Handle clear all (global reset)
  const handleClearAll = () => {
    onClearAll();
    setFiltersOpen(false);
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
            onClick={handleOpenFilters}
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
              draftFilters={draftFilters}
              onToggleStatus={onToggleStatus}
              onToggleTheme={onToggleTheme}
              onToggleOwner={onToggleOwner}
              onToggleProgressRange={onToggleProgressRange}
              onToggleKRCondition={onToggleKRCondition}
              onApply={handleApplyFilters}
              onCancel={handleCancelFilters}
              onClearAll={handleClearAll}
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
        
        {/* Date Range Filter V2 */}
        <RoadmapDateFilterV2
          appliedViewport={appliedViewport}
          onApply={handleViewportApply}
        />
      </div>
    </div>
  );
};
