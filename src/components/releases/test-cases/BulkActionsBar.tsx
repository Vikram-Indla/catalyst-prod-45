/**
 * BulkActionsBar — Floating action bar for bulk operations
 * Features: Selection count, select all, quick actions, keyboard hint
 */

import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-foreground text-background rounded-full shadow-2xl',
        'flex items-center gap-1 px-2 py-2',
        // Offset for sidebar: shift right by half sidebar width (128px = 64px offset)
        'ml-[calc(var(--sidebar-offset,0px)/2)]',
        className
      )}
      style={{ '--sidebar-offset': '240px' } as React.CSSProperties}
    >
      {/* Selection Info */}
      <div className="flex items-center gap-2 px-3">
        <span className="text-sm font-semibold">{selectedCount}</span>
        <span className="text-sm text-muted-foreground/70">selected</span>
      </div>

      {/* Select All */}
      {selectedCount < totalCount && (
        <button
          onClick={onSelectAll}
          className="text-xs text-primary-foreground/70 hover:text-primary-foreground underline px-2"
        >
          Select all {totalCount}
        </button>
      )}

      <div className="w-px h-6 bg-muted-foreground/30 mx-1" />

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        {onExecute && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-3"
                onClick={onExecute}
              >
                <Play className="w-4 h-4 mr-1.5" />
                Execute
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run selected test cases</TooltipContent>
          </Tooltip>
        )}

        {onMoveToFolder && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-3"
                onClick={onMoveToFolder}
              >
                <Folder className="w-4 h-4 mr-1.5" />
                To Folder
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to folder</TooltipContent>
          </Tooltip>
        )}

        {onMove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-3"
                onClick={onMove}
              >
                <FolderInput className="w-4 h-4 mr-1.5" />
                To Release
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to another release</TooltipContent>
          </Tooltip>
        )}

        {onAssign && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-3"
                onClick={onAssign}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Assign
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assign to team member</TooltipContent>
          </Tooltip>
        )}

        {onAddTags && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-3"
                onClick={onAddTags}
              >
                <Tags className="w-4 h-4 mr-1.5" />
                Tags
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add or remove tags</TooltipContent>
          </Tooltip>
        )}

        {onDuplicate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-2"
                onClick={onDuplicate}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate selected</TooltipContent>
          </Tooltip>
        )}

        {onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-muted-foreground/20 h-8 px-2"
                onClick={onExport}
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export selected</TooltipContent>
          </Tooltip>
        )}

        <div className="w-px h-6 bg-muted-foreground/30 mx-1" />

        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/20 h-8 px-2"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected (Del)</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="w-px h-6 bg-muted-foreground/30 mx-1" />

      {/* Close */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClear}
            className="p-2 text-muted-foreground hover:text-background transition-colors rounded-full hover:bg-muted-foreground/20"
          >
            <X className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Clear selection (Esc)</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
