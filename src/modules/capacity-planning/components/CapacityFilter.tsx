import { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';

export interface CapacityFilters {
  resources: string[];
  roles: string[];
  types: string[];
  statuses: string[];
  priorities: string[];
  dateMatchMode: 'overlaps' | 'inside';
  overbookedOnly: boolean;
  unassignedOnly: boolean;
}

export const DEFAULT_FILTERS: CapacityFilters = {
  resources: [],
  roles: [],
  types: [],
  statuses: [],
  priorities: [],
  dateMatchMode: 'overlaps',
  overbookedOnly: false,
  unassignedOnly: false,
};

interface CapacityFilterProps {
  filters: CapacityFilters;
  onFiltersChange: (filters: CapacityFilters) => void;
  resources: ResourceInventoryItem[];
  viewMode: 'list' | 'gantt';
}

const BOOKING_TYPES = ['ticket', 'task', 'leave'];
const STATUSES = ['planned', 'in_progress', 'completed', 'draft'];
const PRIORITIES = ['high', 'medium', 'low'];

export function CapacityFilter({ filters, onFiltersChange, resources, viewMode }: CapacityFilterProps) {
  const [open, setOpen] = useState(false);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    resources.forEach(r => {
      if (r.role_code) roles.add(r.role_code);
    });
    return Array.from(roles).sort();
  }, [resources]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.resources.length > 0) count++;
    if (filters.roles.length > 0) count++;
    if (filters.types.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.overbookedOnly) count++;
    if (filters.unassignedOnly) count++;
    return count;
  }, [filters]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = [];
    
    filters.roles.forEach(role => {
      chips.push({
        key: `role-${role}`,
        label: `Role: ${role}`,
        remove: () => onFiltersChange({
          ...filters,
          roles: filters.roles.filter(r => r !== role)
        })
      });
    });

    filters.types.forEach(type => {
      chips.push({
        key: `type-${type}`,
        label: `Type: ${type}`,
        remove: () => onFiltersChange({
          ...filters,
          types: filters.types.filter(t => t !== type)
        })
      });
    });

    filters.statuses.forEach(status => {
      chips.push({
        key: `status-${status}`,
        label: `Status: ${status.replace('_', ' ')}`,
        remove: () => onFiltersChange({
          ...filters,
          statuses: filters.statuses.filter(s => s !== status)
        })
      });
    });

    filters.priorities.forEach(priority => {
      chips.push({
        key: `priority-${priority}`,
        label: `Priority: ${priority}`,
        remove: () => onFiltersChange({
          ...filters,
          priorities: filters.priorities.filter(p => p !== priority)
        })
      });
    });

    if (filters.overbookedOnly) {
      chips.push({
        key: 'overbooked',
        label: 'Overbooked',
        remove: () => onFiltersChange({ ...filters, overbookedOnly: false })
      });
    }

    if (filters.unassignedOnly) {
      chips.push({
        key: 'unassigned',
        label: 'Unassigned',
        remove: () => onFiltersChange({ ...filters, unassignedOnly: false })
      });
    }

    return chips;
  }, [filters, onFiltersChange]);

  const handleClearAll = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              'gap-1.5 h-9',
              activeFilterCount > 0 && 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/20'
            )}
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-brand-gold text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 z-[400]" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="p-4 space-y-5">
              {/* Role Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Role</Label>
                <div className="flex flex-wrap gap-2">
                  {uniqueRoles.map(role => (
                    <button
                      key={role}
                      onClick={() => onFiltersChange({
                        ...filters,
                        roles: toggleArrayValue(filters.roles, role)
                      })}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-md border transition-colors',
                        filters.roles.includes(role)
                          ? 'bg-secondary-green text-white border-secondary-green'
                          : 'bg-background hover:bg-muted border-border'
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Type</Label>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => onFiltersChange({
                        ...filters,
                        types: toggleArrayValue(filters.types, type)
                      })}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-md border transition-colors capitalize',
                        filters.types.includes(type)
                          ? 'bg-secondary-green text-white border-secondary-green'
                          : 'bg-background hover:bg-muted border-border'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(status => (
                    <button
                      key={status}
                      onClick={() => onFiltersChange({
                        ...filters,
                        statuses: toggleArrayValue(filters.statuses, status)
                      })}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-md border transition-colors capitalize',
                        filters.statuses.includes(status)
                          ? 'bg-secondary-green text-white border-secondary-green'
                          : 'bg-background hover:bg-muted border-border'
                      )}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Priority</Label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map(priority => (
                    <button
                      key={priority}
                      onClick={() => onFiltersChange({
                        ...filters,
                        priorities: toggleArrayValue(filters.priorities, priority)
                      })}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-md border transition-colors capitalize',
                        filters.priorities.includes(priority)
                          ? 'bg-secondary-green text-white border-secondary-green'
                          : 'bg-background hover:bg-muted border-border'
                      )}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Match Mode */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Date Match</Label>
                <RadioGroup
                  value={filters.dateMatchMode}
                  onValueChange={(value) => onFiltersChange({
                    ...filters,
                    dateMatchMode: value as 'overlaps' | 'inside'
                  })}
                  className="space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overlaps" id="overlaps" />
                    <Label htmlFor="overlaps" className="text-sm font-normal">Overlaps visible range</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inside" id="inside" />
                    <Label htmlFor="inside" className="text-sm font-normal">Fully inside range</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Quick Toggles */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Quick Filters</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.overbookedOnly}
                      onCheckedChange={(checked) => onFiltersChange({
                        ...filters,
                        overbookedOnly: !!checked
                      })}
                    />
                    <span className="text-sm">Overbooked resources only</span>
                  </label>
                  {viewMode === 'list' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.unassignedOnly}
                        onCheckedChange={(checked) => onFiltersChange({
                          ...filters,
                          unassignedOnly: !!checked
                        })}
                      />
                      <span className="text-sm">Unassigned only</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <Button 
              className="w-full bg-secondary-green hover:bg-secondary-green/90 text-white"
              onClick={() => setOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeChips.slice(0, 3).map(chip => (
            <Badge
              key={chip.key}
              variant="outline"
              className="h-6 gap-1 pl-2 pr-1 text-xs bg-brand-gold/10 border-brand-gold/30 text-brand-gold"
            >
              {chip.label}
              <button
                onClick={chip.remove}
                className="h-4 w-4 rounded-full hover:bg-brand-gold/20 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeChips.length > 3 && (
            <Badge variant="outline" className="h-6 text-xs">
              +{activeChips.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
