/**
 * Smart Filter Modal
 * Following specification exactly with quick filters and collapsible sections
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { CapacityFilterState, CapacityQuickFilter, Resource, CapacityProject } from '@/types/capacity';
import { cn } from '@/lib/utils';

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: CapacityFilterState;
  activeQuickFilters: CapacityQuickFilter[];
  onApplyFilters: (filters: CapacityFilterState) => void;
  onToggleQuickFilter: (filter: CapacityQuickFilter) => void;
  onClearAll: () => void;
  resources?: Resource[];
  projects?: CapacityProject[];
}

const QUICK_FILTERS: { id: CapacityQuickFilter; label: string }[] = [
  { id: 'underallocated', label: 'Underallocated' },
  { id: 'overallocated', label: 'Overallocated' },
  { id: 'available', label: 'Available Now' },
  { id: 'current-week', label: 'Current Week' },
  { id: 'onsite', label: 'Onsite Only' },
  { id: 'offshore', label: 'Offshore Only' },
];

export function FilterModal({
  open,
  onOpenChange,
  activeFilters,
  activeQuickFilters,
  onApplyFilters,
  onToggleQuickFilter,
  onClearAll,
  resources = [],
  projects = [],
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<CapacityFilterState>(activeFilters);
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [allocationOpen, setAllocationOpen] = useState(true);

  // Derive unique values from resources and projects
  const uniqueLocations = useMemo(() => {
    const locations = new Set(resources.map(r => r.location));
    return Array.from(locations).filter(Boolean).sort();
  }, [resources]);

  const uniqueSkills = useMemo(() => {
    const skills = new Set(resources.map(r => r.primarySkill));
    return Array.from(skills).filter(Boolean).sort();
  }, [resources]);

  const uniqueProjects = useMemo(() => {
    return projects.map(p => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const uniqueResources = useMemo(() => {
    return resources.map(r => ({ id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [resources]);

  const totalActiveFilters = activeQuickFilters.length + 
    Object.values(activeFilters).filter(v => v !== undefined && v !== '').length;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearAll();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Quick Filters */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Quick Filters
            </h4>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => (
                <Badge
                  key={filter.id}
                  variant={activeQuickFilters.includes(filter.id) ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-colors",
                    activeQuickFilters.includes(filter.id) 
                      ? "bg-[#c69c6d] hover:bg-[#8b7355] text-white" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => onToggleQuickFilter(filter.id)}
                >
                  {filter.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* People Section */}
          <Collapsible open={peopleOpen} onOpenChange={setPeopleOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
              <h4 className="text-sm font-medium">People</h4>
              <ChevronDown className={cn("h-4 w-4 transition-transform", peopleOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid grid-cols-2 gap-4 pt-3">
              <div>
                <label className="text-xs text-muted-foreground">Project</label>
                <Select 
                  value={localFilters.project || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ ...prev, project: v || undefined }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <Select 
                  value={localFilters.location || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ ...prev, location: v || undefined }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Skill</label>
                <Select 
                  value={localFilters.skill || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ ...prev, skill: v || undefined }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueSkills.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Projects Section */}
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
              <h4 className="text-sm font-medium">Projects</h4>
              <ChevronDown className={cn("h-4 w-4 transition-transform", projectsOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div>
                <label className="text-xs text-muted-foreground">Project</label>
                <Select 
                  value={localFilters.project || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ ...prev, project: v || undefined }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Allocation Section */}
          <Collapsible open={allocationOpen} onOpenChange={setAllocationOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
              <h4 className="text-sm font-medium">Allocation</h4>
              <ChevronDown className={cn("h-4 w-4 transition-transform", allocationOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Min %</label>
                  <Input 
                    type="number" 
                    min={0} 
                    max={100}
                    placeholder="0"
                    value={localFilters.minPct || ''}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      minPct: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Max %</label>
                  <Input 
                    type="number" 
                    min={0}
                    placeholder="100"
                    value={localFilters.maxPct || ''}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      maxPct: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Select 
                  value={localFilters.type || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ 
                    ...prev, 
                    type: v as 'HARD' | 'SOFT' | undefined 
                  }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARD">Hard</SelectItem>
                    <SelectItem value="SOFT">Soft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <span className="text-sm">
            <span className="text-[#c69c6d] font-medium">{totalActiveFilters}</span>
            <span className="text-muted-foreground"> filters applied</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClear}>Clear All</Button>
            <Button onClick={handleApply} className="bg-[#c69c6d] hover:bg-[#8b7355] text-white">
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}