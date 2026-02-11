/**
 * Bulk Action Bar — Blue floating action bar when releases are selected
 */

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onStatusChange: () => void;
  onReassign: () => void;
  onArchive: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  onStatusChange,
  onReassign,
  onArchive,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-lg animate-in slide-in-from-bottom-4 duration-200">
      <span className="font-medium text-sm">{selectedCount} selected</span>
      
      <div className="w-px h-6 bg-white/20" />
      
      <button
        onClick={onStatusChange}
        className="px-3 py-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 rounded transition-colors"
      >
        Change Status
      </button>
      
      <button
        onClick={onReassign}
        className="px-3 py-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 rounded transition-colors"
      >
        Reassign
      </button>
      
      <button
        onClick={onArchive}
        className="px-3 py-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 rounded transition-colors"
      >
        Archive
      </button>
      
      <div className="flex-1" />
      
      <button
        onClick={onClear}
        className="p-1.5 hover:bg-white/15 rounded transition-colors"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
