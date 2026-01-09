/**
 * Bulk Actions Bar Component
 * Horizontal bar with all 9 bulk actions
 */

import { 
  X,
  FolderInput,
  UserPlus,
  CheckCircle2,
  Flag,
  Tag,
  Link,
  Copy,
  Download,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMove: () => void;
  onAssign: () => void;
  onStatus: () => void;
  onPriority: () => void;
  onTags: () => void;
  onLink: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

function ActionButton({ icon, label, onClick, variant = 'default' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20 rounded-md transition-colors',
        variant === 'destructive' && 'hover:bg-destructive'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onMove,
  onAssign,
  onStatus,
  onPriority,
  onTags,
  onLink,
  onDuplicate,
  onExport,
  onDelete,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg">
      {/* Selection info */}
      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{selectedCount} selected</span>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-white/30 mx-2" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ActionButton 
          icon={<FolderInput className="h-4 w-4" />} 
          label="Move" 
          onClick={onMove} 
        />
        <ActionButton 
          icon={<UserPlus className="h-4 w-4" />} 
          label="Assign" 
          onClick={onAssign} 
        />
        <ActionButton 
          icon={<CheckCircle2 className="h-4 w-4" />} 
          label="Status" 
          onClick={onStatus} 
        />
        <ActionButton 
          icon={<Flag className="h-4 w-4" />} 
          label="Priority" 
          onClick={onPriority} 
        />
        <ActionButton 
          icon={<Tag className="h-4 w-4" />} 
          label="Tags" 
          onClick={onTags} 
        />
        <ActionButton 
          icon={<Link className="h-4 w-4" />} 
          label="Link" 
          onClick={onLink} 
        />
        <ActionButton 
          icon={<Copy className="h-4 w-4" />} 
          label="Duplicate" 
          onClick={onDuplicate} 
        />
        <ActionButton 
          icon={<Download className="h-4 w-4" />} 
          label="Export" 
          onClick={onExport} 
        />
        <ActionButton 
          icon={<Trash2 className="h-4 w-4" />} 
          label="Delete" 
          onClick={onDelete}
          variant="destructive"
        />
      </div>
    </div>
  );
}
