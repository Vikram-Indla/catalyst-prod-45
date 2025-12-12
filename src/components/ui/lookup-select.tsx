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

export function PlannedQuarterSelect(props: Omit<LookupSelectProps, 'optionSetKey'>) {
  return <LookupSelect optionSetKey="PLANNED_QUARTER" placeholder="Select quarter..." {...props} />;
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
