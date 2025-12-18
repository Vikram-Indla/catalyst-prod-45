import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== TYPES =====
export interface ProgramFilters {
  owners: string[];
  linkedProjects: string[];
  status: string[];
  health: string[];
  activeInPeriod: string | null;
  overdueOnly: boolean;
  hasDependencies: boolean | null;
  blockedOrBlocking: boolean | null;
  hasLinkedFeatures: boolean | null;
  featureStatusOpenOnly: boolean;
}

export const DEFAULT_FILTERS: ProgramFilters = {
  owners: [],
  linkedProjects: [],
  status: [],
  health: [],
  activeInPeriod: null,
  overdueOnly: false,
  hasDependencies: null,
  blockedOrBlocking: null,
  hasLinkedFeatures: null,
  featureStatusOpenOnly: false,
};

interface Project {
  id: string;
  name: string;
}

interface ProgramRoadmapFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProgramFilters;
  onFiltersChange: (filters: ProgramFilters) => void;
  owners: string[];
  projects: Project[];
}

// Multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  getOptionLabel = (opt: string) => opt,
  getOptionValue = (opt: string) => opt,
}: {
  label: string;
  options: string[] | { id: string; name: string }[];
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
              const label = getOptionLabel(opt);
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
                  <span className="text-sm">{label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const PROGRAM_STATUSES = ['Draft', 'Active', 'Completed', 'On Hold'];
const HEALTH_STATUSES = ['On Track', 'At Risk', 'Blocked'];
const ACTIVE_IN_PERIOD_OPTIONS = ['This Quarter', 'Next Quarter', 'Custom Range'];

export function ProgramRoadmapFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  owners,
  projects,
}: ProgramRoadmapFiltersDialogProps) {
  const [draftFilters, setDraftFilters] = useState<ProgramFilters>(filters);

  // Sync draft with filters when dialog opens
  useEffect(() => {
    if (open) {
      setDraftFilters(filters);
    }
  }, [open, filters]);

  const handleApply = () => {
    onFiltersChange(draftFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  };

  const handleCancel = () => {
    setDraftFilters(filters);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Program Roadmap Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Row 1: Program Owner & Linked Project */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Program Owner
              </Label>
              <MultiSelectDropdown
                label="Program Owner"
                options={owners}
                selected={draftFilters.owners}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, owners: selected }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Linked Project
              </Label>
              <MultiSelectDropdown
                label="Linked Project"
                options={projects}
                selected={draftFilters.linkedProjects}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, linkedProjects: selected }))}
                getOptionLabel={(p) => p.name}
                getOptionValue={(p) => p.id}
              />
            </div>
          </div>

          {/* Row 2: Program Status & Health Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Program Status
              </Label>
              <MultiSelectDropdown
                label="Program Status"
                options={PROGRAM_STATUSES}
                selected={draftFilters.status}
                onChange={(selected) => setDraftFilters(prev => ({ ...prev, status: selected }))}
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
              />
            </div>
          </div>

          {/* Row 3: Active In Period */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active In Period
            </Label>
            <Select
              value={draftFilters.activeInPeriod || ''}
              onValueChange={(value) => setDraftFilters(prev => ({ 
                ...prev, 
                activeInPeriod: value === '' ? null : value 
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent className="z-[500]">
                <SelectItem value="">Any Period</SelectItem>
                {ACTIVE_IN_PERIOD_OPTIONS.map(period => (
                  <SelectItem key={period} value={period}>{period}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Boolean Filters Section */}
          <div className="pt-2 border-t border-border">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Additional Filters
            </Label>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Overdue Programs */}
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
                  Overdue Programs
                </label>
              </div>

              {/* Has Dependencies */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasDependencies"
                  checked={draftFilters.hasDependencies === true}
                  onCheckedChange={(checked) => setDraftFilters(prev => ({ 
                    ...prev, 
                    hasDependencies: checked === true ? true : null 
                  }))}
                />
                <label htmlFor="hasDependencies" className="text-sm cursor-pointer">
                  Has Dependencies
                </label>
              </div>

              {/* Blocked / Blocking Programs */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="blockedOrBlocking"
                  checked={draftFilters.blockedOrBlocking === true}
                  onCheckedChange={(checked) => setDraftFilters(prev => ({ 
                    ...prev, 
                    blockedOrBlocking: checked === true ? true : null 
                  }))}
                />
                <label htmlFor="blockedOrBlocking" className="text-sm cursor-pointer">
                  Blocked / Blocking Programs
                </label>
              </div>

              {/* Has Linked Features */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasLinkedFeatures"
                  checked={draftFilters.hasLinkedFeatures === true}
                  onCheckedChange={(checked) => setDraftFilters(prev => ({ 
                    ...prev, 
                    hasLinkedFeatures: checked === true ? true : null 
                  }))}
                />
                <label htmlFor="hasLinkedFeatures" className="text-sm cursor-pointer">
                  Has Linked Features
                </label>
              </div>

              {/* Feature Status (Open only) */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="featureStatusOpenOnly"
                  checked={draftFilters.featureStatusOpenOnly}
                  onCheckedChange={(checked) => setDraftFilters(prev => ({ 
                    ...prev, 
                    featureStatusOpenOnly: checked === true 
                  }))}
                />
                <label htmlFor="featureStatusOpenOnly" className="text-sm cursor-pointer">
                  Feature Status (Open only)
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
          <Button onClick={handleApply} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
