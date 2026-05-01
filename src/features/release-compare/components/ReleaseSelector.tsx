/**
 * Release Selector Component
 * Multi-select dropdowns for choosing releases to compare (2-4)
 */

import React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReleaseOption } from '../types';

interface ReleaseSelectorProps {
  availableReleases: ReleaseOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelections?: number;
  minSelections?: number;
}

export function ReleaseSelector({
  availableReleases,
  selectedIds,
  onSelectionChange,
  maxSelections = 4,
  minSelections = 2,
}: ReleaseSelectorProps) {
  const canAdd = selectedIds.length < maxSelections;
  const canRemove = selectedIds.length > minSelections;
  
  const handleSelect = (index: number, value: string) => {
    const newIds = [...selectedIds];
    newIds[index] = value;
    onSelectionChange(newIds);
  };
  
  const handleAdd = () => {
    if (!canAdd) return;
    // Find first available release not already selected
    const available = availableReleases.find(r => !selectedIds.includes(r.id));
    if (available) {
      onSelectionChange([...selectedIds, available.id]);
    }
  };
  
  const handleRemove = (index: number) => {
    if (!canRemove) return;
    const newIds = selectedIds.filter((_, i) => i !== index);
    onSelectionChange(newIds);
  };
  
  const getAvailableOptions = (currentIndex: number) => {
    return availableReleases.filter(
      r => r.id === selectedIds[currentIndex] || !selectedIds.includes(r.id)
    );
  };
  
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Select Releases (2-4)
      </div>
      
      <div className="flex items-center gap-3 flex-wrap">
        {selectedIds.map((id, index) => (
          <div key={index} className="flex items-center gap-1">
            <Select
              value={id}
              onValueChange={(value) => handleSelect(index, value)}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Select release" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {getAvailableOptions(index).map((release) => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() => handleRemove(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        
        {canAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}
