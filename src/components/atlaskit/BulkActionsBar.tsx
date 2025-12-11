import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onUpdateStatus?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClear, 
  onUpdateStatus, 
  onAssign, 
  onDelete 
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-3 rounded-md shadow-lg flex items-center gap-4 z-[500] min-w-[600px]">
      {/* Selected Count */}
      <span className="font-semibold text-sm whitespace-nowrap">
        {selectedCount} selected
      </span>
      
      {/* Clear Button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onClear}
        className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
      >
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>
      
      {/* Divider */}
      <div className="w-px h-6 bg-primary-foreground/30" />
      
      {/* Update Status Button */}
      {onUpdateStatus && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onUpdateStatus}
          className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          Update Status
        </Button>
      )}
      
      {/* Assign Button */}
      {onAssign && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onAssign}
          className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          Assign
        </Button>
      )}
      
      {/* Delete Button - Warning appearance for destructive action */}
      {onDelete && (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={onDelete}
        >
          Delete
        </Button>
      )}
    </div>
  );
}

export default BulkActionsBar;
