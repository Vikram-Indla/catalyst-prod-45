import React from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HistoryBulkActionsBarProps {
  selectedCount: number;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function HistoryBulkActionsBar({
  selectedCount,
  onExport,
  onDelete,
  onClear,
}: HistoryBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-3 mx-5 mb-4 rounded-lg',
        'bg-[#2563eb] text-white animate-in fade-in slide-in-from-top-2 duration-200'
      )}
    >
      <span>
        <strong>{selectedCount}</strong> selected
      </span>
      
      <div className="ml-auto flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onExport}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="text-white hover:bg-white/20 hover:text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}
