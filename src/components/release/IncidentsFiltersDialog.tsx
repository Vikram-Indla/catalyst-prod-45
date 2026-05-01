import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip } from '@/components/ads';
import { ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IncidentFilters, IncidentStatus, SupportLevel } from '@/types/incident';

type SmartFilterType = 'open' | 'critical' | 'major' | 'sla_breach' | null;

interface IncidentsFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: IncidentFilters;
  onFiltersChange: (filters: IncidentFilters) => void;
}

const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'triage', label: 'Triage' },
  { value: 'to_committee', label: 'To Committee' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

const SUPPORT_LEVEL_OPTIONS: { value: SupportLevel; label: string }[] = [
  { value: 'L1', label: 'L1 - First Line' },
  { value: 'L2', label: 'L2 - Second Line' },
  { value: 'L3', label: 'L3 - Third Line' },
];

const SMART_FILTER_CONFIG = [
  { 
    id: 'open' as SmartFilterType, 
    label: 'Open Incidents', 
    tooltip: 'Shows all incidents that are not Resolved, Converted, or Closed.' 
  },
  { 
    id: 'critical' as SmartFilterType, 
    label: 'SEV1/SEV2', 
    tooltip: 'Shows incidents with SEV1 or SEV2 severity.' 
  },
  { 
    id: 'major' as SmartFilterType, 
    label: 'Major Incidents', 
    tooltip: 'Shows incidents flagged as Major.' 
  },
  { 
    id: 'sla_breach' as SmartFilterType, 
    label: 'SLA Breach', 
    tooltip: 'Shows incidents with breached SLAs.' 
  },
];

// Multi-select dropdown component
function MultiSelectDropdown<T extends string>({ 
  options, 
  selected, 
  onChange, 
  placeholder = 'Select...',
}: { 
  options: { value: T; label: string }[]; 
  selected: T[]; 
  onChange: (values: T[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: T) => {
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
            "flex items-center justify-between w-full h-10 px-3 border rounded-md text-sm bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] transition-colors",
            selected.length > 0 ? "border-border text-foreground" : "border-border text-muted-foreground",
            "hover:border-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-brand-primary"
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border shadow-lg rounded-md max-h-[200px] overflow-y-auto z-[100]" align="start">
        {options.map(option => (
          <div
            key={option.value}
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-sm transition-colors text-sm",
              selected.includes(option.value) ? "bg-brand-primary/10 text-foreground" : "hover:bg-muted/50 text-foreground"
            )}
            onClick={() => toggleOption(option.value)}
          >
            <div className={cn(
              "h-4 w-4 border rounded flex items-center justify-center shrink-0",
              selected.includes(option.value) ? "bg-brand-primary border-brand-primary" : "border-border"
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

export function IncidentsFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: IncidentsFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<IncidentFilters>(filters);
  const [activeSmartFilter, setActiveSmartFilter] = useState<SmartFilterType>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    supportLevel: true,
  });

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      setActiveSmartFilter(null);
    }
  }, [open, filters]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSmartFilterClick = (filterId: SmartFilterType) => {
    setActiveSmartFilter(filterId);
    let newFilters: IncidentFilters = {};
    
    switch (filterId) {
      case 'open':
        newFilters = {
          status: ['open', 'triage', 'to_committee', 'in_progress'],
        };
        break;
      case 'critical':
        newFilters = {
          severity: ['SEV1', 'SEV2'],
        };
        break;
      case 'major':
        // Filter will be applied in hook
        break;
      case 'sla_breach':
        // Filter will be applied in hook
        break;
    }
    
    setLocalFilters(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    setActiveSmartFilter(null);
  };

  const handleApplyFilters = () => {
    onFiltersChange({ ...localFilters });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const updateFilter = <K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
    setActiveSmartFilter(null);
  };

  const activeFilterCount = Object.entries(localFilters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-[480px] w-[95vw] p-0 bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border shadow-xl rounded-lg overflow-hidden gap-0 [&>button.absolute]:hidden">
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
        <div className="px-4 sm:px-5 py-4 border-b border-border bg-muted/20">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Filters</div>
          <div className="flex flex-wrap gap-2">
            {SMART_FILTER_CONFIG.map((sf) => (
              <Tooltip key={sf.id} content={sf.tooltip} position="bottom">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1.5 border rounded-md text-sm cursor-pointer transition-all whitespace-nowrap font-medium",
                    activeSmartFilter === sf.id
                      ? "bg-brand-primary border-brand-primary text-white"
                      : "bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border-border text-foreground hover:border-brand-primary hover:bg-brand-primary/5"
                  )}
                  onClick={() => handleSmartFilterClick(sf.id)}
                >
                  {sf.label}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Filter Body */}
        <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto scroll-smooth overscroll-contain">
          {/* Status Section */}
          <AccordionSection 
            title="Status" 
            isOpen={openSections.status} 
            onToggle={() => toggleSection('status')}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <MultiSelectDropdown<IncidentStatus>
                options={STATUS_OPTIONS}
                selected={localFilters.status || []}
                onChange={(values) => updateFilter('status', values.length > 0 ? values : undefined)}
                placeholder="All statuses"
              />
            </div>
          </AccordionSection>

          {/* Support Level Section */}
          <AccordionSection 
            title="Support Level" 
            isOpen={openSections.supportLevel} 
            onToggle={() => toggleSection('supportLevel')}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Support Level</label>
              <MultiSelectDropdown<SupportLevel>
                options={SUPPORT_LEVEL_OPTIONS}
                selected={localFilters.support_level || []}
                onChange={(values) => updateFilter('support_level', values.length > 0 ? values : undefined)}
                placeholder="All levels"
              />
            </div>
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-t border-border bg-muted/10">
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClearFilters}
          >
            Clear all{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} className="h-9 px-4">
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleApplyFilters}
              className="h-9 px-4 bg-brand-primary text-white hover:bg-brand-primary-hover"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
