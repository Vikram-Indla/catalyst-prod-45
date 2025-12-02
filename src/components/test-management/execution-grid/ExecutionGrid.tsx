/**
 * CATALYST TESTS - Execution Grid
 * Primary QA UI for test execution tracking with status percolation
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Filter,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  SkipForward,
  PlayCircle,
  Lock,
} from 'lucide-react';
import { ExecutionGridCell } from './ExecutionGridCell';
import type { ExecutionStatus, ExecutionGridCell as CellType } from '@/types/executionGrid';

interface ExecutionGridProps {
  cycleId: string;
  cycleName: string;
  isLocked?: boolean;
  onOpenQuickExecute: (executionId: string | null, caseId: string, testerId: string | null, runNumber: number) => void;
}

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  not_executed: 'bg-gray-200 text-gray-600',
  passed: 'bg-green-500 text-white',
  failed: 'bg-red-500 text-white',
  blocked: 'bg-orange-500 text-white',
  skipped: 'bg-blue-500 text-white',
  in_progress: 'bg-yellow-500 text-white',
};

export const ExecutionGrid: React.FC<ExecutionGridProps> = ({
  cycleId,
  cycleName,
  isLocked = false,
  onOpenQuickExecute,
}) => {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<ExecutionStatus | 'all'>('all');

  // Fetch cycle with executions
  const { data: gridData, isLoading } = useQuery({
    queryKey: ['execution-grid', cycleId],
    queryFn: async () => {
      // Fetch cycle
      const { data: cycle } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      // Fetch executions for this cycle
      const { data: executions } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_cases (id, key, title, priority, status)
        `)
        .eq('cycle_id', cycleId);

      // Build grid rows from executions
      const caseMap = new Map();
      (executions || []).forEach((exec: any) => {
        const tc = exec.test_cases;
        if (!tc) return;

        if (!caseMap.has(tc.id)) {
          caseMap.set(tc.id, {
            caseId: tc.id,
            caseKey: tc.key || `TC-${tc.id.substring(0, 4)}`,
            caseTitle: tc.title,
            priority: tc.priority || 'medium',
            caseStatus: tc.status || 'draft',
            cells: [],
          });
        }

        const row = caseMap.get(tc.id);
        row.cells.push({
          executionId: exec.id,
          caseId: tc.id,
          testerId: exec.assigned_to,
          runNumber: 1,
          datasetId: null,
          status: exec.status || 'not_executed',
          statusOverride: exec.overall_status_override || false,
          manualStatus: exec.manual_status,
          evidenceCount: exec.evidence_count || 0,
          defectCount: 0,
          inProgress: exec.status === 'in_progress',
          lockedBy: null,
          lockedAt: null,
          executedBy: exec.executed_by,
          executionDate: exec.executed_at,
          actualResult: exec.comments,
        });
      });

      const rows = Array.from(caseMap.values());
      const allCells = rows.flatMap(r => r.cells);
      const passed = allCells.filter(c => c.status === 'passed').length;
      const failed = allCells.filter(c => c.status === 'failed').length;
      const blocked = allCells.filter(c => c.status === 'blocked').length;
      const executed = allCells.filter(c => c.status !== 'not_executed').length;

      return {
        cycleId,
        cycleName: cycle?.name || cycleName,
        cycleStatus: cycle?.status || 'planned',
        rows,
        totalCases: rows.length,
        executedCases: executed,
        passedCases: passed,
        failedCases: failed,
        blockedCases: blocked,
        progressPercentage: allCells.length > 0 ? (executed / allCells.length) * 100 : 0,
        passRate: executed > 0 ? (passed / executed) * 100 : 0,
      };
    },
  });

  const handleCellClick = (cell: CellType) => {
    onOpenQuickExecute(cell.executionId, cell.caseId, cell.testerId, cell.runNumber);
  };

  const toggleCellSelection = (cellKey: string) => {
    const newSelection = new Set(selectedCells);
    if (newSelection.has(cellKey)) {
      newSelection.delete(cellKey);
    } else {
      newSelection.add(cellKey);
    }
    setSelectedCells(newSelection);
  };

  const filteredRows = useMemo(() => {
    if (!gridData?.rows) return [];
    if (filterStatus === 'all') return gridData.rows;
    return gridData.rows.filter((row: any) => 
      row.cells.some((cell: any) => cell.status === filterStatus)
    );
  }, [gridData?.rows, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!gridData) {
    return <div className="text-center py-12 text-muted-foreground">No execution data available</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">{gridData.cycleName}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Progress: {Math.round(gridData.progressPercentage)}%</span>
            <span>•</span>
            <span>Pass Rate: {Math.round(gridData.passRate)}%</span>
            {isLocked && (
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                <Lock className="h-3 w-3 mr-1" />Locked
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" />Filter</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('passed')}>Passed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('failed')}>Failed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('blocked')}>Blocked</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-4">
          <Progress value={gridData.progressPercentage} className="flex-1 h-2" />
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />{gridData.passedCases} Passed</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />{gridData.failedCases} Failed</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" />{gridData.blockedCases} Blocked</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          {/* Headers */}
          <div className="flex border-b border-border bg-muted/50 sticky top-0 z-10">
            <div className="w-24 p-2 border-r border-border font-medium text-xs">Case</div>
            <div className="w-64 p-2 border-r border-border font-medium text-xs">Title</div>
            <div className="w-16 p-2 border-r border-border font-medium text-xs">Priority</div>
            <div className="w-24 p-2 border-r border-border font-medium text-xs text-center">Status</div>
          </div>

          {/* Rows */}
          {filteredRows.map((row: any) => (
            <div key={row.caseId} className="flex border-b border-border hover:bg-muted/30">
              <div className="w-24 p-2 border-r border-border">
                <span className="text-xs font-mono text-brand-gold">{row.caseKey}</span>
              </div>
              <div className="w-64 p-2 border-r border-border">
                <span className="text-sm truncate block">{row.caseTitle}</span>
              </div>
              <div className="w-16 p-2 border-r border-border">
                <Badge variant="outline" className="text-xs capitalize">{row.priority}</Badge>
              </div>
              {row.cells.map((cell: any, idx: number) => (
                <ExecutionGridCell
                  key={`${row.caseId}-${idx}`}
                  cell={cell}
                  isSelected={selectedCells.has(`${row.caseId}-${idx}`)}
                  onSelect={() => toggleCellSelection(`${row.caseId}-${idx}`)}
                  onClick={() => handleCellClick(cell)}
                />
              ))}
              {row.cells.length === 0 && (
                <div className="w-24 p-2 border-r border-border flex items-center justify-center">
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => onOpenQuickExecute(null, row.caseId, null, 1)}>
                    <PlayCircle className="h-3 w-3 mr-1" />Execute
                  </Button>
                </div>
              )}
            </div>
          ))}

          {filteredRows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No test cases match the current filter</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
