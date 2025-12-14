import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Check, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';

const quarterOptions = [
  { value: 'Q1-2025', label: 'Q1 2025' },
  { value: 'Q2-2025', label: 'Q2 2025' },
  { value: 'Q3-2025', label: 'Q3 2025' },
  { value: 'Q4-2025', label: 'Q4 2025' },
  { value: 'Q1-2026', label: 'Q1 2026' },
  { value: 'Q2-2026', label: 'Q2 2026' },
  { value: 'Q3-2026', label: 'Q3 2026' },
  { value: 'Q4-2026', label: 'Q4 2026' },
];

export function IndustryFilterBar() {
  const { industryFilters, setIndustryFilters } = useCatalystContext();
  const { data: demandProcessSteps = [] } = useActiveDemandProcessSteps();
  const [deliveryPlatformOpen, setDeliveryPlatformOpen] = useState(false);
  const [processStepOpen, setProcessStepOpen] = useState(false);
  const [quarterOpen, setQuarterOpen] = useState(false);

  const deliveryPlatforms = industryFilters?.deliveryPlatforms || [];
  const processSteps = industryFilters?.processSteps || [];
  const quarters = industryFilters?.quarters || [];

  const handleDeliveryPlatformToggle = (value: string) => {
    const newPlatforms = deliveryPlatforms.includes(value)
      ? deliveryPlatforms.filter(p => p !== value)
      : [...deliveryPlatforms, value];
    setIndustryFilters({ ...industryFilters, deliveryPlatforms: newPlatforms, processSteps, quarters });
  };

  const handleProcessStepToggle = (value: string) => {
    const newSteps = processSteps.includes(value)
      ? processSteps.filter(s => s !== value)
      : [...processSteps, value];
    setIndustryFilters({ ...industryFilters, deliveryPlatforms, processSteps: newSteps, quarters });
  };

  const handleQuarterToggle = (value: string) => {
    const newQuarters = quarters.includes(value)
      ? quarters.filter(q => q !== value)
      : [...quarters, value];
    setIndustryFilters({ ...industryFilters, deliveryPlatforms, processSteps, quarters: newQuarters });
  };

  const clearAllFilters = () => {
    setIndustryFilters({ deliveryPlatforms: [], processSteps: [], quarters: [] });
  };

  const getDeliveryPlatformDisplayText = () => {
    if (deliveryPlatforms.length === 0) return 'Platform';
    if (deliveryPlatforms.length === 1) {
      return DELIVERY_PLATFORM_OPTIONS.find(p => p.value === deliveryPlatforms[0])?.label.en || deliveryPlatforms[0];
    }
    return `${deliveryPlatforms.length} platforms`;
  };

  const getProcessStepDisplayText = () => {
    if (processSteps.length === 0) return 'Status';
    if (processSteps.length === 1) {
      return demandProcessSteps.find(s => s.value === processSteps[0])?.label || processSteps[0];
    }
    return `${processSteps.length} statuses`;
  };

  const getQuarterDisplayText = () => {
    if (quarters.length === 0) return 'Quarter';
    if (quarters.length === 1) {
      return quarterOptions.find(q => q.value === quarters[0])?.label || quarters[0];
    }
    return `${quarters.length} quarters`;
  };

  const activeFilterCount = deliveryPlatforms.length + processSteps.length + quarters.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-muted-foreground" />
      
      {/* Delivery Platform Filter */}
      <Popover open={deliveryPlatformOpen} onOpenChange={setDeliveryPlatformOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-dashed font-normal",
              deliveryPlatforms.length > 0 && "border-brand-gold text-brand-gold"
            )}
          >
            {getDeliveryPlatformDisplayText()}
            <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0 bg-popover border shadow-lg z-50" align="start">
          <div className="max-h-60 overflow-auto">
            {DELIVERY_PLATFORM_OPTIONS.map(platform => (
              <div
                key={platform.value}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                onClick={() => handleDeliveryPlatformToggle(platform.value)}
              >
                <div className={cn(
                  "h-4 w-4 border rounded flex items-center justify-center",
                  deliveryPlatforms.includes(platform.value) ? "bg-brand-gold border-brand-gold" : "border-border"
                )}>
                  {deliveryPlatforms.includes(platform.value) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm">{platform.label.en}</span>
              </div>
            ))}
          </div>
          {deliveryPlatforms.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIndustryFilters({ ...industryFilters, deliveryPlatforms: [], processSteps, quarters })}
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Process Step Filter */}
      <Popover open={processStepOpen} onOpenChange={setProcessStepOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-dashed font-normal",
              processSteps.length > 0 && "border-brand-gold text-brand-gold"
            )}
          >
            {getProcessStepDisplayText()}
            <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0 bg-popover border shadow-lg z-50" align="start">
          <div className="max-h-60 overflow-auto">
            {demandProcessSteps.map(step => (
              <div
                key={step.value}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                onClick={() => handleProcessStepToggle(step.value)}
              >
                <div className={cn(
                  "h-4 w-4 border rounded flex items-center justify-center",
                  processSteps.includes(step.value) ? "bg-brand-gold border-brand-gold" : "border-border"
                )}>
                  {processSteps.includes(step.value) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm">{step.label}</span>
              </div>
            ))}
          </div>
          {processSteps.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIndustryFilters({ ...industryFilters, deliveryPlatforms, processSteps: [], quarters })}
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Quarter Filter */}
      <Popover open={quarterOpen} onOpenChange={setQuarterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 border-dashed font-normal",
              quarters.length > 0 && "border-brand-gold text-brand-gold"
            )}
          >
            {getQuarterDisplayText()}
            <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0 bg-popover border shadow-lg z-50" align="start">
          <div className="max-h-60 overflow-auto">
            {quarterOptions.map(quarter => (
              <div
                key={quarter.value}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                onClick={() => handleQuarterToggle(quarter.value)}
              >
                <div className={cn(
                  "h-4 w-4 border rounded flex items-center justify-center",
                  quarters.includes(quarter.value) ? "bg-brand-gold border-brand-gold" : "border-border"
                )}>
                  {quarters.includes(quarter.value) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm">{quarter.label}</span>
              </div>
            ))}
          </div>
          {quarters.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIndustryFilters({ ...industryFilters, deliveryPlatforms, processSteps, quarters: [] })}
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          onClick={clearAllFilters}
        >
          <X className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}
