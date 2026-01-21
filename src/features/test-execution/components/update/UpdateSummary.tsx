/**
 * Module 3C-3: Update Summary Component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Settings, ArrowRight } from 'lucide-react';
import { FIELD_LABELS } from '../../types/batch-update';

interface UpdateSummaryProps {
  selectedCount: number;
  fieldsToUpdate: Record<string, string | null>;
}

export function UpdateSummary({ selectedCount, fieldsToUpdate }: UpdateSummaryProps) {
  const fieldEntries = Object.entries(fieldsToUpdate);

  if (selectedCount === 0 && fieldEntries.length === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Update Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selected count */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{selectedCount}</strong> test case{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Fields to update */}
        {fieldEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Fields to update:</p>
            <div className="flex flex-wrap gap-2">
              {fieldEntries.map(([field, value]) => (
                <Badge key={field} variant="secondary" className="gap-1">
                  {FIELD_LABELS[field] || field}
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-medium">
                    {value ? value.charAt(0).toUpperCase() + value.slice(1) : '(clear)'}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
