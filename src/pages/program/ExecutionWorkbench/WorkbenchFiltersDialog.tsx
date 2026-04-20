/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Filters dialog following Program Roadmap pattern
 * (Health filter removed per requirements)
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Check, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { startOfQuarter, endOfQuarter, addMonths } from 'date-fns';
import { 
  WorkbenchFilters, 
  DEFAULT_WORKBENCH_FILTERS,
  STATUS_OPTIONS,
  Owner,
} from './types';
import { Tooltip } from '@/components/ads';

function getCurrentQuarterDates(): { start: Date; end: Date } {
  const now = new Date();
  return { start: startOfQuarter(now), end: endOfQuarter(now) };
}

function getNextQuarterDates(): { start: Date; end: Date } {
  const now = new Date();
  const nextQuarterStart = startOfQuarter(addMonths(now, 3));
  return { start: nextQuarterStart, end: endOfQuarter(nextQuarterStart) };
}

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

function MultiSelectDropdown({ label, options, selected, onChange, disabled }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return `Select ${label.toLowerCase()}...`;
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-md bg-background transition-colors text-left",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
        )}
      >
        <span className={cn(selected.length === 0 ? "text-muted-foreground" : "text-foreground")}>
          {getDisplayText()}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[500] max-h-[200px] overflow-auto">
            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <div
                  key={opt}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(opt);
                  }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    isSelected ? "bg-brand-primary border-brand-primary" : "border-border"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm">{opt}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface WorkbenchFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: WorkbenchFilters;
  onFiltersChange: (filters: WorkbenchFilters) => void;
  owners: Owner[];
}

export function WorkbenchFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  owners,
}: WorkbenchFiltersDialogProps) {
  const [draftFilters, setDraftFilters] = useState<WorkbenchFilters>(filters);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const ownerNames = owners.map(o => o.full_name);

  useEffect(() => {
    if (open) {
      setDraftFilters(filters);
      setDateValidationError(null);
    }
  }, [open, filters]);

  useEffect(() => {
    if (draftFilters.activeInPeriod === 'custom') {
      if (draftFilters.customRangeStart && draftFilters.customRangeEnd) {
        if (draftFilters.customRangeEnd < draftFilters.customRangeStart) {
          setDateValidationError('End date must be on or after start date');
        } else {
          setDateValidationError(null);
        }
      } else {
        setDateValidationError(null);
      }
    } else {
      setDateValidationError(null);
    }
  }, [draftFilters.activeInPeriod, draftFilters.customRangeStart, draftFilters.customRangeEnd]);

  const handleApply = () => {
    if (dateValidationError) return;
    if (draftFilters.activeInPeriod === 'custom' && 
        (!draftFilters.customRangeStart || !draftFilters.customRangeEnd)) {
      onFiltersChange({ ...draftFilters, activeInPeriod: 'any' });
    } else {
      onFiltersChange(draftFilters);
    }
    onOpenChange(false);
  };

  const handleReset = () => {
    setDraftFilters(DEFAULT_WORKBENCH_FILTERS);
    setDateValidationError(null);
    onFiltersChange(DEFAULT_WORKBENCH_FILTERS);
  };

  const handleCancel = () => {
    setDraftFilters(filters);
    setDateValidationError(null);
    onOpenChange(false);
  };

  const handlePeriodChange = (value: string) => {
    const periodValue = value as WorkbenchFilters['activeInPeriod'];
    setDraftFilters(prev => ({
      ...prev,
      activeInPeriod: periodValue,
      customRangeStart: periodValue === 'custom' ? prev.customRangeStart : null,
      customRangeEnd: periodValue === 'custom' ? prev.customRangeEnd : null,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Work Tree Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Row 1: Owner & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Owner
              </Label>
              <MultiSelectDropdown
                label="Owner"
                options={ownerNames}
                selected={draftFilters.owners}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, owners: selected }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <MultiSelectDropdown
                label="Status"
                options={STATUS_OPTIONS}
                selected={draftFilters.status}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, status: selected as any }))}
              />
            </div>
          </div>

          {/* Row 2: Active In Period */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active In Period
            </Label>
            <Select value={draftFilters.activeInPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent className="z-[500]">
                <SelectItem value="any">Any Period</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="next-quarter">Next Quarter</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Range Date Pickers */}
          {draftFilters.activeInPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-brand-primary/30">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start Date
                </Label>
                <CatalystDatePicker
                  value={draftFilters.customRangeStart}
                  onChange={(date) => setDraftFilters(prev => ({ ...prev, customRangeStart: date }))}
                  placeholder="Select start date..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  End Date
                </Label>
                <CatalystDatePicker
                  value={draftFilters.customRangeEnd}
                  onChange={(date) => setDraftFilters(prev => ({ ...prev, customRangeEnd: date }))}
                  placeholder="Select end date..."
                />
              </div>
              {dateValidationError && (
                <div className="col-span-2 text-xs text-destructive">{dateValidationError}</div>
              )}
            </div>
          )}

          {/* Boolean Filters Section */}
          <div className="pt-2 border-t border-border">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Additional Filters
            </Label>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasDependencies"
                checked={draftFilters.hasDependencies === true}
                onCheckedChange={(checked) => setDraftFilters(prev => ({ 
                  ...prev, 
                  hasDependencies: checked === true ? true : null 
                }))}
                disabled
              />
              <label htmlFor="hasDependencies" className="text-sm cursor-pointer text-muted-foreground">
                Has Dependencies
              </label>
              <Tooltip content={<p>Coming soon - dependency model integration</p>}>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </Tooltip>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>Reset</Button>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button 
            onClick={handleApply} 
            className="bg-brand-primary hover:bg-brand-primary-hover text-white"
            disabled={!!dateValidationError}
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
