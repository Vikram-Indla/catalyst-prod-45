/**
 * Bulk Actions Bar — Shows when rows are selected
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronDown, Check } from 'lucide-react';
import { WorkItemStatus, STATUS_CONFIG } from '../../types';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onStatusChange: (status: WorkItemStatus) => void;
}

export function BulkActionsBar({ selectedCount, onClear, onStatusChange }: BulkActionsBarProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<WorkItemStatus | null>(null);

  if (selectedCount === 0) return null;

  const handleApply = () => {
    if (selectedStatus) {
      onStatusChange(selectedStatus);
      setSelectedStatus(null);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg mb-3">
      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
        {selectedCount} selected
      </span>
      
      <button
        onClick={onClear}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
      >
        <X className="w-3 h-3" />
        Clear
      </button>

      {/* Status Dropdown */}
      <div className="relative">
        <button
          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
        >
          <span>{selectedStatus ? STATUS_CONFIG[selectedStatus].label : 'Change Status'}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {statusDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-20">
            {(['todo', 'progress', 'review', 'done', 'blocked'] as WorkItemStatus[]).map(status => (
              <button
                key={status}
                onClick={() => { setSelectedStatus(status); setStatusDropdownOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700",
                  selectedStatus === status && "text-blue-600 dark:text-blue-400"
                )}
              >
                {STATUS_CONFIG[status].label}
                {selectedStatus === status && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleApply}
        disabled={!selectedStatus}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded transition-colors",
          selectedStatus
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed"
        )}
      >
        Apply
      </button>
    </div>
  );
}
