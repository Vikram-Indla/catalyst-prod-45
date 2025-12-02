/**
 * ExecutionGrid - Main execution grid component for test cycles
 */

import React, { useState } from 'react';
import { useExecutionGrid } from '@/hooks/useExecutionGrid';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Filter, 
  Download, 
  UserPlus, 
  MoreVertical,
  Check,
  X,
  AlertCircle,
  SkipForward,
  Clock,
  Minus,
  Paperclip,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EXECUTION_STATUS_COLORS,
  EXECUTION_STATUS_ICONS,
  type ExecutionStatus,
} from '@/types/executionGrid';

interface ExecutionGridProps {
  cycleId: string;
  onExecuteCell?: (caseId: string, colIndex: number) => void;
}

const StatusIcon: React.FC<{ status: ExecutionStatus }> = ({ status }) => {
  const icons: Record<ExecutionStatus, React.ReactNode> = {
    not_executed: <Minus className="h-4 w-4 text-muted-foreground" />,
    passed: <Check className="h-4 w-4 text-green-500" />,
    failed: <X className="h-4 w-4 text-red-500" />,
    blocked: <AlertCircle className="h-4 w-4 text-orange-500" />,
    skipped: <SkipForward className="h-4 w-4 text-blue-500" />,
    in_progress: <Clock className="h-4 w-4 text-yellow-500" />,
  };
  return <>{icons[status]}</>;
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const variants: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <span className={cn('px-1.5 py-0.5 text-xs rounded font-medium', variants[priority] || variants.medium)}>
      {priority.charAt(0).toUpperCase()}
    </span>
  );
};

export const ExecutionGrid: React.FC<ExecutionGridProps> = ({ cycleId, onExecuteCell }) => {
  const {
    gridData,
    isLoading,
    selectedCells,
    toggleCellSelection,
    executeCell,
    isExecuting,
  } = useExecutionGrid(cycleId);

  const [showFilters, setShowFilters] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!gridData) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No execution data available for this cycle.
      </div>
    );
  }

  const handleCellClick = (caseId: string, colIndex: number, status: ExecutionStatus) => {
    if (onExecuteCell) {
      onExecuteCell(caseId, colIndex);
    }
  };

  const handleQuickStatus = (caseId: string, status: ExecutionStatus) => {
    executeCell({ caseId, status });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{gridData.cycleName}</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Progress value={gridData.progressPercentage} className="w-32 h-2" />
              <span className="text-sm text-muted-foreground">
                {gridData.progressPercentage}% ({gridData.executedCases}/{gridData.totalCases})
              </span>
            </div>
            <Badge variant="outline" className="text-green-600">
              Pass Rate: {gridData.passRate}%
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Run
          </Button>
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Assign
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="default" size="sm" className="bg-brand-gold hover:bg-brand-gold/90">
            Close Cycle
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedCells.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-brand-gold/10 border-b">
          <span className="text-sm font-medium">{selectedCells.size} cells selected</span>
          <Button size="sm" variant="outline" onClick={() => {}}>
            Mark as Passed
          </Button>
          <Button size="sm" variant="outline" onClick={() => {}}>
            Mark as Failed
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-24 min-w-[100px]">Case</TableHead>
              <TableHead className="min-w-[200px]">Title</TableHead>
              {gridData.columns.map((col, idx) => (
                <TableHead key={col.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium">
                      {col.type === 'tester' ? col.testerName : col.datasetName}
                    </span>
                    <span className="text-xs text-muted-foreground">Run {col.runNumber}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {gridData.rows.map((row) => (
              <TableRow key={row.caseId} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <PriorityBadge priority={row.priority} />
                    <span>{row.caseKey}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate" title={row.caseTitle}>
                  {row.caseTitle}
                </TableCell>
                {row.cells.map((cell, colIdx) => (
                  <TableCell
                    key={`${row.caseId}-${colIdx}`}
                    className={cn(
                      'text-center cursor-pointer transition-colors p-1',
                      selectedCells.has(`${row.caseId}-${colIdx}`) && 'bg-brand-gold/20',
                      'hover:bg-muted'
                    )}
                    onClick={() => handleCellClick(row.caseId, colIdx, cell.status)}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          className={cn(
                            'flex items-center justify-center gap-1 p-2 rounded',
                            cell.status === 'passed' && 'bg-green-100 dark:bg-green-900/30',
                            cell.status === 'failed' && 'bg-red-100 dark:bg-red-900/30',
                            cell.status === 'blocked' && 'bg-orange-100 dark:bg-orange-900/30',
                            cell.status === 'skipped' && 'bg-blue-100 dark:bg-blue-900/30',
                            cell.status === 'in_progress' && 'bg-yellow-100 dark:bg-yellow-900/30'
                          )}
                        >
                          <StatusIcon status={cell.status} />
                          {cell.evidenceCount > 0 && (
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              {cell.evidenceCount}
                            </span>
                          )}
                          {cell.defectCount > 0 && (
                            <span className="flex items-center text-xs text-red-500">
                              <Bug className="h-3 w-3" />
                              {cell.defectCount}
                            </span>
                          )}
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleQuickStatus(row.caseId, 'passed')}>
                          <Check className="h-4 w-4 mr-2 text-green-500" /> Pass
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuickStatus(row.caseId, 'failed')}>
                          <X className="h-4 w-4 mr-2 text-red-500" /> Fail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuickStatus(row.caseId, 'blocked')}>
                          <AlertCircle className="h-4 w-4 mr-2 text-orange-500" /> Blocked
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuickStatus(row.caseId, 'skipped')}>
                          <SkipForward className="h-4 w-4 mr-2 text-blue-500" /> Skip
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer with column totals */}
      <div className="flex items-center justify-between p-3 border-t bg-muted/50 text-sm">
        <span>
          Total: {gridData.totalCases} cases | 
          <span className="text-green-600 ml-2">{gridData.passedCases} passed</span> |
          <span className="text-red-600 ml-2">{gridData.failedCases} failed</span> |
          <span className="text-orange-600 ml-2">{gridData.blockedCases} blocked</span>
        </span>
      </div>
    </div>
  );
};

export default ExecutionGrid;
