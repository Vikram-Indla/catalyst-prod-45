/**
 * DataRowResultsSummary — Displays aggregated DDT results per data row
 * Shows pass/fail/not_run counts, progress bar, and row list with actions
 * FIXED: Reset selection on rows change, guard against missing context
 */

import { useState, useMemo, useEffect } from 'react';
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
import { Lozenge, Tooltip } from '@/components/ads';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  
  // Reset selection when rows change
  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [rows.length]);
  
  // Get failed rows for re-run
  const failedRows = useMemo(() => 
    rows.filter(r => r.latestStatus === 'failed' || r.latestStatus === 'blocked'),
    [rows]
  );
  
  // Toggle selection
  const toggleRow = (rowId: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };
  
  const toggleAll = () => {
    if (selectedRowIds.size === rows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map(r => r.rowId)));
    }
  };
  
  // Guard: check required context before running
  const canExecute = !!cycleId && !!scopeId && !!testCaseId;
  
  // Re-run handlers
  const handleRerunSelected = async () => {
    if (!canExecute) {
      toast.error('Execution context missing (cycle/scope)');
      return;
    }
    const selected = rows.filter(r => selectedRowIds.has(r.rowId));
    await runRows(selected);
  };
  
  const handleRerunFailed = async () => {
    if (!canExecute) {
      toast.error('Execution context missing (cycle/scope)');
      return;
    }
    await runRows(failedRows);
  };
  
  const handleRerunAll = async () => {
    if (!canExecute) {
      toast.error('Execution context missing (cycle/scope)');
      return;
    }
    await runRows(rows);
  };
  
  const runRows = async (rowsToRun: DataRowLatestResult[]) => {
    if (rowsToRun.length === 0) return;
    
    const selections: DataRowSelection[] = rowsToRun.map(r => ({
      id: r.rowId,
      row_data: r.rowData as Record<string, string>,
      row_order: r.rowOrder,
    }));
    
    try {
      const result = await createRuns.mutateAsync({
        cycle_id: cycleId,
        scope_id: scopeId,
        case_id: testCaseId,
        selected_rows: selections,
      });
      
      if (result?.first_run_id) {
        navigate(`/test-management/execution/${result.first_run_id}`);
      }
    } catch (err) {
      // Error toast is handled by mutation
    }
  };
  
  // Navigate to run
  const openRun = (runId: string) => {
    navigate(`/test-management/execution/${runId}`);
  };
  
  // Get preview text for row - safe string conversion
  const getRowPreview = (rowData: Record<string, any>): string => {
    const previewKeys = columnOrder.length > 0 
      ? columnOrder.slice(0, 3) 
      : Object.keys(rowData).slice(0, 3);
    
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
  
  const rerunFailedButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRerunFailed}
      disabled={failedRows.length === 0 || createRuns.isPending || !canExecute}
    >
      <RotateCcw className="w-4 h-4 mr-1.5" />
      Re-run Failed
      {failedRows.length > 0 && (
        <span className="ml-1.5 text-xs bg-destructive/20 text-destructive px-1.5 rounded-full">
          {failedRows.length}
        </span>
      )}
    </Button>
  );

  return (
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Data Rows</h3>
            <Lozenge appearance="default">{summary.total}</Lozenge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {failedRows.length === 0 ? (
              <Tooltip content="No failed rows to rerun">
                <span>{rerunFailedButton}</span>
              </Tooltip>
            ) : (
              rerunFailedButton
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRerunAll}
              disabled={createRuns.isPending || !canExecute}
            >
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Re-run All
            </Button>
            
            {selectedRowIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleRerunSelected}
                disabled={createRuns.isPending || !canExecute}
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
        <div className="flex items-center gap-4 sm:gap-6 p-3 bg-muted/50 rounded-lg flex-wrap">
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
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${summary.passRate}%` }}
          />
        </div>
        
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
                  <Lozenge appearance="default">
                    Row {row.rowOrder + 1}
                  </Lozenge>
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
  const config: Record<RowResultStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
    passed: {
      label: 'Passed',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      Icon: CheckCircle2,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      Icon: XCircle,
    },
    blocked: {
      label: 'Blocked',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      Icon: AlertTriangle,
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      Icon: Clock,
    },
    not_run: {
      label: 'Not Run',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      Icon: Clock,
    },
  };
  
  const { label, className, Icon } = config[status];
  
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
