/**
 * Smart Filter Drawer
 * Following specification exactly with quick filters and collapsible sections
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, X } from 'lucide-react';
import { CapacityFilterState, CapacityQuickFilter } from '@/types/capacity';
import { cn } from '@/lib/utils';

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: CapacityFilterState;
  activeQuickFilters: CapacityQuickFilter[];
  onApplyFilters: (filters: CapacityFilterState) => void;
  onToggleQuickFilter: (filter: CapacityQuickFilter) => void;
  onClearAll: () => void;
}

const QUICK_FILTERS: { id: CapacityQuickFilter; label: string }[] = [
  { id: 'underallocated', label: 'Underallocated' },
  { id: 'overallocated', label: 'Overallocated' },
  { id: 'available', label: 'Available Now' },
  { id: 'current-week', label: 'Current Week' },
  { id: 'onsite', label: 'Onsite Only' },
  { id: 'offshore', label: 'Offshore Only' },
];

export function FilterDrawer({
  open,
  onOpenChange,
  activeFilters,
  activeQuickFilters,
  onApplyFilters,
  onToggleQuickFilter,
  onClearAll,
}: FilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<CapacityFilterState>(activeFilters);
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [allocationOpen, setAllocationOpen] = useState(true);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] bg-card">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
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
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
              <h4 className="text-sm font-medium">People</h4>
              <ChevronDown className={cn("h-4 w-4 transition-transform", peopleOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground">Department</label>
                <Select 
                  value={localFilters.department || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ ...prev, department: v || undefined }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
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
                    <SelectItem value="Onsite">Onsite</SelectItem>
                    <SelectItem value="Offshore">Offshore</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Skill</label>
                <Select 
                  value={localFilters.skill || ''} 
                  onValueChange={(v) => setLocalFilters(prev => ({ ...prev, skill: v || undefined }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Frontend">Frontend</SelectItem>
                    <SelectItem value="Backend">Backend</SelectItem>
                    <SelectItem value="Full Stack">Full Stack</SelectItem>
                    <SelectItem value="DevOps">DevOps</SelectItem>
                    <SelectItem value="QA">QA</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Data">Data</SelectItem>
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
            <CollapsibleContent className="space-y-3 pt-2">
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
                    <SelectItem value="intl">International</SelectItem>
                    <SelectItem value="mim">MIM</SelectItem>
                    <SelectItem value="innov">Innovation</SelectItem>
                    <SelectItem value="senaei">Senaei</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="icp">ICP</SelectItem>
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
            <CollapsibleContent className="space-y-3 pt-2">
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
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalActiveFilters} filters applied
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClear}>Clear</Button>
            <Button onClick={handleApply} className="bg-[#c69c6d] hover:bg-[#8b7355] text-white">
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
