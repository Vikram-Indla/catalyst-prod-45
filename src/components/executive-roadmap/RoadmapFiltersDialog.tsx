import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORM_INFO, STAGE_NAMES } from '@/types/roadmapTypes';

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

// Platform-based quick filters - matching Production screenshot
const PLATFORM_QUICK_FILTERS = [
  { id: 'Senaei Platform', label: 'Senaei Platform' },
  { id: 'Innovation Platform', label: 'Innovation Platform' },
  { id: 'Compass', label: 'Compass' },
  { id: 'Tahommena', label: 'Tahommena' },
  { id: 'Mini Apps', label: 'Mini Apps' },
  { id: 'Website', label: 'Website' },
];

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
    setLocalFilters(prev => ({ ...prev, [key]: value }));
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
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.owner && localFilters.owner !== 'all') count++;
    return count;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-white [&>button]:hidden rounded-xl overflow-hidden">
        {/* Header - Matching Production */}
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-foreground">Filters</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </DialogHeader>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Quick Filters - Platform pills matching Production */}
          <div className="px-6 py-4 border-b border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Filters
            </div>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_QUICK_FILTERS.map((pf) => (
                <button
                  key={pf.id}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                    localFilters.activePlatformFilter === pf.id
                      ? "bg-brand-gold text-white border-brand-gold"
                      : "bg-white text-foreground border-border hover:bg-muted/50 hover:border-muted-foreground/30"
                  )}
                  onClick={() => handlePlatformFilterClick(pf.id)}
                >
                  {pf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters Section - Collapsible */}
          <Collapsible open={expandedSections.filters} onOpenChange={() => toggleSection('filters')}>
            <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-3 border-b border-border hover:bg-muted/30 transition-colors">
              <span className="text-sm font-medium text-foreground">Filters</span>
              <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !expandedSections.filters && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 py-4 space-y-4 border-b border-border">
                <div className="grid grid-cols-2 gap-4">
                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                    <Select value={localFilters.status || 'all'} onValueChange={(v) => updateFilter('status', v)}>
                      <SelectTrigger className="h-10 border-border">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[500]">
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
                      <SelectTrigger className="h-10 border-border">
                        <SelectValue placeholder="All Owners" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[500]">
                        <SelectItem value="all">All Owners</SelectItem>
                        {uniqueOwners.filter(Boolean).map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sort By - Full width */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sort By</label>
                  <Select value={localFilters.sortField || 'rank'} onValueChange={(v) => updateFilter('sortField', v)}>
                    <SelectTrigger className="h-10 border-border">
                      <SelectValue placeholder="Rank" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-[500]">
                      <SelectItem value="rank">Rank</SelectItem>
                      <SelectItem value="platform">Platform</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Footer - Matching Production */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <span className="text-sm text-muted-foreground">
            <span className="text-brand-gold font-semibold">{countActiveFilters()}</span> filters applied
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleClearAll}
              className="h-9 px-4 text-sm font-medium"
            >
              Clear All
            </Button>
            <Button 
              onClick={handleApply} 
              className="h-9 px-5 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}