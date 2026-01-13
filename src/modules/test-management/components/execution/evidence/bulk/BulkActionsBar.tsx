/**
 * Bulk Actions Bar Component
 * TC-356 to TC-400: Bulk operation controls
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckSquare,
  Square,
  Trash2,
  Download,
  X,
  Loader2,
} from 'lucide-react';

interface BulkActionsBarProps {
  isSelectMode: boolean;
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  isBulkDeleting: boolean;
  isBulkDownloading: boolean;
  bulkProgress: { current: number; total: number } | null;
  onToggleSelectMode: () => void;
  onToggleAll: () => void;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onCancel: () => void;
  className?: string;
  readOnly?: boolean;
}

export function BulkActionsBar({
  isSelectMode,
  selectedCount,
  totalCount,
  isAllSelected,
  isPartiallySelected,
  isBulkDeleting,
  isBulkDownloading,
  bulkProgress,
  onToggleSelectMode,
  onToggleAll,
  onBulkDelete,
  onBulkDownload,
  onCancel,
  className,
  readOnly = false,
}: BulkActionsBarProps) {
  const isProcessing = isBulkDeleting || isBulkDownloading;
  const progressPercentage = bulkProgress 
    ? (bulkProgress.current / bulkProgress.total) * 100 
    : 0;

  if (!isSelectMode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 px-2 text-xs', className)}
            onClick={onToggleSelectMode}
            disabled={totalCount === 0}
            aria-label="Enable bulk selection"
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1" />
            Select
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Select multiple items for bulk actions
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-2 p-2 bg-muted/50 rounded-lg border',
        className
      )}
      role="toolbar"
      aria-label="Bulk actions toolbar"
    >
      {/* Select all checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all"
          checked={isAllSelected}
          onCheckedChange={onToggleAll}
          disabled={isProcessing}
          aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
          className="data-[state=indeterminate]:bg-primary"
          {...(isPartiallySelected && { 'data-state': 'indeterminate' })}
        />
        <label 
          htmlFor="select-all" 
          className="text-xs font-medium cursor-pointer select-none"
        >
          {selectedCount} of {totalCount} selected
        </label>
      </div>

      {/* Progress indicator */}
      {bulkProgress && (
        <div className="flex items-center gap-2 flex-1 max-w-[150px]">
          <Progress value={progressPercentage} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {bulkProgress.current}/{bulkProgress.total}
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Bulk download */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onBulkDownload}
              disabled={selectedCount === 0 || isProcessing}
              aria-label={`Download ${selectedCount} selected items`}
            >
              {isBulkDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="ml-1 hidden sm:inline">Download</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download selected ({selectedCount})</TooltipContent>
        </Tooltip>

        {/* Bulk delete */}
        {!readOnly && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={selectedCount === 0 || isProcessing}
                    aria-label={`Delete ${selectedCount} selected items`}
                  >
                    {isBulkDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1 hidden sm:inline">Delete</span>
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete selected ({selectedCount})</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedCount} item(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the selected evidence. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Cancel selection */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onCancel}
              disabled={isProcessing}
              aria-label="Cancel selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exit selection mode</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
