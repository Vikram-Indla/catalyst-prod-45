import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportModuleConfig, ImportFieldConfig } from '@/lib/import/importModuleConfig';
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

// Fields that support value mapping (lookup/select fields)
const isLookupField = (field: ImportFieldConfig | undefined): boolean => {
  if (!field) return false;
  return field.type === 'select' || field.type === 'relation';
};

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
        <div className="grid grid-cols-[40%,auto,40%,100px] gap-4 px-6 py-3 bg-muted/50 border-b">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            CSV Field
          </div>
          <div></div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Catalyst Field
          </div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
            Map Field Value
          </div>
        </div>
        
        {/* Field rows */}
        <div className="divide-y">
          {csvHeaders.map((header) => {
            const mappedField = fieldMappings.get(header) || '';
            const selectedFieldConfig = moduleConfig.fields.find(f => f.key === mappedField);
            const hasValueMapping = valueMappingEnabled.get(header) || false;
            const sample = getSampleValue(header);
            const canMapValues = isLookupField(selectedFieldConfig);
            
            return (
              <div
                key={header}
                className="grid grid-cols-[40%,auto,40%,100px] gap-4 px-6 py-4 items-center hover:bg-muted/30"
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
                    value={mappedField || 'skip'}
                    onValueChange={(value) => {
                      onFieldMappingChange(header, value === 'skip' ? '' : value);
                      // Auto-disable value mapping if field doesn't support it
                      if (value === 'skip' || !isLookupField(moduleConfig.fields.find(f => f.key === value))) {
                        onValueMappingToggle(header, false);
                      }
                    }}
                  >
                    <SelectTrigger className={cn(
                      'w-full',
                      mappedField && 'border-brand-gold/50'
                    )}>
                      <SelectValue placeholder="Don't map this field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Don't map this field</SelectItem>
                      {moduleConfig.fields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Value Mapping Checkbox */}
                <div className="flex justify-center">
                  <Checkbox
                    id={`map-value-${header}`}
                    checked={hasValueMapping}
                    onCheckedChange={(checked) => {
                      onValueMappingToggle(header, checked === true);
                    }}
                    disabled={!canMapValues}
                    className={cn(
                      "h-5 w-5",
                      !canMapValues && "opacity-40 cursor-not-allowed"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-red-500">*</span> Required field
        </span>
        <span>•</span>
        <span>Map Field Value is available for lookup/status fields only</span>
      </div>
    </div>
  );
}
