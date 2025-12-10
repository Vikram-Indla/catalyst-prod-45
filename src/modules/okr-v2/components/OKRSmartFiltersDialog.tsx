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
import { CalendarIcon, X, ChevronUp } from 'lucide-react';
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

// Multi-select dropdown component matching Demand Filters UI
function MultiSelectDropdown({ 
  options, 
  selected, 
  onChange, 
  placeholder = 'Select...',
}: { 
  options: { value: string; label: string }[]; 
  selected: string[]; 
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    const newValues = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newValues);
  };

  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? options.find(o => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selected`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between w-full h-10 px-3 border rounded-md text-sm bg-card transition-colors",
            selected.length > 0 ? "border-border text-foreground" : "border-border text-muted-foreground",
            "hover:border-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-brand-gold"
          )}
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {displayText}
          </span>
          <svg className="h-4 w-4 text-muted-foreground shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-card border shadow-lg rounded-md max-h-[200px] overflow-y-auto z-[300]" align="start">
        {options.map(option => (
          <div
            key={option.value}
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-sm transition-colors text-sm",
              selected.includes(option.value) ? "bg-brand-gold/10 text-foreground" : "hover:bg-muted/50 text-foreground"
            )}
            onClick={() => toggleOption(option.value)}
          >
            <div className={cn(
              "h-4 w-4 border rounded flex items-center justify-center shrink-0",
              selected.includes(option.value) ? "bg-brand-gold border-brand-gold" : "border-border"
            )}>
              {selected.includes(option.value) && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <span>{option.label}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Accordion section component
function AccordionSection({ 
  title, 
  isOpen, 
  onToggle, 
  children 
}: { 
  title: string; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 sm:px-5 py-3.5 text-left hover:bg-muted/30 transition-colors duration-150"
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronUp className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out",
          !isOpen && "rotate-180"
        )} />
      </button>
      <div 
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 pb-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Date input component
function DateInput({ 
  value, 
  onChange, 
  placeholder = 'dd/mm/yyyy' 
}: { 
  value?: Date; 
  onChange: (date?: Date) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between w-full h-10 px-3 border rounded-md text-sm bg-card transition-colors",
            value ? "border-border text-foreground" : "border-border text-muted-foreground",
            "hover:border-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-brand-gold"
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? format(value, "dd/MM/yyyy") : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border shadow-lg rounded-md z-[300]" align="start">
        <Calendar 
          mode="single" 
          selected={value} 
          onSelect={(date) => {
            onChange(date);
            setIsOpen(false);
          }}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export function OKRSmartFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: OKRSmartFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<OKRSmartFilters>(filters);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    classification: true,
    people: true,
    dates: true,
    progress: true,
  });

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

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleClearFilters = () => {
    const emptyFilters: OKRSmartFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalFilters(filters);
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof OKRSmartFilters>(key: K, value: OKRSmartFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleProgressChange = (values: number[]) => {
    const [min, max] = values;
    setLocalFilters(prev => ({
      ...prev,
      progressMin: min > 0 ? min : undefined,
      progressMax: max < 100 ? max : undefined,
    }));
  };

  const sliderValue = [localFilters.progressMin ?? 0, localFilters.progressMax ?? 100];

  const activeFilterCount = Object.entries(localFilters).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    return value !== undefined && value !== null;
  }).length;

  // Convert themes to dropdown options
  const themeOptions = (themes || []).map(t => ({ value: t.id, label: t.name }));

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[480px] w-[95vw] p-0 bg-card border shadow-xl rounded-lg overflow-hidden gap-0 [&>button.absolute]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Filter Objectives</h2>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-brand-gold/20 text-brand-gold">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <button 
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Body */}
        <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto scroll-smooth overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
          {/* Classification Section */}
          <AccordionSection 
            title="Classification" 
            isOpen={openSections.classification} 
            onToggle={() => toggleSection('classification')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Theme</label>
                <MultiSelectDropdown
                  options={themeOptions}
                  selected={localFilters.themeIds || []}
                  onChange={(values) => updateFilter('themeIds', values.length > 0 ? values : undefined)}
                  placeholder="Select themes..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <MultiSelectDropdown
                  options={STATUS_OPTIONS}
                  selected={(localFilters.status || []) as string[]}
                  onChange={(values) => updateFilter('status', values.length > 0 ? values as ObjectiveStatusV2[] : undefined)}
                  placeholder="Select status..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Health</label>
                <MultiSelectDropdown
                  options={HEALTH_OPTIONS}
                  selected={(localFilters.health || []) as string[]}
                  onChange={(values) => updateFilter('health', values.length > 0 ? values as ObjectiveHealthV2[] : undefined)}
                  placeholder="Select health..."
                />
              </div>
            </div>
          </AccordionSection>

          {/* People Section */}
          <AccordionSection 
            title="People" 
            isOpen={openSections.people} 
            onToggle={() => toggleSection('people')}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Owner</label>
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
          </AccordionSection>

          {/* Dates Section */}
          <AccordionSection 
            title="Dates" 
            isOpen={openSections.dates} 
            onToggle={() => toggleSection('dates')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start Date From</label>
                <DateInput
                  value={localFilters.startDateFrom}
                  onChange={(date) => updateFilter('startDateFrom', date)}
                  placeholder="From date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start Date To</label>
                <DateInput
                  value={localFilters.startDateTo}
                  onChange={(date) => updateFilter('startDateTo', date)}
                  placeholder="To date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Due Date From</label>
                <DateInput
                  value={localFilters.dueDateFrom}
                  onChange={(date) => updateFilter('dueDateFrom', date)}
                  placeholder="From date"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Due Date To</label>
                <DateInput
                  value={localFilters.dueDateTo}
                  onChange={(date) => updateFilter('dueDateTo', date)}
                  placeholder="To date"
                />
              </div>
            </div>
          </AccordionSection>

          {/* Progress Section */}
          <AccordionSection 
            title="Progress" 
            isOpen={openSections.progress} 
            onToggle={() => toggleSection('progress')}
          >
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Progress Range</label>
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
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-t border-border bg-muted/20">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters} 
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
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
