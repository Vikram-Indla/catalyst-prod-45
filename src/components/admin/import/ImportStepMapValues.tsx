import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportModuleConfig } from '@/lib/import/importModuleConfig';

interface ImportStepMapValuesProps {
  moduleConfig: ImportModuleConfig;
  csvHeaders: string[];
  parsedData: Record<string, string>[];
  fieldMappings: Map<string, string>;
  valueMappingEnabled: Map<string, boolean>;
  valueMappings: Map<string, Map<string, string>>;
  onValueMappingChange: (csvColumn: string, csvValue: string, targetValue: string) => void;
}

export function ImportStepMapValues({
  moduleConfig,
  csvHeaders,
  parsedData,
  fieldMappings,
  valueMappingEnabled,
  valueMappings,
  onValueMappingChange,
}: ImportStepMapValuesProps) {
  // Get fields that have value mapping enabled
  const fieldsToMap = csvHeaders.filter(header => {
    const mappedField = fieldMappings.get(header);
    return valueMappingEnabled.get(header) && mappedField;
  });
  
  // Get unique values for a CSV column
  const getUniqueValues = (header: string): string[] => {
    const values = new Set<string>();
    parsedData.forEach(row => {
      const val = row[header]?.trim();
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  };
  
  if (fieldsToMap.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Map values</h2>
          <p className="text-sm text-muted-foreground">
            Catalyst will automatically map all field values for you where possible. If you'd like to 
            individually map field values, return to the previous screen and select the check-box next 
            to the relevant fields.
          </p>
        </div>
        
        <div className="border-t pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>No fields selected for value mapping.</p>
            <p className="text-sm mt-1">
              Go back to the previous step and enable "Map field value" for any fields you want to customize.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Map values</h2>
        <p className="text-sm text-muted-foreground">
          Map the values from your CSV to the corresponding Catalyst values.
        </p>
      </div>
      
      <div className="border-t pt-6 space-y-8">
        {fieldsToMap.map((header) => {
          const mappedFieldKey = fieldMappings.get(header);
          const fieldConfig = moduleConfig.fields.find(f => f.key === mappedFieldKey);
          const uniqueValues = getUniqueValues(header);
          const currentMappings = valueMappings.get(header) || new Map();
          
          if (!fieldConfig || !fieldConfig.options) return null;
          
          return (
            <div key={header} className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">{header}</Label>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-sm text-muted-foreground">{fieldConfig.label}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-2 border-b">
                <div>CSV Value</div>
                <div>Catalyst Value</div>
              </div>
              
              <div className="space-y-3">
                {uniqueValues.map((csvValue) => {
                  const mappedValue = currentMappings.get(csvValue) || '';
                  
                  return (
                    <div key={csvValue} className="grid grid-cols-2 gap-4 items-center">
                      <div className="text-sm text-foreground">{csvValue}</div>
                      <Select
                        value={mappedValue || 'auto'}
                        onValueChange={(value) => 
                          onValueMappingChange(header, csvValue, value === 'auto' ? '' : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Auto-detect" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-detect</SelectItem>
                          {fieldConfig.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
