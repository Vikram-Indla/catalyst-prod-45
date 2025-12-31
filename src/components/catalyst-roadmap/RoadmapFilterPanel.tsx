/**
 * Roadmap Filter Panel - Left filter drawer
 */

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapFilters, GroupByMode, ObjectiveStatus } from '@/types/roadmap';
import { STATUS_COLORS } from '@/types/roadmap';

interface RoadmapFilterPanelProps {
  isOpen: boolean;
  filters: RoadmapFilters;
  groupBy: GroupByMode;
  allOwners: string[];
  statusCounts: Record<ObjectiveStatus, number>;
  onClose: () => void;
  onFiltersChange: (filters: RoadmapFilters) => void;
  onGroupByChange: (groupBy: GroupByMode) => void;
  onClearFilters: () => void;
}

export function RoadmapFilterPanel({
  isOpen,
  filters,
  groupBy,
  allOwners,
  statusCounts,
  onClose,
  onFiltersChange,
  onGroupByChange,
  onClearFilters,
}: RoadmapFilterPanelProps) {
  const toggleStatus = (status: ObjectiveStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const toggleOwner = (owner: string) => {
    const newOwners = filters.owners.includes(owner)
      ? filters.owners.filter(o => o !== owner)
      : [...filters.owners, owner];
    onFiltersChange({ ...filters, owners: newOwners });
  };

  return (
    <div 
      className={cn(
        "overflow-hidden bg-surface-0 border-r border-border transition-all duration-200 shrink-0",
        isOpen ? "w-60" : "w-0"
      )}
    >
      <div className="w-60 p-4 flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-primary">Filters</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-surface-1 rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Group By */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
            Group By
          </h4>
          <select
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as GroupByMode)}
            className="w-full px-2.5 py-2 border border-border rounded-md text-xs text-text-primary bg-surface-0 cursor-pointer"
          >
            <option value="theme">Theme</option>
            <option value="status">Status</option>
            <option value="owner">Owner</option>
            <option value="quarter">Quarter</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
            Status
          </h4>
          <div className="flex flex-col gap-0.5">
            {(['on-track', 'at-risk', 'blocked', 'pending'] as const).map((status) => (
              <label 
                key={status}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-surface-1 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.status.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="w-3.5 h-3.5 rounded accent-brand-primary"
                />
                <span 
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                <span className="text-xs text-text-secondary flex-1 capitalize">
                  {status.replace('-', ' ')}
                </span>
                <span className="text-[10px] text-text-muted bg-surface-1 px-1.5 py-0.5 rounded">
                  {statusCounts[status]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Owner Filter */}
        {allOwners.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
              Owner
            </h4>
            <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
              {allOwners.map((owner) => (
                <label 
                  key={owner}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-surface-1 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.owners.includes(owner)}
                    onChange={() => toggleOwner(owner)}
                    className="w-3.5 h-3.5 rounded accent-brand-primary"
                  />
                  <span className="text-xs text-text-secondary">{owner}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Clear Button */}
        <button
          onClick={onClearFilters}
          className="mt-auto py-2 text-xs text-text-secondary bg-surface-1 hover:bg-surface-2 rounded-md transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
