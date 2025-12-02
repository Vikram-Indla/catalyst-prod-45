import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkSelectToolbarProps {
  selectedCount: number;
  onCancel: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onAddToSet: () => void;
  onAddToCycle: () => void;
}

export const BulkSelectToolbar: React.FC<BulkSelectToolbarProps> = ({
  selectedCount,
  onCancel,
  onEdit,
  onMove,
  onDelete,
  onArchive,
  onAddToSet,
  onAddToCycle,
}) => {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 bg-brand-gold/10 border-b border-border px-4 py-3">
      <Edit2 className="h-5 w-5 text-brand-gold" />
      <span className="font-semibold text-foreground">{selectedCount} selected</span>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Bulk Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}>
            📁 Move to Folder...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            🗑️ Delete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            📦 Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAddToSet}>
            📊 Add to Set
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddToCycle}>
            🔄 Add to Cycle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
        <X className="h-4 w-4 mr-2" />
        Cancel
      </Button>
    </div>
  );
};
