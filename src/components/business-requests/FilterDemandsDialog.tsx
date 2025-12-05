import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROCESS_STEPS, DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';
import { ChevronUp, X, CalendarIcon } from 'lucide-react';
import { format, subDays, addQuarters } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { UserPicker } from '@/components/ui/user-picker';
import { BusinessOwnerPicker } from '@/components/ui/business-owner-picker';

export type SmartFilterType = 'myOpen' | 'highPriority' | 'newThisWeek' | 'overdue' | 'currentQuarter' | 'unassigned' | null;

export interface SmartFilters {
  activeSmartFilter?: SmartFilterType;
  requestId?: string;
  requestIdMode?: 'exact' | 'contains';
  rank?: number[];
  scoreMin?: number;
  scoreMax?: number;
  summary?: string;
  processStep?: string[];
  submittedDateFrom?: Date;
  submittedDateTo?: Date;
  ageing?: string[];
  department?: string[];
  businessOwnerValues?: string[]; // Changed to array for multi-select
  reporterIds?: string[]; // Changed to array of user IDs for multi-select
  assigneeIds?: string[]; // Changed to array of user IDs for multi-select
  deliveryPlatform?: string[];
  targetDateFrom?: Date;
  targetDateTo?: Date;
  quarter?: string[];
}

interface FilterDemandsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SmartFilters;
  onFiltersChange: (filters: SmartFilters) => void;
}

const AGEING_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '0-7', label: '0–7 days (New)' },
  { value: '8-30', label: '8–30 days (In Progress)' },
  { value: '31-60', label: '31–60 days (At Risk)' },
  { value: '60+', label: '60+ days (Stale)' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'it', label: 'Information Technology' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'legal', label: 'Legal' },
];

const generateQuarters = (): { value: string; label: string }[] => {
  const quarters = [];
  const today = new Date();
  for (let offset = -4; offset <= 4; offset++) {
    const date = addQuarters(today, offset);
    const q = Math.ceil((date.getMonth() + 1) / 3);
    const year = date.getFullYear();
    quarters.push({ value: `Q${q}-${year}`, label: `Q${q} ${year}` });
  }
  return quarters;
};

const QUARTER_OPTIONS = generateQuarters();

const SMART_FILTER_CONFIG = [
  { 
    id: 'myOpen' as SmartFilterType, 
    label: 'My Open Requests', 
    tooltip: 'Shows requests where you are the Reporter, Business Owner, or Assignee, and the status is not Closed.' 
  },
  { 
    id: 'highPriority' as SmartFilterType, 
    label: 'High Priority', 
    tooltip: 'Shows requests with Rank 1–10 OR Score ≥ 80, and status is Analysis, Active, or Pending.' 
  },
  { 
    id: 'newThisWeek' as SmartFilterType, 
    label: 'New This Week', 
    tooltip: 'Shows requests submitted within the last 7 days.' 
  },
  { 
    id: 'overdue' as SmartFilterType, 
    label: 'Overdue Items', 
    tooltip: 'Shows requests where Target Date is before today and status is not Closed.' 
  },
  { 
    id: 'currentQuarter' as SmartFilterType, 
    label: 'Current Quarter', 
    tooltip: 'Shows requests planned for the current fiscal quarter.' 
  },
  { 
    id: 'unassigned' as SmartFilterType, 
    label: 'Unassigned', 
    tooltip: 'Shows requests with no Assignee set and status is Received, Analysis, or Pending.' 
  },
];

// Multi-select dropdown component
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
            "flex items-center justify-between w-full h-10 px-3 border rounded-md text-sm bg-white transition-colors",
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white border shadow-lg rounded-md max-h-[200px] overflow-y-auto z-[100]" align="start">
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

// Date input component matching the reference
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
            "flex items-center justify-between w-full h-10 px-3 border rounded-md text-sm bg-white transition-colors",
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
      <PopoverContent className="w-auto p-0 bg-white border shadow-lg rounded-md z-[100]" align="start">
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

export function FilterDemandsDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: FilterDemandsDialogProps) {
  const { user } = useAuth();
  const [localFilters, setLocalFilters] = useState<SmartFilters>(filters);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    people: true,
    status: true,
    dates: true,
    classification: false,
  });

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSmartFilterClick = (filterId: SmartFilterType) => {
    const today = new Date();
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
    const currentYear = today.getFullYear();
    
    let newFilters: SmartFilters = { activeSmartFilter: filterId };
    
    switch (filterId) {
      case 'myOpen':
        newFilters = {
          ...newFilters,
          reporterIds: user?.id ? [user.id] : [],
          assigneeIds: user?.id ? [user.id] : [],
          processStep: PROCESS_STEPS.filter(s => s.value !== 'closed').map(s => s.value),
        };
        break;
      case 'highPriority':
        newFilters = {
          ...newFilters,
          rank: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          scoreMin: 80,
          processStep: ['under_study', 'in_progress', 'awaiting_business_response'],
        };
        break;
      case 'newThisWeek':
        newFilters = {
          ...newFilters,
          submittedDateFrom: subDays(today, 7),
          submittedDateTo: today,
        };
        break;
      case 'overdue':
        newFilters = {
          ...newFilters,
          targetDateTo: subDays(today, 1),
          processStep: PROCESS_STEPS.filter(s => s.value !== 'closed').map(s => s.value),
        };
        break;
      case 'currentQuarter':
        newFilters = {
          ...newFilters,
          quarter: [`Q${currentQuarter}-${currentYear}`],
        };
        break;
      case 'unassigned':
        newFilters = {
          ...newFilters,
          assigneeIds: ['UNASSIGNED'],
          processStep: ['request_received', 'under_study', 'awaiting_business_response'],
        };
        break;
    }
    
    setLocalFilters(newFilters);
  };

  const handleClearFilters = () => {
    // Reset all filters to empty state
    setLocalFilters({});
  };

  const handleApplyFilters = () => {
    // Apply current local filters to parent and close
    onFiltersChange({ ...localFilters });
    onOpenChange(false);
  };

  const handleClearAndApply = () => {
    // Clear all filters and apply immediately
    onFiltersChange({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Discard changes and close - don't modify parent filters
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof SmartFilters>(key: K, value: SmartFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value, activeSmartFilter: null }));
  };

  const activeFilterCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'activeSmartFilter' || key === 'requestIdMode') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[480px] w-[95vw] p-0 bg-white border shadow-xl rounded-lg overflow-hidden gap-0 [&>button.absolute]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Filters</h2>
          <button 
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Smart Filters */}
        <TooltipProvider>
          <div className="px-4 sm:px-5 py-4 border-b border-border bg-muted/20">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Filters</div>
            <div className="flex flex-wrap gap-2">
              {SMART_FILTER_CONFIG.map((sf) => (
                <Tooltip key={sf.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1.5 border rounded-md text-sm cursor-pointer transition-all whitespace-nowrap font-medium",
                        localFilters.activeSmartFilter === sf.id
                          ? "bg-brand-gold border-brand-gold text-white"
                          : "bg-white border-border text-foreground hover:border-brand-gold hover:bg-brand-gold/5"
                      )}
                      onClick={() => handleSmartFilterClick(sf.id)}
                    >
                      {sf.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-brand-dark text-white text-xs max-w-[280px] p-2 rounded-md">
                    {sf.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </TooltipProvider>

        {/* Filter Body */}
        <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto scroll-smooth overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
          {/* People Section */}
          <AccordionSection 
            title="People" 
            isOpen={openSections.people} 
            onToggle={() => toggleSection('people')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reporter</label>
                <UserPicker
                  value={localFilters.reporterIds || []}
                  onChange={(value) => {
                    const ids = Array.isArray(value) ? value : value ? [value] : undefined;
                    updateFilter('reporterIds', ids?.length ? ids : undefined);
                  }}
                  placeholder="Select reporters..."
                  multiSelect={true}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Business Owner</label>
                <BusinessOwnerPicker
                  value={localFilters.businessOwnerValues || []}
                  onChange={(value) => updateFilter('businessOwnerValues', value)}
                  placeholder="Search business owners..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                <UserPicker
                  value={localFilters.assigneeIds || []}
                  onChange={(value) => {
                    const ids = Array.isArray(value) ? value : value ? [value] : undefined;
                    updateFilter('assigneeIds', ids?.length ? ids : undefined);
                  }}
                  placeholder="Select assignees..."
                  multiSelect={true}
                  showUnassigned={true}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <MultiSelectDropdown
                  options={DEPARTMENT_OPTIONS}
                  selected={localFilters.department || []}
                  onChange={(values) => updateFilter('department', values.length > 0 ? values : undefined)}
                  placeholder="Select..."
                />
              </div>
            </div>
          </AccordionSection>

          {/* Status & Workflow Section */}
          <AccordionSection 
            title="Status & Workflow" 
            isOpen={openSections.status} 
            onToggle={() => toggleSection('status')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Process Step</label>
                <MultiSelectDropdown
                  options={PROCESS_STEPS.map(s => ({ value: s.value, label: s.label }))}
                  selected={localFilters.processStep || []}
                  onChange={(values) => updateFilter('processStep', values.length > 0 ? values : undefined)}
                  placeholder="Select..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ageing</label>
                <Select
                  value={(localFilters.ageing && localFilters.ageing[0]) || 'all'}
                  onValueChange={(value) => updateFilter('ageing', value === 'all' ? undefined : [value])}
                >
                  <SelectTrigger className="h-10 bg-white border-border">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-[100]">
                    {AGEING_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionSection>

          {/* Dates Section */}
          <AccordionSection 
            title="Dates" 
            isOpen={openSections.dates} 
            onToggle={() => toggleSection('dates')}
          >
            <div className="space-y-4">
              {/* Submitted Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Submitted Date</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DateInput
                      value={localFilters.submittedDateFrom}
                      onChange={(date) => updateFilter('submittedDateFrom', date)}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">to</span>
                  <div className="flex-1">
                    <DateInput
                      value={localFilters.submittedDateTo}
                      onChange={(date) => updateFilter('submittedDateTo', date)}
                    />
                  </div>
                </div>
              </div>

              {/* Target Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Date</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DateInput
                      value={localFilters.targetDateFrom}
                      onChange={(date) => updateFilter('targetDateFrom', date)}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">to</span>
                  <div className="flex-1">
                    <DateInput
                      value={localFilters.targetDateTo}
                      onChange={(date) => updateFilter('targetDateTo', date)}
                    />
                  </div>
                </div>
              </div>

              {/* Quarter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Quarter</label>
                <MultiSelectDropdown
                  options={QUARTER_OPTIONS}
                  selected={localFilters.quarter || []}
                  onChange={(values) => updateFilter('quarter', values.length > 0 ? values : undefined)}
                  placeholder="Select..."
                />
              </div>
            </div>
          </AccordionSection>

          {/* Classification Section */}
          <AccordionSection 
            title="Classification" 
            isOpen={openSections.classification} 
            onToggle={() => toggleSection('classification')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Delivery Platform</label>
                <MultiSelectDropdown
                  options={DELIVERY_PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label.en }))}
                  selected={localFilters.deliveryPlatform || []}
                  onChange={(values) => updateFilter('deliveryPlatform', values.length > 0 ? values : undefined)}
                  placeholder="Select..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <MultiSelectDropdown
                  options={DEPARTMENT_OPTIONS}
                  selected={localFilters.department || []}
                  onChange={(values) => updateFilter('department', values.length > 0 ? values : undefined)}
                  placeholder="Select..."
                />
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-t border-border bg-white">
          <span className="text-sm">
            <span className="text-brand-gold font-medium">{activeFilterCount}</span>
            <span className="text-muted-foreground ml-1">filters applied</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-4 text-sm font-medium"
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={handleApplyFilters}
              className="h-9 px-5 text-sm font-medium bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
