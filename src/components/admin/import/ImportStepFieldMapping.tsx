import { ArrowRight, AlertTriangle, HelpCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImportModuleConfig, isLookupField } from '@/lib/import/importModuleConfig';
import { cn } from '@/lib/utils';

interface ImportStepFieldMappingProps {
  moduleConfig: ImportModuleConfig;
  csvHeaders: string[];
  parsedData: Record<string, string>[];
  fieldMappings: Map<string, string>;
  valueMappingEnabled: Map<string, boolean>;
  onFieldMappingChange: (csvColumn: string, dbField: string) => void;
  onValueMappingToggle: (csvColumn: string, enabled: boolean) => void;
}

export function ImportStepFieldMapping({
  moduleConfig,
  csvHeaders,
  parsedData,
  fieldMappings,
  valueMappingEnabled,
  onFieldMappingChange,
  onValueMappingToggle,
}: ImportStepFieldMappingProps) {
  // Get sample value from first row
  const getSampleValue = (header: string) => {
    if (parsedData.length === 0) return '';
    const value = parsedData[0][header];
    if (!value) return '';
    return value.length > 30 ? value.substring(0, 30) + '...' : value;
  };
  
  // Check if required field is mapped
  const requiredFieldsMapped = moduleConfig.fields
    .filter(f => f.required)
    .every(f => Array.from(fieldMappings.values()).includes(f.key));
  
  // Get the first unmapped required field for the error message
  const unmappedRequiredField = moduleConfig.fields
    .filter(f => f.required)
    .find(f => !Array.from(fieldMappings.values()).includes(f.key));
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Map fields</h2>
          <p className="text-sm text-muted-foreground">
            Select the CSV fields to import, then set how you would like these converted to fields in Catalyst.
            You can optionally map field values on the next screen.
          </p>
        </div>
        
        {!requiredFieldsMapped && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Please note: A Catalyst <strong>{unmappedRequiredField?.label}</strong> field mapping is required to enable import.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[40%,auto,40%,120px] gap-4 px-6 py-3 bg-muted/50 border-b">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              CSV Field
            </div>
            <div></div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Catalyst Field
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
              <div className="flex items-center justify-center gap-1">
                <span>Map Value</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs bg-popover text-popover-foreground border shadow-md z-50">
                    <p>Only available for lookup fields (Status, Process Step, Delivery Platform, etc.)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          
          {/* Field rows */}
          <div className="divide-y">
            {csvHeaders.map((header) => {
              const mappedFieldKey = fieldMappings.get(header) || '';
              const selectedFieldConfig = moduleConfig.fields.find(f => f.key === mappedFieldKey);
              const hasValueMapping = valueMappingEnabled.get(header) || false;
              const sample = getSampleValue(header);
              const canMapValues = isLookupField(selectedFieldConfig);
              const isFieldMapped = !!mappedFieldKey;
              
              // Determine checkbox state and tooltip message
              let checkboxDisabled = true;
              let tooltipMessage = '';
              
              if (!isFieldMapped) {
                checkboxDisabled = true;
                tooltipMessage = 'Select a Catalyst field first to enable value mapping.';
              } else if (!canMapValues) {
                checkboxDisabled = true;
                tooltipMessage = `"${selectedFieldConfig?.label}" is not a lookup field. Map Value is only available for lookup fields (Status, Process Step, Delivery Platform, etc.).`;
              } else {
                checkboxDisabled = false;
                tooltipMessage = 'Click to enable value mapping for this lookup field.';
              }
              
              return (
                <div
                  key={header}
                  className="grid grid-cols-[40%,auto,40%,120px] gap-4 px-6 py-4 items-center hover:bg-muted/30"
                >
                  {/* CSV Field */}
                  <div>
                    <div className="font-medium text-sm text-foreground">{header}</div>
                    {sample && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        (e.g. {sample})
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Catalyst Field Dropdown */}
                  <div>
                    <Select
                      value={mappedFieldKey || 'skip'}
                      onValueChange={(value) => {
                        const newFieldKey = value === 'skip' ? '' : value;
                        onFieldMappingChange(header, newFieldKey);
                        // Auto-disable value mapping if field doesn't support it
                        const newFieldConfig = moduleConfig.fields.find(f => f.key === newFieldKey);
                        if (!isLookupField(newFieldConfig)) {
                          onValueMappingToggle(header, false);
                        }
                      }}
                    >
                      <SelectTrigger className={cn(
                        'w-full bg-background',
                        mappedFieldKey && 'border-brand-gold/50'
                      )}>
                        <SelectValue placeholder="Don't map this field" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="skip">Don't map this field</SelectItem>
                        {moduleConfig.fields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                            {field.required && ' *'}
                            {field.isLookup && ' (lookup)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Value Mapping Checkbox with Tooltip */}
                  <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center justify-center">
                          <Checkbox
                            id={`map-value-${header}`}
                            checked={hasValueMapping}
                            onCheckedChange={(checked) => {
                              if (!checkboxDisabled) {
                                onValueMappingToggle(header, checked === true);
                              }
                            }}
                            disabled={checkboxDisabled}
                            className={cn(
                              "h-5 w-5 border-2 transition-all",
                              checkboxDisabled 
                                ? "opacity-40 cursor-not-allowed border-muted-foreground/30 bg-muted/50" 
                                : "cursor-pointer border-brand-gold hover:border-brand-gold-hover data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                            )}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[280px] text-xs bg-popover text-popover-foreground border shadow-md z-50">
                        <p>{tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="text-red-500">*</span> Required field
          </span>
          <span className="text-muted-foreground/50">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">(lookup)</span> = Value mapping available
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
