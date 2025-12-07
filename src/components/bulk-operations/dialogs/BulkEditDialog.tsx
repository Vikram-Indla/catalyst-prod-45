// Bulk Edit Dialog - Edit multiple fields for selected items
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle } from 'lucide-react';
import { BulkOperationConfig, BulkOperationField, BulkOperationSummary } from '../types';
import { BulkResultsSummary } from '../BulkResultsSummary';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BulkOperationConfig;
  selectedIds: string[];
  selectedItems: Array<{ id: string; title?: string; request_key?: string }>;
  onExecute: (fields: Record<string, any>) => Promise<BulkOperationSummary>;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  config,
  selectedIds,
  selectedItems,
  onExecute,
}: BulkEditDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<BulkOperationSummary | null>(null);

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const newSet = new Set(selectedFields);
    if (checked) {
      newSet.add(fieldId);
    } else {
      newSet.delete(fieldId);
      // Clear value when unchecked
      const newValues = { ...fieldValues };
      delete newValues[fieldId];
      setFieldValues(newValues);
    }
    setSelectedFields(newSet);
  };

  const handleValueChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleExecute = async () => {
    // Build the fields object with dbColumn mapping
    const fieldsToUpdate: Record<string, any> = {};
    config.editableFields.forEach(field => {
      if (selectedFields.has(field.id) && fieldValues[field.id] !== undefined) {
        fieldsToUpdate[field.dbColumn] = fieldValues[field.id];
      }
    });

    if (Object.keys(fieldsToUpdate).length === 0) return;

    setIsExecuting(true);
    try {
      const result = await onExecute(fieldsToUpdate);
      setResults(result);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setSelectedFields(new Set());
    setFieldValues({});
    setResults(null);
    onOpenChange(false);
  };

  const renderFieldInput = (field: BulkOperationField) => {
    const isEnabled = selectedFields.has(field.id);
    const value = fieldValues[field.id];

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => handleValueChange(field.id, val)}
            disabled={!isEnabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'user':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            placeholder={`Enter ${field.label}`}
            disabled={!isEnabled}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            disabled={!isEnabled}
          />
        );
    }
  };

  const canExecute = selectedFields.size > 0 && 
    Array.from(selectedFields).every(fId => fieldValues[fId] !== undefined && fieldValues[fId] !== '');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Edit {config.entityLabelPlural}</DialogTitle>
          <DialogDescription>
            Select fields to update for {selectedIds.length} selected {selectedIds.length === 1 ? config.entityLabel.toLowerCase() : config.entityLabelPlural.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <BulkResultsSummary 
            results={results} 
            entityLabel={config.entityLabel}
            onClose={handleClose}
          />
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4 py-4">
                {config.editableFields.map(field => (
                  <div key={field.id} className="flex items-start gap-4 p-3 border rounded-lg bg-muted/30">
                    <Checkbox
                      id={`field-${field.id}`}
                      checked={selectedFields.has(field.id)}
                      onCheckedChange={(checked) => handleFieldToggle(field.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Label 
                        htmlFor={`field-${field.id}`}
                        className={selectedFields.has(field.id) ? 'text-foreground' : 'text-muted-foreground'}
                      >
                        {field.label}
                      </Label>
                      {renderFieldInput(field)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isExecuting}>
                Cancel
              </Button>
              <Button 
                onClick={handleExecute} 
                disabled={!canExecute || isExecuting}
                className="bg-brand-gold hover:bg-brand-gold/90 text-white"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing {selectedIds.length} items...
                  </>
                ) : (
                  <>Update {selectedIds.length} {selectedIds.length === 1 ? config.entityLabel : config.entityLabelPlural}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
