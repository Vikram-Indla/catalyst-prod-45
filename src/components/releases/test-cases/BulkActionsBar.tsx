/**
 * BulkActionsBar — Floating pill action bar for bulk operations
 * Features: Selection count, select all, quick actions with thin pill design
 */

import { 
  X, 
  FolderInput, 
  UserPlus, 
  Tags, 
  Trash2,
  Play,
  Copy,
  Download,
  Folder,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ads';
import { cn } from '@/lib/utils';

export interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onMove?: () => void;
  onMoveToFolder?: () => void;
  onAssign?: () => void;
  onAddTags?: () => void;
  onDelete?: () => void;
  onExecute?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onMove,
  onMoveToFolder,
  onAssign,
  onAddTags,
  onDelete,
  onExecute,
  onDuplicate,
  onExport,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className={cn(
        'fixed bottom-5 left-1/2 -translate-x-1/2 z-50',
        'animate-in slide-in-from-bottom-4 duration-200',
        className
      )}
    >
      <div className="flex items-center bg-slate-900/95 backdrop-blur-sm text-white h-10 px-1.5 rounded-full shadow-2xl border border-slate-700/50">
        
        {/* Selection Count */}
        <div className="flex items-center gap-1.5 pl-3 pr-2">
          <span className="text-sm font-semibold">{selectedCount}</span>
          <span className="text-xs text-slate-400">selected</span>
        </div>
        
        {/* Select All (if not all selected) */}
        {selectedCount < totalCount && (
          <button
            onClick={onSelectAll}
            className="text-xs text-slate-400 hover:text-white underline px-1.5 transition-colors"
          >
            All {totalCount}
          </button>
        )}
        
        <div className="w-px h-5 bg-slate-600" />
        
        {/* Move to Folder (Primary Action) */}
        {onMoveToFolder && (
          <Tooltip content="Move to folder">
            <Button
              size="sm"
              className="h-7 px-2.5 mx-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded-full border-0"
              onClick={onMoveToFolder}
            >
              <Folder className="w-3.5 h-3.5 mr-1.5" />
              Move
            </Button>
          </Tooltip>
        )}

        {/* Execute */}
        {onExecute && (
          <Tooltip content="Run selected test cases">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 rounded-full"
              onClick={onExecute}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Execute
            </Button>
          </Tooltip>
        )}

        {/* Assign */}
        {onAssign && (
          <Tooltip content="Assign to team member">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 rounded-full"
              onClick={onAssign}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Assign
            </Button>
          </Tooltip>
        )}

        {/* Move to Release */}
        {onMove && (
          <Tooltip content="Move to another release">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 rounded-full"
              onClick={onMove}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Release
            </Button>
          </Tooltip>
        )}

        {/* Tags */}
        {onAddTags && (
          <Tooltip content="Add or remove tags">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 rounded-full"
              onClick={onAddTags}
            >
              <Tags className="w-3.5 h-3.5 mr-1.5" />
              Tags
            </Button>
          </Tooltip>
        )}

        {/* Clone/Duplicate */}
        {onDuplicate && (
          <Tooltip content="Duplicate selected">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 rounded-full"
              onClick={onDuplicate}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Clone
            </Button>
          </Tooltip>
        )}

        {/* Export */}
        {onExport && (
          <Tooltip content="Export selected">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-white hover:bg-white/10 rounded-full"
              onClick={onExport}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </Tooltip>
        )}

        <div className="w-px h-5 bg-slate-600" />

        {/* Delete (Danger) */}
        {onDelete && (
          <Tooltip content="Delete selected (Del)">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-red-400 hover:bg-red-500/20 rounded-full"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </Tooltip>
        )}

        <div className="w-px h-5 bg-slate-600" />

        {/* Close / Clear Selection */}
        <Tooltip content="Clear selection (Esc)">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 mr-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full"
            onClick={onClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </Tooltip>
        
      </div>
    </div>
  );
}
