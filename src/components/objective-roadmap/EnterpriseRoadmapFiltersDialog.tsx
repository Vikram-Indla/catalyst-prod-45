import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Check, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { format, startOfQuarter, endOfQuarter, addMonths } from 'date-fns';
import { Theme, Owner } from '@/types/objective-roadmap';

// ===== TYPES =====
export interface EnterpriseFilters {
  owners: string[];
  themes: string[];
  status: string[];
  health: string[];
  activeInPeriod: 'any' | 'this-quarter' | 'next-quarter' | 'custom';
  customRangeStart: Date | null;
  customRangeEnd: Date | null;
}

export const DEFAULT_ENTERPRISE_FILTERS: EnterpriseFilters = {
  owners: [],
  themes: [],
  status: [],
  health: [],
  activeInPeriod: 'any',
  customRangeStart: null,
  customRangeEnd: null,
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

interface EnterpriseRoadmapFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EnterpriseFilters;
  onFiltersChange: (filters: EnterpriseFilters) => void;
  themes: Theme[];
  owners: Owner[];
}

// Multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  getOptionLabel = (opt: any) => opt,
  getOptionValue = (opt: any) => opt,
  renderOptionContent,
}: {
  label: string;
  options: any[];
  selected: string[];
  onChange: (selected: string[]) => void;
  getOptionLabel?: (opt: any) => string;
  getOptionValue?: (opt: any) => string;
  renderOptionContent?: (opt: any) => React.ReactNode;
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
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No options</div>
            ) : (
              options.map((opt, idx) => {
                const value = getOptionValue(opt);
                const labelText = getOptionLabel(opt);
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
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                      isSelected 
                        ? "bg-brand-primary border-brand-primary" 
                        : "border-border"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    {renderOptionContent ? renderOptionContent(opt) : (
                      <span className="text-sm">{labelText}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

const OBJECTIVE_STATUSES = ['on-track', 'at-risk', 'off-track', 'in-progress', 'pending'];
const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'off-track': 'Off Track',
  'in-progress': 'In Progress',
  'pending': 'Pending',
};

const HEALTH_STATUSES = ['on-track', 'at-risk', 'off-track'];
const HEALTH_STATUS_LABELS: Record<string, string> = {
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'off-track': 'Off Track',
};

export function EnterpriseRoadmapFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  themes,
  owners,
}: EnterpriseRoadmapFiltersDialogProps) {
  const [draftFilters, setDraftFilters] = useState<EnterpriseFilters>(filters);
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
    
    // If custom range selected but dates not set, treat as "any"
    if (draftFilters.activeInPeriod === 'custom' && 
        (!draftFilters.customRangeStart || !draftFilters.customRangeEnd)) {
      onFiltersChange({ ...draftFilters, activeInPeriod: 'any' });
    } else {
      onFiltersChange(draftFilters);
    }
    onOpenChange(false);
  };

  const handleReset = () => {
    setDraftFilters(DEFAULT_ENTERPRISE_FILTERS);
    setDateValidationError(null);
    onFiltersChange(DEFAULT_ENTERPRISE_FILTERS);
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
          <DialogTitle>Objective Roadmap Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Row 1: Objective Owner & Theme */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Objective Owner
              </Label>
              <MultiSelectDropdown
                label="Objective Owner"
                options={owners}
                selected={draftFilters.owners}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, owners: selected }))}
                getOptionLabel={(o) => o.name}
                getOptionValue={(o) => o.id}
                renderOptionContent={(o) => (
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center text-[9px] font-semibold bg-muted rounded-full flex-shrink-0">
                      {o.initials}
                    </span>
                    <span className="text-sm">{o.name}</span>
                  </div>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Theme
              </Label>
              <MultiSelectDropdown
                label="Theme"
                options={themes}
                selected={draftFilters.themes}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, themes: selected }))}
                getOptionLabel={(t) => t.name}
                getOptionValue={(t) => t.id}
                renderOptionContent={(t) => (
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3.5 h-3.5 rounded flex-shrink-0" 
                      style={{ background: t.color }} 
                    />
                    <span className="text-sm">{t.name}</span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Row 2: Lifecycle Status & Health Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lifecycle Status
              </Label>
              <MultiSelectDropdown
                label="Lifecycle Status"
                options={OBJECTIVE_STATUSES}
                selected={draftFilters.status}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, status: selected }))}
                getOptionLabel={(s) => OBJECTIVE_STATUS_LABELS[s] || s}
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
                getOptionLabel={(h) => HEALTH_STATUS_LABELS[h] || h}
                getOptionValue={(h) => h}
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
