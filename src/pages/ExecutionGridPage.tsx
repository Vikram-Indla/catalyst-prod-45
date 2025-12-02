/**
 * Execution Grid Page - Full-page execution grid view
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  Users,
  Zap,
  Lock,
  Unlock,
  Download,
  Settings,
} from 'lucide-react';
import {
  ExecutionGrid,
  AddRunModal,
  AssignCasesModal,
  BulkExecuteModal,
  CloseCycleModal,
} from '@/components/test-management/execution-grid';
import { QuickExecuteModal } from '@/components/test-management/QuickExecuteModal';
import { useExecutionGrid } from '@/hooks/useExecutionGrid';

export default function ExecutionGridPage() {
  const { programId, cycleId } = useParams<{ programId: string; cycleId: string }>();
  const navigate = useNavigate();

  // Modal states
  const [showAddRun, setShowAddRun] = useState(false);
  const [showAssignCases, setShowAssignCases] = useState(false);
  const [showBulkExecute, setShowBulkExecute] = useState(false);
  const [showCloseCycle, setShowCloseCycle] = useState(false);
  const [quickExecuteData, setQuickExecuteData] = useState<{
    executionId: string | null;
    caseId: string;
    testerId: string | null;
    runNumber: number;
  } | null>(null);

  // Fetch cycle info
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['test-cycle', cycleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  const {
    gridData,
    isLoading,
    addRun,
    isAddingRun,
    assignCases,
    isAssigning,
    bulkExecute,
    isBulkExecuting,
    closeCycle,
    isClosingCycle,
    reopenCycle,
    isReopening,
    selectedCellsData,
    selectedCells,
  } = useExecutionGrid(cycleId || '');

  const isLocked = cycle?.status === 'completed';

  const handleOpenQuickExecute = (
    executionId: string | null,
    caseId: string,
    testerId: string | null,
    runNumber: number
  ) => {
    setQuickExecuteData({ executionId, caseId, testerId, runNumber });
  };

  const handleAddRun = (
    runName: string,
    copyFromRunId?: string,
    copyAssignments?: boolean,
    copyResults?: boolean
  ) => {
    addRun({
      cycleId: cycleId!,
      runName,
      copyFromRunId,
      copyAssignments,
      copyResults,
    });
    setShowAddRun(false);
  };

  const handleAssignCases = (
    assignments: Array<{ caseId: string; testerId: string; runNumber: number }>
  ) => {
    assignCases({
      cycleId: cycleId!,
      assignments,
    });
    setShowAssignCases(false);
  };

  const handleBulkExecute = (status: any, comment?: string) => {
    const cells = selectedCellsData.map((cell) => ({
      caseId: cell.caseId,
      testerId: cell.testerId,
      runNumber: cell.runNumber,
      datasetId: cell.datasetId,
    }));
    
    bulkExecute({
      cycleId: cycleId!,
      cells,
      status,
      comment,
    });
    setShowBulkExecute(false);
  };

  const handleCloseCycle = (
    reason: 'completed' | 'cancelled',
    comments?: string,
    sendNotifications?: boolean,
    archiveCycle?: boolean
  ) => {
    closeCycle({
      cycleId: cycleId!,
      reason,
      comments,
      sendNotifications,
      archiveCycle,
    });
    setShowCloseCycle(false);
  };

  if (cycleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/programs/${programId}/tests/cycles`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{cycle?.name || 'Execution Grid'}</h1>
              <Badge
                variant="outline"
                className={
                  cycle?.status === 'completed'
                    ? 'border-green-500 text-green-600'
                    : cycle?.status === 'active'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-gray-500'
                }
              >
                {cycle?.status || 'Unknown'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {gridData?.totalCases || 0} test cases
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCells.size > 0 && !isLocked && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkExecute(true)}
              >
                <Zap className="h-4 w-4 mr-1" />
                Bulk Execute ({selectedCells.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignCases(true)}
              >
                <Users className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </>
          )}

          {!isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddRun(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Run
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Grid Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isLocked ? (
                <DropdownMenuItem onClick={() => reopenCycle()} disabled={isReopening}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Reopen Cycle
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setShowCloseCycle(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Close Cycle
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <ExecutionGrid
          cycleId={cycleId!}
          cycleName={cycle?.name || ''}
          isLocked={isLocked}
          onOpenQuickExecute={handleOpenQuickExecute}
        />
      </div>

      {/* Modals */}
      <AddRunModal
        isOpen={showAddRun}
        onClose={() => setShowAddRun(false)}
        onAdd={handleAddRun}
        existingRuns={gridData?.runs || []}
        isLoading={isAddingRun}
      />

      <AssignCasesModal
        isOpen={showAssignCases}
        onClose={() => setShowAssignCases(false)}
        onAssign={handleAssignCases}
        selectedCases={
          gridData?.rows.filter((r) =>
            selectedCellsData.some((c) => c.caseId === r.caseId)
          ) || []
        }
        testers={gridData?.testers || []}
        runNumber={1}
        isLoading={isAssigning}
      />

      <BulkExecuteModal
        isOpen={showBulkExecute}
        onClose={() => setShowBulkExecute(false)}
        onExecute={handleBulkExecute}
        selectedCount={selectedCells.size}
        isLoading={isBulkExecuting}
      />

      <CloseCycleModal
        isOpen={showCloseCycle}
        onClose={() => setShowCloseCycle(false)}
        onCloseCycle={handleCloseCycle}
        cycleName={cycle?.name || ''}
        executedPercentage={gridData?.progressPercentage || 0}
        isLoading={isClosingCycle}
      />

      {quickExecuteData && (
        <QuickExecuteModal
          open={!!quickExecuteData}
          onOpenChange={(open) => !open && setQuickExecuteData(null)}
          execution={{
            id: quickExecuteData.executionId,
            case_id: quickExecuteData.caseId,
            assigned_to: quickExecuteData.testerId,
          }}
          onExecuteComplete={() => setQuickExecuteData(null)}
        />
      )}
    </div>
  );
}
