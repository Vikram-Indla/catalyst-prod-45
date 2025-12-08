import { useState } from 'react';
import { useCustomFields, type CustomFieldDef } from '@/hooks/useCustomFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2 } from 'lucide-react';

interface CustomFieldsSectionProps {
  entityType: 'epic' | 'feature' | 'story' | 'defect';
  entityId: string;
}

export function CustomFieldsSection({ entityType, entityId }: CustomFieldsSectionProps) {
  const { fieldsWithValues, isLoading, updateFieldValue } = useCustomFields(entityType, entityId);

  const handleFieldChange = (fieldDef: CustomFieldDef, value: any) => {
    updateFieldValue.mutate({ fieldDefId: fieldDef.id, value });
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-brand-gold" />
            Custom Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (fieldsWithValues.length === 0) {
    return (
      <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-brand-gold" />
            Custom Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            No custom fields defined for this {entityType}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-brand-gold" />
          Custom Fields
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {fieldsWithValues.map((field) => (
          <CustomFieldInput
            key={field.id}
            field={field}
            value={field.value}
            onChange={(value) => handleFieldChange(field, value)}
            disabled={updateFieldValue.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface CustomFieldInputProps {
  field: CustomFieldDef & { value: any };
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function CustomFieldInput({ field, value, onChange, disabled }: CustomFieldInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  switch (field.field_type) {
    case 'text':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium flex items-center gap-1">
            {field.name}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          <Input
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
            disabled={disabled}
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium flex items-center gap-1">
            {field.name}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value ? Number(e.target.value) : null)}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        </div>
      );

    case 'date':
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium flex items-center gap-1">
            {field.name}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          <Input
            type="date"
            value={localValue || ''}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onChange(e.target.value);
            }}
            disabled={disabled}
          />
        </div>
      );

    case 'select':
      const options = field.options_json?.options || [];
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium flex items-center gap-1">
            {field.name}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          <Select
            value={value || ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'multi_select':
      const multiOptions = field.options_json?.options || [];
      const selectedValues: string[] = value || [];
      return (
        <div className="space-y-1">
          <Label className="text-xs font-medium flex items-center gap-1">
            {field.name}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
            {multiOptions.map((opt) => {
              const isSelected = selectedValues.includes(opt);
              return (
                <Badge
                  key={opt}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    if (disabled) return;
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== opt)
                      : [...selectedValues, opt];
                    onChange(newValues);
                  }}
                >
                  {opt}
                </Badge>
              );
            })}
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              {field.name}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
          <Switch
            checked={value === true}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        </div>
      );

    default:
      return null;
  }
}
