/**
 * Module 3C-2: Filter Chips Component
 */

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExportFilters } from '../../types/batch-export';

interface FilterChipsProps {
  filters: ExportFilters;
  onRemove: (type: keyof ExportFilters, value: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const hasFilters =
    filters.priority.length > 0 ||
    filters.type.length > 0 ||
    filters.status.length > 0 ||
    filters.search.trim() !== '';

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {filters.priority.map(value => (
        <Badge key={`priority-${value}`} variant="secondary" className="gap-1">
          Priority: {value}
          <button
            type="button"
            onClick={() => onRemove('priority', value)}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label={`Remove priority filter: ${value}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {filters.type.map(value => (
        <Badge key={`type-${value}`} variant="secondary" className="gap-1">
          Type: {value}
          <button
            type="button"
            onClick={() => onRemove('type', value)}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label={`Remove type filter: ${value}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {filters.status.map(value => (
        <Badge key={`status-${value}`} variant="secondary" className="gap-1">
          Status: {value}
          <button
            type="button"
            onClick={() => onRemove('status', value)}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label={`Remove status filter: ${value}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {filters.search && (
        <Badge variant="secondary" className="gap-1">
          Search: "{filters.search}"
          <button
            type="button"
            onClick={() => onRemove('search', '')}
            className="ml-1 hover:text-destructive focus:outline-none"
            aria-label="Remove search filter"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-xs h-6 px-2"
      >
        Clear all
      </Button>
    </div>
  );
}
