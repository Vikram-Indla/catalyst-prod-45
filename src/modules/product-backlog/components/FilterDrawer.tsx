/**
 * FilterDrawer - Enterprise filter panel for Product Backlog
 * Opens as a slide-out drawer with multi-select filters
 */

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
  filterGroups: FilterGroup[];
}

export function FilterDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  filterGroups,
}: FilterDrawerProps) {
  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>(filters);

  // Sync draft with applied when opening
  useEffect(() => {
    if (isOpen) {
      setDraftFilters(filters);
    }
  }, [isOpen, filters]);

  const handleToggleOption = (groupId: string, value: string) => {
    setDraftFilters(prev => {
      const current = prev[groupId] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [groupId]: newValues };
    });
  };

  const handleApply = () => {
    onFiltersChange(draftFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: Record<string, string[]> = {};
    filterGroups.forEach(g => { clearedFilters[g.id] = []; });
    setDraftFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  const getActiveCount = () => {
    return Object.values(draftFilters).reduce((acc, arr) => acc + arr.length, 0);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-[360px] sm:w-[400px] p-0 flex flex-col"
        style={{ backgroundColor: 'var(--surface-1)' }}
      >
        <SheetHeader className="px-5 py-4 border-b" style={{ borderColor: 'var(--divider)' }}>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
              Filters
            </SheetTitle>
            {getActiveCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs h-7"
                style={{ color: 'var(--text-2)' }}
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {filterGroups.map(group => (
            <div key={group.id}>
              <h4 
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-2)' }}
              >
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.options.map(option => {
                  const isChecked = (draftFilters[group.id] || []).includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                        isChecked ? "bg-accent-muted" : "hover:bg-surface-3"
                      )}
                      style={{
                        backgroundColor: isChecked ? 'var(--accent-muted)' : undefined,
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleOption(group.id, option.value)}
                        className="border-border data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
                      />
                      <span 
                        className="text-sm"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div 
          className="px-5 py-4 border-t flex gap-3"
          style={{ 
            borderColor: 'var(--divider)',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
