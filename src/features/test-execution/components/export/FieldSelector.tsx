/**
 * Module 3C-2: Field Selector Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import type { ExportField } from '../../types/batch-export';

interface FieldSelectorProps {
  fields: ExportField[];
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onSelectRequired: () => void;
}

export function FieldSelector({
  fields,
  onToggle,
  onSelectAll,
  onSelectRequired,
}: FieldSelectorProps) {
  const selectedCount = fields.filter(f => f.selected).length;
  const requiredCount = fields.filter(f => f.required).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Fields</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCount} of {fields.length} fields selected
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onSelectRequired}>
            Required Only
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fields.map(field => (
          <div
            key={field.key}
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg border transition-colors',
              field.selected ? 'bg-accent/50 border-accent' : 'bg-background border-border',
              field.required && 'cursor-not-allowed opacity-75'
            )}
          >
            <Checkbox
              id={`field-${field.key}`}
              checked={field.selected}
              onCheckedChange={() => !field.required && onToggle(field.key)}
              disabled={field.required}
              aria-describedby={field.required ? `field-${field.key}-required` : undefined}
            />
            <Label
              htmlFor={`field-${field.key}`}
              className={cn(
                'flex-1 text-sm cursor-pointer',
                field.required && 'cursor-not-allowed'
              )}
            >
              {field.label}
            </Label>
            {field.required && (
              <Lock
                className="w-3 h-3 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {field.required && (
              <span id={`field-${field.key}-required`} className="sr-only">
                Required field, cannot be deselected
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        <Lock className="w-3 h-3 inline-block mr-1" aria-hidden="true" />
        {requiredCount} required fields are always included
      </p>
    </div>
  );
}
