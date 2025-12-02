/**
 * CATALYST TESTS - Execution Grid Cell
 * Individual cell component with status, evidence, and defect badges
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  SkipForward,
  PlayCircle,
  Paperclip,
  Bug,
  Eye,
  Edit,
  Trash2,
  Link2,
} from 'lucide-react';
import type { ExecutionGridCell as CellType, ExecutionStatus } from '@/types/executionGrid';

interface ExecutionGridCellProps {
  cell: CellType;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  not_executed: 'bg-gray-100 hover:bg-gray-200 text-gray-500',
  passed: 'bg-green-100 hover:bg-green-200 text-green-700',
  failed: 'bg-red-100 hover:bg-red-200 text-red-700',
  blocked: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
  skipped: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  in_progress: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
};

const STATUS_ICONS: Record<ExecutionStatus, React.ReactNode> = {
  not_executed: <Clock className="h-4 w-4" />,
  passed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  blocked: <AlertCircle className="h-4 w-4" />,
  skipped: <SkipForward className="h-4 w-4" />,
  in_progress: <PlayCircle className="h-4 w-4" />,
};

const STATUS_LABELS: Record<ExecutionStatus, string> = {
  not_executed: 'Not Executed',
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
  in_progress: 'In Progress',
};

export const ExecutionGridCell: React.FC<ExecutionGridCellProps> = ({
  cell,
  isSelected,
  onSelect,
  onClick,
}) => {
  const displayStatus = cell.statusOverride && cell.manualStatus ? cell.manualStatus : cell.status;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'w-24 p-2 border-r border-border cursor-pointer transition-all',
                  STATUS_COLORS[displayStatus],
                  isSelected && 'ring-2 ring-brand-gold ring-inset'
                )}
                onClick={onClick}
              >
                <div className="flex flex-col items-center gap-1">
                  {/* Status Icon */}
                  <div className="flex items-center justify-center">
                    {STATUS_ICONS[displayStatus]}
                    {cell.statusOverride && (
                      <span className="ml-1 text-[10px] text-yellow-600">⚠</span>
                    )}
                  </div>

                  {/* Badges Row */}
                  <div className="flex items-center gap-1">
                    {cell.evidenceCount > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px] bg-white/50 px-1 rounded">
                        <Paperclip className="h-2.5 w-2.5" />
                        <span>{cell.evidenceCount}</span>
                      </div>
                    )}
                    {cell.defectCount > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px] bg-red-200/50 px-1 rounded text-red-700">
                        <Bug className="h-2.5 w-2.5" />
                        <span>{cell.defectCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <div className="font-medium">{STATUS_LABELS[displayStatus]}</div>
                {cell.executedBy && (
                  <div className="text-muted-foreground">
                    Executed by: {cell.executedBy}
                  </div>
                )}
                {cell.executionDate && (
                  <div className="text-muted-foreground">
                    Date: {new Date(cell.executionDate).toLocaleDateString()}
                  </div>
                )}
                {cell.actualResult && (
                  <div className="text-muted-foreground truncate">
                    Result: {cell.actualResult}
                  </div>
                )}
                {cell.evidenceCount > 0 && (
                  <div className="text-muted-foreground">
                    {cell.evidenceCount} evidence file(s)
                  </div>
                )}
                {cell.defectCount > 0 && (
                  <div className="text-red-600">
                    {cell.defectCount} linked defect(s)
                  </div>
                )}
                {cell.statusOverride && (
                  <div className="text-yellow-600">
                    ⚠ Manual status override applied
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onClick}>
          <PlayCircle className="h-4 w-4 mr-2" />
          Execute
        </ContextMenuItem>
        {cell.executionId && (
          <>
            <ContextMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </ContextMenuItem>
            <ContextMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit Result
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <Paperclip className="h-4 w-4 mr-2" />
              Add Evidence
            </ContextMenuItem>
            <ContextMenuItem>
              <Bug className="h-4 w-4 mr-2" />
              Link Defect
            </ContextMenuItem>
            <ContextMenuItem>
              <Link2 className="h-4 w-4 mr-2" />
              Create Defect
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Execution
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
