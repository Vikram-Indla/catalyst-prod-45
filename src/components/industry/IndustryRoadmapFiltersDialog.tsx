import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Check, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { startOfQuarter, endOfQuarter, addMonths } from 'date-fns';

// ===== TYPES =====
export interface IndustryFilters {
  owners: string[];
  products: string[];
  status: string[];
  health: string[];
  activeInPeriod: 'any' | 'this-quarter' | 'next-quarter' | 'custom';
  customRangeStart: Date | null;
  customRangeEnd: Date | null;
  overdueOnly: boolean;
}

export const DEFAULT_INDUSTRY_FILTERS: IndustryFilters = {
  owners: [],
  products: [],
  status: [],
  health: [],
  activeInPeriod: 'any',
  customRangeStart: null,
  customRangeEnd: null,
  overdueOnly: false,
};

// Helper to get current quarter dates
export function getCurrentQuarterDates(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfQuarter(now),
    end: endOfQuarter(now)
  };
}

// Helper to get next quarter dates
export function getNextQuarterDates(): { start: Date; end: Date } {
  const now = new Date();
  const nextQuarterStart = startOfQuarter(addMonths(now, 3));
  return {
    start: nextQuarterStart,
    end: endOfQuarter(nextQuarterStart)
  };
}

interface Product {
  id: string;
  name: string;
}

interface Owner {
  id: string;
  name: string;
}

interface IndustryRoadmapFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: IndustryFilters;
  onFiltersChange: (filters: IndustryFilters) => void;
  owners: Owner[];
  products: Product[];
}

// Multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  getOptionLabel = (opt: any) => opt.name || opt,
  getOptionValue = (opt: any) => opt.id || opt,
}: {
  label: string;
  options: any[];
  selected: string[];
  onChange: (selected: string[]) => void;
  getOptionLabel?: (opt: any) => string;
  getOptionValue?: (opt: any) => string;
}) {
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
    if (selected.length === 1) {
      const opt = options.find(o => getOptionValue(o) === selected[0]);
      return opt ? getOptionLabel(opt) : selected[0];
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-muted/50 transition-colors text-left"
      >
        <span className={cn(
          selected.length === 0 ? "text-muted-foreground" : "text-foreground"
        )}>
          {getDisplayText()}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-[200px] overflow-auto">
            {options.map((opt, idx) => {
              const value = getOptionValue(opt);
              const optLabel = getOptionLabel(opt);
              const isSelected = selected.includes(value);
              
              return (
                <div
                  key={value || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(value);
                  }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    isSelected 
                      ? "bg-brand-primary border-brand-primary" 
                      : "border-border"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm">{optLabel}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const REQUEST_STATUSES = ['new', 'demand_analysis', 'solution_review', 'approved', 'in_progress', 'implementation', 'done', 'on_hold', 'cancelled'];
const HEALTH_STATUSES = ['On Track', 'At Risk', 'Blocked'];

export function IndustryRoadmapFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  owners,
  products,
}: IndustryRoadmapFiltersDialogProps) {
  const [draftFilters, setDraftFilters] = useState<IndustryFilters>(filters);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Sync draft with filters when dialog opens
  useEffect(() => {
    if (open) {
      setDraftFilters(filters);
      setDateValidationError(null);
    }
  }, [open, filters]);

  // Validate custom date range
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
    setDraftFilters(DEFAULT_INDUSTRY_FILTERS);
    setDateValidationError(null);
    onFiltersChange(DEFAULT_INDUSTRY_FILTERS);
  };

  const handleCancel = () => {
    setDraftFilters(filters);
    setDateValidationError(null);
    onOpenChange(false);
  };

  const handlePeriodChange = (value: string) => {
    const periodValue = value as 'any' | 'this-quarter' | 'next-quarter' | 'custom';
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
          <DialogTitle>Business Request Roadmap Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Row 1: Business Owner & Product */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Business Owner
              </Label>
              <MultiSelectDropdown
                label="Business Owner"
                options={owners}
                selected={draftFilters.owners}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, owners: selected }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </Label>
              <MultiSelectDropdown
                label="Product"
                options={products}
                selected={draftFilters.products}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, products: selected }))}
              />
            </div>
          </div>

          {/* Row 2: Request Status & Health Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Request Status
              </Label>
              <MultiSelectDropdown
                label="Request Status"
                options={REQUEST_STATUSES}
                selected={draftFilters.status}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, status: selected }))}
                getOptionLabel={(s) => s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                getOptionValue={(s) => s}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Health Status
              </Label>
              <MultiSelectDropdown
                label="Health Status"
                options={HEALTH_STATUSES}
                selected={draftFilters.health}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, health: selected }))}
                getOptionLabel={(s) => s}
                getOptionValue={(s) => s}
              />
            </div>
          </div>

          {/* Row 3: Active In Period */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active In Period
            </Label>
            <Select
              value={draftFilters.activeInPeriod}
              onValueChange={handlePeriodChange}
            >
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
                <div className="col-span-2 text-xs text-destructive">
                  {dateValidationError}
                </div>
              )}
            </div>
          )}

          {/* Boolean Filters Section */}
          <div className="pt-2 border-t border-border">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Additional Filters
            </Label>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Overdue Requests */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="overdueOnly"
                  checked={draftFilters.overdueOnly}
                  onCheckedChange={(checked) => setDraftFilters(prev => ({ 
                    ...prev, 
                    overdueOnly: checked === true 
                  }))}
                />
                <label htmlFor="overdueOnly" className="text-sm cursor-pointer">
                  Overdue Requests
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
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
