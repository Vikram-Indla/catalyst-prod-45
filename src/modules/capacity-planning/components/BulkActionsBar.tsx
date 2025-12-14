import { Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
}: BulkActionsBarProps) {
  return (
    <div 
      className="h-[44px] flex items-center justify-between px-6 bg-indigo-50 border-b"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-indigo-700">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-indigo-700" onClick={onClear}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {onExport && (
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={onExport}>
            <Download className="h-3 w-3" />
            Export
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 gap-1 text-destructive hover:bg-destructive/10" 
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}
