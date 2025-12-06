import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORM_INFO, STAGE_NAMES } from '@/data/roadmapSeed';

export type SmartFilterType = 'inProgress' | 'highPriority' | 'upcoming' | 'blocked' | 'currentQuarter' | null;

export interface RoadmapFilters {
  activePlatformFilter?: string | null;
  platform?: string;
  status?: string;
  owner?: string;
  sortField?: string;
  showMilestones?: boolean;
}

interface RoadmapFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: RoadmapFilters;
  onFiltersChange: (filters: RoadmapFilters) => void;
  uniqueOwners: string[];
}

// Platform-based quick filters
const PLATFORM_QUICK_FILTERS = Object.keys(PLATFORM_INFO).map(key => ({
  id: key,
  label: key,
  tooltip: `Filter by ${key}`
}));

export function RoadmapFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  uniqueOwners,
}: RoadmapFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<RoadmapFilters>(filters);
  const [expandedSections, setExpandedSections] = useState({
    filters: true,
  });

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handlePlatformFilterClick = (platformId: string) => {
    if (localFilters.activePlatformFilter === platformId) {
      setLocalFilters({ ...localFilters, activePlatformFilter: null, platform: 'all' });
      return;
    }

    setLocalFilters(prev => ({ 
      ...prev, 
      activePlatformFilter: platformId,
      platform: platformId 
    }));
  };

  const updateFilter = <K extends keyof RoadmapFilters>(key: K, value: RoadmapFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value, activeSmartFilter: null }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setLocalFilters({
      activePlatformFilter: null,
      platform: 'all',
      status: 'all',
      owner: 'all',
      sortField: 'rank',
      showMilestones: true,
    });
  };

  const countActiveFilters = () => {
    let count = 0;
    if (localFilters.activePlatformFilter) count++;
    if (localFilters.platform && localFilters.platform !== 'all' && !localFilters.activePlatformFilter) count++;
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.owner && localFilters.owner !== 'all') count++;
    return count;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-white [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold text-foreground">Filters</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Quick Filters - Platform based */}
          <div className="px-6 py-4 border-b border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Filters</div>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_QUICK_FILTERS.map((pf) => (
                  <Tooltip key={pf.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                          localFilters.activePlatformFilter === pf.id
                            ? "bg-brand-gold text-white border-brand-gold"
                            : "bg-white text-foreground border-border hover:bg-muted/50"
                        )}
                        onClick={() => handlePlatformFilterClick(pf.id)}
                      >
                        {pf.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                      {pf.tooltip}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Filters Section */}
          <Collapsible open={expandedSections.filters} onOpenChange={() => toggleSection('filters')}>
            <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-3 border-b border-border hover:bg-muted/30">
              <span className="text-sm font-medium text-foreground">Filters</span>
              <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", !expandedSections.filters && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 py-4 space-y-4 border-b border-border">
                <div className="grid grid-cols-2 gap-4">
                  {/* Platform */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform</label>
                    <Select value={localFilters.platform || 'all'} onValueChange={(v) => updateFilter('platform', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="all">All Platforms</SelectItem>
                        {Object.keys(PLATFORM_INFO).map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                    <Select value={localFilters.status || 'all'} onValueChange={(v) => updateFilter('status', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.entries(STAGE_NAMES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Owner */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Owner</label>
                    <Select value={localFilters.owner || 'all'} onValueChange={(v) => updateFilter('owner', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="all">All Owners</SelectItem>
                        {uniqueOwners.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sort By</label>
                    <Select value={localFilters.sortField || 'rank'} onValueChange={(v) => updateFilter('sortField', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="rank">Rank</SelectItem>
                        <SelectItem value="platform">Platform</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">
            <span className="text-brand-gold font-medium">{countActiveFilters()}</span> filters applied
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClearAll}>Clear All</Button>
            <Button onClick={handleApply} className="bg-brand-gold hover:bg-brand-gold-hover text-white">Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
