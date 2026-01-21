/**
 * Module 3C-2: Format Selector Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, FileJson, FileText, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ExportFormat } from '../../types/batch-export';
import { EXPORT_FORMATS } from '../../types/batch-export';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileSpreadsheet,
  FileJson,
  FileText,
};

interface FormatSelectorProps {
  selectedFormat: ExportFormat;
  onSelect: (format: ExportFormat) => void;
}

export function FormatSelector({ selectedFormat, onSelect }: FormatSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Choose Export Format</h3>
        <p className="text-sm text-muted-foreground">
          Select the file format for your test cases export
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="radiogroup" aria-label="Export format">
        {EXPORT_FORMATS.map(format => {
          const isSelected = selectedFormat === format.id;
          const Icon = iconMap[format.icon] || FileText;

          return (
            <Card
              key={format.id}
              className={cn(
                'relative cursor-pointer transition-all hover:shadow-md',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                isSelected && 'border-primary ring-2 ring-primary/20'
              )}
              onClick={() => onSelect(format.id)}
            >
              <CardContent className="p-4">
                <input
                  type="radio"
                  name="export-format"
                  value={format.id}
                  checked={isSelected}
                  onChange={() => onSelect(format.id)}
                  className="sr-only"
                  aria-label={`${format.name} format`}
                />

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center text-center space-y-2">
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-lg',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">{format.name}</p>
                    <p className="text-xs text-muted-foreground">{format.extension}</p>
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {format.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
