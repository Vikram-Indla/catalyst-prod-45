import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PROCESS_STEPS, DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';
import { ChevronDown, X, User, Zap, Sparkles, AlertTriangle, CalendarDays, Clock, Check, CalendarIcon } from 'lucide-react';
import { format, subDays, addQuarters } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

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
  businessOwner?: string;
  reporter?: string;
  assignee?: string;
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

const DEPARTMENT_OPTIONS = [
  { value: 'it', label: 'Information Technology' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'legal', label: 'Legal' },
];

const AGEING_BUCKETS = [
  { value: '0-7', label: '0–7 days (New)' },
  { value: '8-30', label: '8–30 days (In Progress)' },
  { value: '31-60', label: '31–60 days (At Risk)' },
  { value: '60+', label: '60+ days (Stale)' },
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
    icon: User, 
    tooltip: 'Shows requests where you are the Reporter, Business Owner, or Assignee, and the status is not Closed.' 
  },
  { 
    id: 'highPriority' as SmartFilterType, 
    label: 'High Priority', 
    icon: Zap, 
    tooltip: 'Shows requests with Rank 1–10 OR Score ≥ 80, and status is Analysis, Active, or Pending.' 
  },
  { 
    id: 'newThisWeek' as SmartFilterType, 
    label: 'New This Week', 
    icon: Sparkles, 
    tooltip: 'Shows requests submitted within the last 7 days.' 
  },
  { 
    id: 'overdue' as SmartFilterType, 
    label: 'Overdue Items', 
    icon: AlertTriangle, 
    tooltip: 'Shows requests where Target Date is before today and status is not Closed.' 
  },
  { 
    id: 'currentQuarter' as SmartFilterType, 
    label: 'Current Quarter', 
    icon: CalendarDays, 
    tooltip: 'Shows requests planned for the current fiscal quarter.' 
  },
  { 
    id: 'unassigned' as SmartFilterType, 
    label: 'Unassigned', 
    icon: Clock, 
    tooltip: 'Shows requests with no Assignee set and status is Received, Analysis, or Pending.' 
  },
];

// Multi-select dropdown component
function MultiSelectDropdown({ 
  options, 
  selected, 
  onChange, 
  placeholder = 'Select...',
  labelKey = 'label'
}: { 
  options: { value: string; label: string }[]; 
  selected: string[]; 
  onChange: (values: string[]) => void;
  placeholder?: string;
  labelKey?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    const newValues = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newValues);
  };

  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full px-2.5 py-2 border rounded text-[13px] bg-card min-h-[34px] transition-all",
            isOpen ? "border-brand-gold ring-2 ring-brand-gold/10" : "border-border hover:border-muted-foreground/50"
          )}
        >
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground text-xs">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 max-w-[calc(100%-16px)]">
              {selectedLabels.map(label => (
                <span key={label} className="px-1.5 py-0.5 bg-brand-gold/10 border border-brand-gold/30 rounded text-[11px] text-brand-gold-hover">
                  {label}
                </span>
              ))}
            </div>
          )}
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border shadow-lg max-h-[150px] overflow-y-auto z-[100]" align="start">
        {options.map(option => (
          <div
            key={option.value}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors",
              selected.includes(option.value) ? "bg-brand-gold/10" : "hover:bg-muted/50"
            )}
            onClick={() => toggleOption(option.value)}
          >
            <div className={cn(
              "h-3.5 w-3.5 border rounded flex items-center justify-center shrink-0",
              selected.includes(option.value) ? "bg-brand-gold border-brand-gold" : "border-border"
            )}>
              {selected.includes(option.value) && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className={cn(
              "text-xs",
              selected.includes(option.value) ? "text-brand-gold-hover" : "text-foreground"
            )}>{option.label}</span>
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
    <div className={cn("border-b border-border last:border-b-0", isOpen && "bg-muted/30")}>
      <button
        className="flex items-center justify-between w-full px-5 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <ChevronDown className={cn(
          "h-2.5 w-2.5 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 bg-muted/30">
          {children}
        </div>
      )}
    </div>
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
    status: false,
    dates: false,
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
          reporter: user?.email || '',
          assignee: user?.email || '',
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
          assignee: 'UNASSIGNED',
          processStep: ['request_received', 'under_study', 'awaiting_business_response'],
        };
        break;
    }
    
    setLocalFilters(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Discard changes and close
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
      <DialogContent className="max-w-[560px] p-0 bg-card border shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground tracking-tight">Filters</h2>
          <button 
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Smart Filters */}
        <TooltipProvider>
          <div className="px-5 py-3.5 border-b border-border">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2.5">Quick Filters</div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
              {SMART_FILTER_CONFIG.map((sf) => (
                <Tooltip key={sf.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "px-3 py-1.5 border rounded text-xs cursor-pointer transition-all whitespace-nowrap shrink-0 font-medium",
                        localFilters.activeSmartFilter === sf.id
                          ? "bg-brand-gold border-brand-gold text-white"
                          : "bg-card border-border text-muted-foreground hover:border-brand-gold hover:text-brand-gold hover:bg-brand-gold/5"
                      )}
                      onClick={() => handleSmartFilterClick(sf.id)}
                    >
                      {sf.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-brand-dark text-white text-xs max-w-[280px] p-2">
                    {sf.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </TooltipProvider>

        {/* Filter Body */}
        <div className="max-h-[420px] overflow-y-auto">
          {/* People Section */}
          <AccordionSection 
            title="People" 
            isOpen={openSections.people} 
            onToggle={() => toggleSection('people')}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Reporter</label>
                <Input
                  placeholder="Search..."
                  value={localFilters.reporter || ''}
                  onChange={(e) => updateFilter('reporter', e.target.value || undefined)}
                  className="h-[34px] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Business Owner</label>
                <Input
                  placeholder="Search..."
                  value={localFilters.businessOwner || ''}
                  onChange={(e) => updateFilter('businessOwner', e.target.value || undefined)}
                  className="h-[34px] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Assignee</label>
                <Input
                  placeholder="Search..."
                  value={localFilters.assignee === 'UNASSIGNED' ? '' : (localFilters.assignee || '')}
                  onChange={(e) => updateFilter('assignee', e.target.value || undefined)}
                  className="h-[34px] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Department</label>
                <MultiSelectDropdown
                  options={DEPARTMENT_OPTIONS}
                  selected={localFilters.department || []}
                  onChange={(values) => updateFilter('department', values.length > 0 ? values : undefined)}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Process Step</label>
                <MultiSelectDropdown
                  options={PROCESS_STEPS.map(s => ({ value: s.value, label: s.label }))}
                  selected={localFilters.processStep || []}
                  onChange={(values) => updateFilter('processStep', values.length > 0 ? values : undefined)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Ageing</label>
                <MultiSelectDropdown
                  options={AGEING_BUCKETS}
                  selected={localFilters.ageing || []}
                  onChange={(values) => updateFilter('ageing', values.length > 0 ? values : undefined)}
                />
              </div>
            </div>
          </AccordionSection>

          {/* Dates Section */}
          <AccordionSection 
            title="Dates" 
            isOpen={openSections.dates} 
            onToggle={() => toggleSection('dates')}
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Submitted Date</label>
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex-1 flex items-center px-2.5 py-2 border rounded text-xs bg-card min-h-[34px] transition-all",
                        localFilters.submittedDateFrom ? "border-brand-gold" : "border-border hover:border-muted-foreground/50"
                      )}>
                        <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        {localFilters.submittedDateFrom ? format(localFilters.submittedDateFrom, "MMM d, yyyy") : <span className="text-muted-foreground">From</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-[100]" align="start">
                      <Calendar 
                        mode="single" 
                        selected={localFilters.submittedDateFrom} 
                        onSelect={(date) => updateFilter('submittedDateFrom', date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-[11px]">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex-1 flex items-center px-2.5 py-2 border rounded text-xs bg-card min-h-[34px] transition-all",
                        localFilters.submittedDateTo ? "border-brand-gold" : "border-border hover:border-muted-foreground/50"
                      )}>
                        <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        {localFilters.submittedDateTo ? format(localFilters.submittedDateTo, "MMM d, yyyy") : <span className="text-muted-foreground">To</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-[100]" align="start">
                      <Calendar 
                        mode="single" 
                        selected={localFilters.submittedDateTo} 
                        onSelect={(date) => updateFilter('submittedDateTo', date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Target Date</label>
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex-1 flex items-center px-2.5 py-2 border rounded text-xs bg-card min-h-[34px] transition-all",
                        localFilters.targetDateFrom ? "border-brand-gold" : "border-border hover:border-muted-foreground/50"
                      )}>
                        <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        {localFilters.targetDateFrom ? format(localFilters.targetDateFrom, "MMM d, yyyy") : <span className="text-muted-foreground">From</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-[100]" align="start">
                      <Calendar 
                        mode="single" 
                        selected={localFilters.targetDateFrom} 
                        onSelect={(date) => updateFilter('targetDateFrom', date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-[11px]">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex-1 flex items-center px-2.5 py-2 border rounded text-xs bg-card min-h-[34px] transition-all",
                        localFilters.targetDateTo ? "border-brand-gold" : "border-border hover:border-muted-foreground/50"
                      )}>
                        <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        {localFilters.targetDateTo ? format(localFilters.targetDateTo, "MMM d, yyyy") : <span className="text-muted-foreground">To</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-[100]" align="start">
                      <Calendar 
                        mode="single" 
                        selected={localFilters.targetDateTo} 
                        onSelect={(date) => updateFilter('targetDateTo', date)}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Quarter</label>
                <MultiSelectDropdown
                  options={QUARTER_OPTIONS}
                  selected={localFilters.quarter || []}
                  onChange={(values) => updateFilter('quarter', values.length > 0 ? values : undefined)}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Score</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={localFilters.scoreMin ?? ''}
                    onChange={(e) => updateFilter('scoreMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="h-[34px] text-xs text-center"
                    min={0}
                    max={100}
                  />
                  <span className="text-muted-foreground text-[11px]">–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={localFilters.scoreMax ?? ''}
                    onChange={(e) => updateFilter('scoreMax', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="h-[34px] text-xs text-center"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Delivery Platform</label>
                <MultiSelectDropdown
                  options={DELIVERY_PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label.en }))}
                  selected={localFilters.deliveryPlatform || []}
                  onChange={(values) => updateFilter('deliveryPlatform', values.length > 0 ? values : undefined)}
                />
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-card">
          <span className="text-[11px] text-muted-foreground mr-auto">
            <strong className="text-brand-gold">{activeFilterCount}</strong> filters applied
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearFilters}
            className="h-8 px-4 text-[13px] font-medium"
          >
            Clear All
          </Button>
          <Button 
            size="sm" 
            onClick={handleApplyFilters}
            className="h-8 px-4 text-[13px] font-medium bg-brand-gold text-white hover:bg-brand-gold-hover"
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
