import { useState } from 'react';
import { X, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FiltersState {
  deliveryPlatform: string;
  processSteps: string[];
  quarters: string[];
  dateFrom: string;
  dateTo: string;
}

interface IndustryFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  deliveryPlatformOptions: FilterOption[];
  quarterOptions: FilterOption[];
}

export function IndustryFiltersPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  deliveryPlatformOptions,
  quarterOptions
}: IndustryFiltersPanelProps) {
  const { data: demandProcessSteps = [] } = useActiveDemandProcessSteps();
  
  const handleDeliveryPlatformChange = (value: string) => {
    onFiltersChange({ ...filters, deliveryPlatform: value });
  };

  const handleProcessStepToggle = (value: string) => {
    const newSteps = filters.processSteps.includes(value)
      ? filters.processSteps.filter(s => s !== value)
      : [...filters.processSteps, value];
    onFiltersChange({ ...filters, processSteps: newSteps });
  };

  const handleQuarterToggle = (value: string) => {
    const newQuarters = filters.quarters.includes(value)
      ? filters.quarters.filter(q => q !== value)
      : [...filters.quarters, value];
    onFiltersChange({ ...filters, quarters: newQuarters });
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleClearAll = () => {
    onFiltersChange({
      deliveryPlatform: 'all',
      processSteps: [],
      quarters: [],
      dateFrom: '',
      dateTo: ''
    });
  };

  const hasActiveFilters = 
    filters.deliveryPlatform !== 'all' ||
    filters.processSteps.length > 0 ||
    filters.quarters.length > 0 ||
    filters.dateFrom ||
    filters.dateTo;

  if (!isOpen) return null;

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-gold" />
          <span className="font-medium text-sm text-foreground">Filters</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Delivery Platform */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
            Delivery Platform
          </Label>
          <Select value={filters.deliveryPlatform} onValueChange={handleDeliveryPlatformChange}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="all">All</SelectItem>
              {deliveryPlatformOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.count !== undefined && (
                    <span className="ml-2 text-muted-foreground">({opt.count})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Process Step - Multi Select */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
            Process Step
          </Label>
          <div className="space-y-1.5 max-h-48 overflow-auto border border-border rounded-md p-2 bg-background">
            {demandProcessSteps.map(step => (
              <label
                key={step.value}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={filters.processSteps.includes(step.value)}
                  onCheckedChange={() => handleProcessStepToggle(step.value)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-sm text-foreground">{step.label}</span>
              </label>
            ))}
          </div>
          {filters.processSteps.length > 0 && (
            <button
              onClick={() => onFiltersChange({ ...filters, processSteps: [] })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear selection ({filters.processSteps.length})
            </button>
          )}
        </div>

        {/* Quarter - Multi Select */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
            Quarter
          </Label>
          <div className="space-y-1.5 border border-border rounded-md p-2 bg-background">
            {quarterOptions.map(quarter => (
              <label
                key={quarter.value}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={filters.quarters.includes(quarter.value)}
                  onCheckedChange={() => handleQuarterToggle(quarter.value)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-sm text-foreground flex-1">{quarter.label}</span>
                {quarter.count !== undefined && (
                  <span className="text-xs text-muted-foreground">({quarter.count})</span>
                )}
              </label>
            ))}
          </div>
          {filters.quarters.length > 0 && (
            <button
              onClick={() => onFiltersChange({ ...filters, quarters: [] })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear selection ({filters.quarters.length})
            </button>
          )}
        </div>

        {/* Target Date Range */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
            Target Date Range
          </Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">From</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                  className="pl-9 bg-background text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">To</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleDateChange('dateTo', e.target.value)}
                  className="pl-9 bg-background text-sm"
                />
              </div>
            </div>
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => onFiltersChange({ ...filters, dateFrom: '', dateTo: '' })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-border bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="w-full text-sm"
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

export type { FiltersState };
