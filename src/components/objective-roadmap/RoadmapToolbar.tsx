import React, { useState, useRef, useEffect } from 'react';
import { Scale, GroupBy, Theme, Owner } from '@/types/objective-roadmap';
import { FilterState, ProgressRange, KRCondition } from '@/types/canonical-roadmap-filters';
import { Search, Layers, Filter, ChevronDown, Check, X, Info } from 'lucide-react';
import { RoadmapDateFilterV2, RoadmapViewport } from '@/components/roadmaps/RoadmapDateFilterV2';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  EnterpriseRoadmapFiltersDialog, 
  EnterpriseFilters, 
  DEFAULT_ENTERPRISE_FILTERS,
  getCurrentQuarterDates,
  getNextQuarterDates,
} from './EnterpriseRoadmapFiltersDialog';

interface RoadmapToolbarProps {
  scale: Scale;
  onScaleChange: (scale: Scale) => void;
  groupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
  showMilestones: boolean;
  onToggleMilestones: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Viewport (now staged)
  appliedViewport: RoadmapViewport;
  draftViewport: RoadmapViewport;
  onDraftViewportChange: (viewport: RoadmapViewport) => void;
  
  // Enterprise filters (new dialog-based)
  enterpriseFilters: EnterpriseFilters;
  onEnterpriseFiltersChange: (filters: EnterpriseFilters) => void;
  activeFilterCount: number;
  
  // Apply/Clear handlers
  onApplyFilters: () => void;
  onClearAll: () => void;
  
  themes: Theme[];
  owners: Owner[];
}

export const RoadmapToolbar: React.FC<RoadmapToolbarProps> = ({
  scale,
  onScaleChange,
  groupBy,
  onGroupByChange,
  showMilestones,
  onToggleMilestones,
  showLegend,
  onToggleLegend,
  searchQuery,
  onSearchChange,
  appliedViewport,
  draftViewport,
  onDraftViewportChange,
  enterpriseFilters,
  onEnterpriseFiltersChange,
  activeFilterCount,
  onApplyFilters,
  onClearAll,
  themes,
  owners,
}) => {
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  
  const groupByRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (groupByRef.current && !groupByRef.current.contains(e.target as Node)) {
        setGroupByOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle viewport apply from date filter popover
  const handleViewportApply = () => {
    onApplyFilters();
    if (draftViewport.scale !== scale) {
      onScaleChange(draftViewport.scale);
    }
  };
  
  const groupByOptions: { key: GroupBy; label: string }[] = [
    { key: 'theme', label: 'Theme' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'none', label: 'None' },
  ];
  
  return (
    <>
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-primary"
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
                      groupBy === opt.key && "text-brand-primary"
                    )}
                    onClick={() => { onGroupByChange(opt.key); setGroupByOpen(false); }}
                  >
                    {opt.label}
                    {groupBy === opt.key && <Check size={16} className="text-brand-primary" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Filters Button - Opens Dialog */}
          <button 
            className={cn(
              "h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted",
              activeFilterCount > 0 && "border-brand-primary text-brand-primary"
            )}
            onClick={() => setFiltersDialogOpen(true)}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-brand-primary text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Milestones Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Milestones</span>
            <div 
              className={cn(
                "w-10 h-5 rounded-full cursor-pointer transition-colors relative",
                showMilestones ? "bg-brand-primary" : "bg-muted"
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
          
          {/* Date Range Filter V2 (Controlled) */}
          <RoadmapDateFilterV2
            draftViewport={draftViewport}
            appliedViewport={appliedViewport}
            onDraftChange={onDraftViewportChange}
            onApply={handleViewportApply}
            onClear={onClearAll}
          />
          
          {/* Legend Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "h-9 w-9 flex items-center justify-center border border-border rounded-lg transition-colors",
                    showLegend 
                      ? "bg-brand-primary text-white border-brand-primary" 
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                  onClick={onToggleLegend}
                  aria-pressed={showLegend}
                >
                  <Info size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showLegend ? 'Hide legend' : 'Show legend'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Filters Dialog */}
      <EnterpriseRoadmapFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={enterpriseFilters}
        onFiltersChange={onEnterpriseFiltersChange}
        themes={themes}
        owners={owners}
      />
    </>
  );
};
