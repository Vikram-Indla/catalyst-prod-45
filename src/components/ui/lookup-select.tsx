import * as React from 'react';
import { useActiveOptionValues, OptionValue } from '@/hooks/useOptionSets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LookupSelectProps {
  optionSetKey: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  showInactiveWarning?: boolean;
  includeInactiveValue?: string; // For showing an inactive value that exists in the record
  useArabicLabels?: boolean;
}

export function LookupSelect({
  optionSetKey,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  triggerClassName,
  showInactiveWarning = true,
  includeInactiveValue,
  useArabicLabels = false,
}: LookupSelectProps) {
  const { data: options = [], isLoading, error } = useActiveOptionValues(optionSetKey);

  // Check if current value is an inactive option
  const isValueInactive = React.useMemo(() => {
    if (!value || !options.length) return false;
    return !options.some(opt => opt.value_key === value);
  }, [value, options]);

  // Get display label for the current value
  const getDisplayLabel = (opt: OptionValue) => {
    if (useArabicLabels && opt.label_ar) {
      return opt.label_ar;
    }
    return opt.label;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center h-9 px-3 border rounded-md bg-muted/30", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center h-9 px-3 border border-destructive rounded-md", className)}>
        <span className="text-sm text-destructive">Failed to load options</span>
      </div>
    );
  }

  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-9 text-sm", triggerClassName, className)}>
        <SelectValue placeholder={placeholder}>
          {value && isValueInactive && showInactiveWarning ? (
            <span className="text-muted-foreground">
              {value} <span className="text-xs">(inactive)</span>
            </span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-[400]">
        {/* If there's an inactive value that needs to be shown */}
        {includeInactiveValue && !options.some(o => o.value_key === includeInactiveValue) && (
          <SelectItem 
            key={includeInactiveValue} 
            value={includeInactiveValue}
            className="text-muted-foreground"
          >
            {includeInactiveValue} <span className="text-xs">(inactive)</span>
          </SelectItem>
        )}
        
        {options.map((option) => (
          <SelectItem 
            key={option.id} 
            value={option.value_key}
            className={option.color ? cn(option.color, 'rounded px-2') : undefined}
          >
            {getDisplayLabel(option)}
          </SelectItem>
        ))}
        
        {options.length === 0 && (
          <div className="py-2 px-3 text-sm text-muted-foreground text-center">
            No options available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

// Convenience wrapper with common configurations
export function DepartmentSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="DEPARTMENT" placeholder="Select department..." {...props} />;
}

export function DeliveryPlatformSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="DELIVERY_PLATFORM" placeholder="Select platform..." {...props} />;
}

export function DeliveryTrackSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="DELIVERY_TRACK" placeholder="Select track..." {...props} />;
}

// Multi-select version of LookupSelect
export interface LookupMultiSelectProps {
  optionSetKey: string;
  value: string[] | null | undefined;
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function LookupMultiSelect({
  optionSetKey,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  triggerClassName,
}: LookupMultiSelectProps) {
  const { data: options = [], isLoading, error } = useActiveOptionValues(optionSetKey);
  const [open, setOpen] = React.useState(false);
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  
  const selectedValues = value || [];

  // Calculate dropdown position when opening - always open upward
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 240; // max height of dropdown
      setDropdownPosition({
        top: rect.top - dropdownHeight - 4, // Position above the trigger
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open]);

  const toggleValue = (valueKey: string) => {
    if (selectedValues.includes(valueKey)) {
      onChange(selectedValues.filter(v => v !== valueKey));
    } else {
      onChange([...selectedValues, valueKey]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const opt = options.find(o => o.value_key === selectedValues[0]);
      return opt?.label || selectedValues[0];
    }
    return `${selectedValues.length} quarters selected`;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center h-9 px-3 border rounded-md bg-muted/30", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center h-9 px-3 border border-destructive rounded-md", className)}>
        <span className="text-sm text-destructive">Failed to load options</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          triggerClassName
        )}
        disabled={disabled}
      >
        <span className={cn(selectedValues.length === 0 && "text-muted-foreground")}>
          {getDisplayText()}
        </span>
        <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      
      {open && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[399]" onClick={() => setOpen(false)} />
          <div 
            className="fixed z-[400] rounded-md border bg-popover shadow-lg"
            style={{ 
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: '240px' 
            }}
          >
            <div 
              className="p-1 overflow-y-auto overscroll-contain"
              style={{ maxHeight: '232px' }}
            >
              {options.map((option) => (
                <div
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleValue(option.value_key);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded hover:bg-accent",
                    selectedValues.includes(option.value_key) && "bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                    selectedValues.includes(option.value_key) 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-input"
                  )}>
                    {selectedValues.includes(option.value_key) && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              ))}
              {options.length === 0 && (
                <div className="py-2 px-3 text-sm text-muted-foreground text-center">
                  No options available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PlannedQuarterSelect(props: Omit<LookupMultiSelectProps, 'optionSetKey'>) {
  return <LookupMultiSelect optionSetKey="PLANNED_QUARTER" placeholder="Select quarters..." {...props} />;
}

export function PrioritySelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="PRIORITY" placeholder="Select priority..." {...props} />;
}

export function ComplexitySelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="COMPLEXITY" placeholder="Select complexity..." {...props} />;
}

export function UrgencySelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="URGENCY" placeholder="Select urgency..." {...props} />;
}

export function RiskRatingSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="RISK_RATING" placeholder="Select risk rating..." {...props} />;
}

export function FundingStatusSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="FUNDING_STATUS" placeholder="Select funding status..." {...props} />;
}

export function ContractTypeSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="CONTRACT_TYPE" placeholder="Select contract type..." {...props} />;
}

export function DeliveryModelSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="DELIVERY_MODEL" placeholder="Select delivery model..." {...props} />;
}

export function CapacityStatusSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="CAPACITY_STATUS" placeholder="Select capacity status..." {...props} />;
}

export function BudgetYearSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="BUDGET_YEAR" placeholder="Select budget year..." {...props} />;
}

export function ProcessStepSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="PROCESS_STEP" placeholder="Select process step..." {...props} />;
}

export function HealthStatusSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="HEALTH_STATUS" placeholder="Select health..." {...props} />;
}
