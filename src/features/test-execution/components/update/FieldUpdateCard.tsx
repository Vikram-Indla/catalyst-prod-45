/**
 * Module 3C-3: Field Update Card Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import type { UpdatableField } from '../../types/batch-update';

interface FieldUpdateCardProps {
  field: UpdatableField;
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  onRemove: () => void;
}

export function FieldUpdateCard({
  field,
  value,
  onValueChange,
  onRemove,
}: FieldUpdateCardProps) {
  const hasValue = value !== undefined && value !== null;

  return (
    <Card
      className={cn(
        'transition-all',
        hasValue && 'border-primary ring-1 ring-primary/20'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {hasValue && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <Label htmlFor={`field-${field.key}`} className="text-sm font-medium">
                {field.label}
              </Label>
            </div>

            {field.type === 'select' && field.options && (
              <Select
                value={value ?? ''}
                onValueChange={v => onValueChange(v || null)}
              >
                <SelectTrigger id={`field-${field.key}`} className="w-full">
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {hasValue && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label={`Remove ${field.label} update`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
