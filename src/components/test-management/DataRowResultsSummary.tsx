/**
 * DataRowResultsSummary — Displays aggregated DDT results per data row
 * Shows pass/fail/not_run counts, progress bar, and row list with actions
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  PlayCircle, 
  ExternalLink,
  RotateCcw,
  Loader2,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDataRowResults, type DataRowLatestResult, type RowResultStatus } from '@/hooks/test-management/useDataRowResults';
import { useCreateRunWithDataRows, type DataRowSelection } from '@/hooks/test-management/useCreateRunWithDataRows';

interface DataRowResultsSummaryProps {
  testCaseId: string;
  cycleId: string;
  scopeId: string;
  className?: string;
}

export function DataRowResultsSummary({
  testCaseId,
  cycleId,
  scopeId,
  className,
}: DataRowResultsSummaryProps) {
  const navigate = useNavigate();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
  const { data, isLoading, error, refetch } = useDataRowResults({ testCaseId, scopeId });
  const createRuns = useCreateRunWithDataRows();
  
  const rows = data?.rows || [];
  const summary = data?.summary || { total: 0, passed: 0, failed: 0, blocked: 0, in_progress: 0, not_run: 0, passRate: 0 };
  const columnOrder = data?.columnOrder || [];
  
  // Get failed rows for re-run
  const failedRows = useMemo(() => 
    rows.filter(r => r.latestStatus === 'failed' || r.latestStatus === 'blocked'),
    [rows]
  );
  
  // Toggle selection
  const toggleRow = (rowId: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedRowIds(next);
  };
  
  const toggleAll = () => {
    if (selectedRowIds.size === rows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map(r => r.rowId)));
    }
  };
  
  // Re-run handlers
  const handleRerunSelected = async () => {
    const selected = rows.filter(r => selectedRowIds.has(r.rowId));
    await runRows(selected);
  };
  
  const handleRerunFailed = async () => {
    await runRows(failedRows);
  };
  
  const handleRerunAll = async () => {
    await runRows(rows);
  };
  
  const runRows = async (rowsToRun: DataRowLatestResult[]) => {
    if (rowsToRun.length === 0) return;
    
    const selections: DataRowSelection[] = rowsToRun.map(r => ({
      id: r.rowId,
      row_data: r.rowData as Record<string, string>,
      row_order: r.rowOrder,
    }));
    
    const result = await createRuns.mutateAsync({
      cycle_id: cycleId,
      scope_id: scopeId,
      case_id: testCaseId,
      selected_rows: selections,
    });
    
    if (result?.first_run_id) {
      navigate(`/test-management/execution/${result.first_run_id}`);
    }
  };
  
  // Navigate to run
  const openRun = (runId: string) => {
    navigate(`/test-management/execution/${runId}`);
  };
  
  // Get preview text for row
  const getRowPreview = (rowData: Record<string, any>): string => {
    const previewKeys = columnOrder.slice(0, 3);
    if (previewKeys.length === 0) {
      // Fallback to first 3 object keys
      previewKeys.push(...Object.keys(rowData).slice(0, 3));
    }
    
    return previewKeys
      .map(key => {
        const val = rowData[key];
        const strVal = String(val ?? '');
        const truncated = strVal.length > 15 ? strVal.slice(0, 15) + '…' : strVal;
        return `${key}=${truncated}`;
      })
      .join(' · ');
  };
  
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={cn('p-4 text-center text-destructive', className)}>
        Failed to load data row results
      </div>
    );
  }
  
  if (rows.length === 0) {
    return null; // No data rows — don't render this component
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Data Rows</h3>
          <Badge variant="secondary">{summary.total}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRerunFailed}
                disabled={failedRows.length === 0 || createRuns.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Re-run Failed
                {failedRows.length > 0 && (
                  <span className="ml-1.5 text-xs bg-destructive/20 text-destructive px-1.5 rounded-full">
                    {failedRows.length}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {failedRows.length === 0 && (
              <TooltipContent>No failed rows to rerun</TooltipContent>
            )}
          </Tooltip>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunAll}
            disabled={createRuns.isPending}
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            Re-run All
          </Button>
          
          {selectedRowIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleRerunSelected}
              disabled={createRuns.isPending}
            >
              {createRuns.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-1.5" />
              )}
              Run Selected ({selectedRowIds.size})
            </Button>
          )}
        </div>
      </div>
      
      {/* Summary Strip */}
      <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium">{summary.passed} Passed</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium">{summary.failed} Failed</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">{summary.blocked} Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{summary.not_run} Not Run</span>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Pass Rate:</span>
          <span className="text-sm font-semibold">{summary.passRate}%</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <Progress 
        value={summary.passRate} 
        className="h-2"
      />
      
      {/* Row Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b text-sm font-medium text-muted-foreground">
          <Checkbox
            checked={selectedRowIds.size === rows.length && rows.length > 0}
            onCheckedChange={toggleAll}
          />
          <div className="w-16">Row</div>
          <div className="flex-1">Data Preview</div>
          <div className="w-24 text-center">Status</div>
          <div className="w-20 text-center">Run</div>
        </div>
        
        {/* Row List */}
        <div className="divide-y max-h-80 overflow-y-auto">
          {rows.map((row) => (
            <div 
              key={row.rowId}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
            >
              <Checkbox
                checked={selectedRowIds.has(row.rowId)}
                onCheckedChange={() => toggleRow(row.rowId)}
              />
              
              <div className="w-16">
                <Badge variant="outline" className="font-mono">
                  Row {row.rowOrder + 1}
                </Badge>
              </div>
              
              <div className="flex-1 text-sm text-muted-foreground truncate">
                {getRowPreview(row.rowData)}
              </div>
              
              <div className="w-24 text-center">
                <StatusBadge status={row.latestStatus} />
              </div>
              
              <div className="w-20 text-center">
                {row.latestRunId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => openRun(row.latestRunId!)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    #{row.latestRunNumber}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: RowResultStatus }) {
  const config: Record<RowResultStatus, { label: string; className: string; icon: React.ReactNode }> = {
    passed: {
      label: 'Passed',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      icon: <XCircle className="w-3 h-3" />,
    },
    blocked: {
      label: 'Blocked',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      icon: <Clock className="w-3 h-3" />,
    },
    not_run: {
      label: 'Not Run',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      icon: <Clock className="w-3 h-3" />,
    },
  };
  
  const { label, className, icon } = config[status];
  
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}>
      {icon}
      {label}
    </span>
  );
}
