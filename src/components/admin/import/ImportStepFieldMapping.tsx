import { useState } from 'react';
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
            Please note: A Catalyst <strong>{moduleConfig.fields.find(f => f.required)?.label}</strong> field mapping is required to enable import.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="border-t pt-6">
        {/* Header */}
        <div className="grid grid-cols-[1fr,32px,1fr,120px] gap-4 pb-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div>CSV Field</div>
          <div></div>
          <div>Catalyst field</div>
          <div className="text-center">Map field value</div>
        </div>
        
        {/* Field rows */}
        <div className="divide-y">
          {csvHeaders.map((header) => {
            const mappedField = fieldMappings.get(header) || '';
            const selectedFieldConfig = moduleConfig.fields.find(f => f.key === mappedField);
            const hasValueMapping = valueMappingEnabled.get(header) || false;
            const sample = getSampleValue(header);
            
            return (
              <div
                key={header}
                className="grid grid-cols-[1fr,32px,1fr,120px] gap-4 py-4 items-center"
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
                    onValueChange={(value) => onFieldMappingChange(header, value === 'skip' ? '' : value)}
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
                    checked={hasValueMapping}
                    onCheckedChange={(checked) => onValueMappingToggle(header, checked === true)}
                    disabled={!mappedField || !selectedFieldConfig || selectedFieldConfig.type !== 'select'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
