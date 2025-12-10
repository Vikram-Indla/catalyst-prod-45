import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { UserPicker } from '@/components/ui/user-picker';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ObjectiveStatusV2, ObjectiveHealthV2 } from '@/hooks/useObjectivesV2';

export interface OKRSmartFilters {
  themeIds?: string[];
  status?: ObjectiveStatusV2[];
  health?: ObjectiveHealthV2[];
  progressMin?: number;
  progressMax?: number;
  ownerIds?: string[];
  startDateFrom?: Date;
  startDateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
}

interface OKRSmartFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: OKRSmartFilters;
  onFiltersChange: (filters: OKRSmartFilters) => void;
}

const STATUS_OPTIONS: { value: ObjectiveStatusV2; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'missed', label: 'Missed' },
];

const HEALTH_OPTIONS: { value: ObjectiveHealthV2; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'at_risk', label: 'At Risk' },
];

export function OKRSmartFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: OKRSmartFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<OKRSmartFilters>(filters);

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  // Fetch themes
  const { data: themes } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleClearFilters = () => {
    // Reset to empty filters and also update parent immediately
    const emptyFilters: OKRSmartFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Restore to previous applied filters and close
    setLocalFilters(filters);
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof OKRSmartFilters>(key: K, value: OKRSmartFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleMultiSelect = <K extends 'themeIds' | 'status' | 'health'>(
    key: K,
    value: string
  ) => {
    const current = (localFilters[key] as string[] | undefined) || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, newValues.length > 0 ? newValues as any : undefined);
  };

  const handleProgressChange = (values: number[]) => {
    const [min, max] = values;
    setLocalFilters(prev => ({
      ...prev,
      progressMin: min > 0 ? min : undefined,
      progressMax: max < 100 ? max : undefined,
    }));
  };

  // Computed slider value for controlled component
  const sliderValue = [localFilters.progressMin ?? 0, localFilters.progressMax ?? 100];

  const activeFilterCount = Object.entries(localFilters).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    return value !== undefined && value !== null;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            Filter Objectives
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-brand-gold/20 text-brand-gold">
                {activeFilterCount} active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Theme */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="flex flex-wrap gap-1.5">
                {themes?.map((theme) => (
                  <Button
                    key={theme.id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.themeIds?.includes(theme.id) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('themeIds', theme.id)}
                  >
                    {theme.name}
                  </Button>
                ))}
                {(!themes || themes.length === 0) && (
                  <span className="text-xs text-muted-foreground">No themes available</span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.status?.includes(opt.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('status', opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Health */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Health</Label>
              <div className="flex flex-wrap gap-1.5">
                {HEALTH_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      localFilters.health?.includes(opt.value) && "border-brand-gold bg-brand-gold/10 text-brand-gold"
                    )}
                    onClick={() => toggleMultiSelect('health', opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Progress Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Progress Range</Label>
              <div className="px-1">
                <Slider
                  value={sliderValue}
                  max={100}
                  min={0}
                  step={5}
                  onValueChange={handleProgressChange}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{sliderValue[0]}%</span>
                  <span>{sliderValue[1]}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Owner */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Owner</Label>
              <UserPicker
                value={localFilters.ownerIds || []}
                onChange={(value) => {
                  const ids = Array.isArray(value) ? value : value ? [value] : undefined;
                  updateFilter('ownerIds', ids?.length ? ids : undefined);
                }}
                placeholder="Select owners..."
                multiSelect={true}
              />
            </div>

            {/* Start Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-9 w-28 justify-start text-left font-normal", 
                        !localFilters.startDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.startDateFrom ? format(localFilters.startDateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar 
                      mode="single" 
                      selected={localFilters.startDateFrom} 
                      onSelect={(date) => updateFilter('startDateFrom', date)} 
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">—</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-9 w-28 justify-start text-left font-normal", 
                        !localFilters.startDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.startDateTo ? format(localFilters.startDateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar 
                      mode="single" 
                      selected={localFilters.startDateTo} 
                      onSelect={(date) => updateFilter('startDateTo', date)} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Due Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-9 w-28 justify-start text-left font-normal", 
                        !localFilters.dueDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.dueDateFrom ? format(localFilters.dueDateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar 
                      mode="single" 
                      selected={localFilters.dueDateFrom} 
                      onSelect={(date) => updateFilter('dueDateFrom', date)} 
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">—</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-9 w-28 justify-start text-left font-normal", 
                        !localFilters.dueDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {localFilters.dueDateTo ? format(localFilters.dueDateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar 
                      mode="single" 
                      selected={localFilters.dueDateTo} 
                      onSelect={(date) => updateFilter('dueDateTo', date)} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between border-t border-border pt-4">
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to count active filters
export function countActiveFilters(filters: OKRSmartFilters): number {
  return Object.entries(filters).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    return value !== undefined && value !== null;
  }).length;
}
