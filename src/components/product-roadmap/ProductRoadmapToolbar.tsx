import React, { useState, useRef, useEffect } from 'react';
import { Scale, DemandFilterState, DemandOwner, DEMAND_STATUS_CONFIG } from '@/types/product-roadmap';
import { Search, Filter, ChevronDown, Check, X, Info } from 'lucide-react';
import { RoadmapDateFilterV2, RoadmapViewport } from '@/components/roadmaps/RoadmapDateFilterV2';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductRoadmapToolbarProps {
  scale: Scale;
  onScaleChange: (scale: Scale) => void;
  showMilestones: boolean;
  onToggleMilestones: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Viewport (staged)
  appliedViewport: RoadmapViewport;
  draftViewport: RoadmapViewport;
  onDraftViewportChange: (viewport: RoadmapViewport) => void;
  
  // Canonical filter props
  draftFilters: DemandFilterState;
  activeFilterCount: number;
  onToggleStatus: (status: string) => void;
  onToggleOwner: (ownerId: string) => void;
  onTogglePlatform: (platform: string) => void;
  onOpenFilters: () => void;
  onApplyFilters: () => void;
  onCancelFilters: () => void;
  onClearAll: () => void;
  
  owners: DemandOwner[];
  platforms: string[];
  matchingDemands: number;
}

export const ProductRoadmapToolbar: React.FC<ProductRoadmapToolbarProps> = ({
  scale,
  onScaleChange,
  showMilestones,
  onToggleMilestones,
  showLegend,
  onToggleLegend,
  searchQuery,
  onSearchChange,
  appliedViewport,
  draftViewport,
  onDraftViewportChange,
  draftFilters,
  activeFilterCount,
  onToggleStatus,
  onToggleOwner,
  onTogglePlatform,
  onOpenFilters,
  onApplyFilters,
  onCancelFilters,
  onClearAll,
  owners,
  platforms,
  matchingDemands,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        if (filtersOpen) {
          onCancelFilters();
          setFiltersOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filtersOpen, onCancelFilters]);
  
  const handleOpenFilters = () => {
    onOpenFilters();
    setFiltersOpen(true);
  };
  
  const handleApplyFilters = () => {
    onApplyFilters();
    setFiltersOpen(false);
    if (draftViewport.scale !== scale) {
      onScaleChange(draftViewport.scale);
    }
  };
  
  const handleCancelFilters = () => {
    onCancelFilters();
    setFiltersOpen(false);
  };
  
  const handleClearAll = () => {
    onClearAll();
    setFiltersOpen(false);
  };
  
  const handleViewportApply = () => {
    onApplyFilters();
    if (draftViewport.scale !== scale) {
      onScaleChange(draftViewport.scale);
    }
  };
  
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-1">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-gold"
            placeholder="Search demands..."
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
            <div className="absolute top-full mt-2 left-0 w-80 bg-background border border-border rounded-lg shadow-xl z-50">
              <div className="p-4 space-y-4">
                {/* Status Filter */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</div>
                  <div className="flex flex-wrap gap-2">
                    {DEMAND_STATUS_CONFIG.map(status => (
                      <button
                        key={status.key}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors",
                          draftFilters.status.includes(status.key)
                            ? "bg-brand-gold text-white border-brand-gold"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-brand-gold/50"
                        )}
                        onClick={() => onToggleStatus(status.key)}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Platform Filter */}
                {platforms.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform</div>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map(platform => (
                        <button
                          key={platform}
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors",
                            draftFilters.platforms.includes(platform)
                              ? "bg-brand-gold text-white border-brand-gold"
                              : "bg-muted/50 text-muted-foreground border-border hover:border-brand-gold/50"
                          )}
                          onClick={() => onTogglePlatform(platform)}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Owner Filter */}
                {owners.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owner</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {owners.slice(0, 10).map(owner => (
                        <button
                          key={owner.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted/50",
                            draftFilters.ownerIds.includes(owner.id) && "bg-brand-gold/10"
                          )}
                          onClick={() => onToggleOwner(owner.id)}
                        >
                          <span className="w-5 h-5 flex items-center justify-center text-[9px] font-semibold bg-muted rounded-full">
                            {owner.initials}
                          </span>
                          <span className="flex-1 text-left truncate">{owner.name}</span>
                          {draftFilters.ownerIds.includes(owner.id) && (
                            <Check size={14} className="text-brand-gold" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Matching Count */}
                <div className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                  {matchingDemands} demand{matchingDemands !== 1 ? 's' : ''} match
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    className="flex-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={handleCancelFilters}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-xs font-medium bg-brand-gold text-white rounded-lg hover:bg-brand-gold-hover"
                    onClick={handleApplyFilters}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
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
        
        {/* Date Range Filter */}
        <RoadmapDateFilterV2
          draftViewport={draftViewport}
          appliedViewport={appliedViewport}
          onDraftChange={onDraftViewportChange}
          onApply={handleViewportApply}
          onClear={handleClearAll}
        />
        
        {/* Legend Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "h-9 w-9 flex items-center justify-center border border-border rounded-lg transition-colors",
                  showLegend 
                    ? "bg-brand-gold text-white border-brand-gold" 
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
  );
};
