/**
 * Module 4C-1: Run Assignments Panel
 * Main component for managing test case assignments in a run
 */

import React, { useState, useMemo } from 'react';
import { Plus, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentsList } from './AssignmentsList';
import { AssignmentSummaryBar } from './AssignmentSummaryBar';
import { AddCasesDialog } from './AddCasesDialog';
import { TesterAssignment } from '../TesterAssignment';
import {
  useRunAssignments,
  useRemoveCasesFromRun,
  useUpdateAssignmentStatus,
  useBulkAssignTester,
} from '../../hooks/useRunAssignments';
import type { AssignmentStatus } from '../../types/run-assignments';

interface RunAssignmentsPanelProps {
  runId: string;
  projectId: string;
  runStatus: string;
  onExecuteCase?: (assignmentId: string) => void;
}

export function RunAssignmentsPanel({
  runId,
  projectId,
  runStatus,
  onExecuteCase,
}: RunAssignmentsPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTesterAssignment, setShowTesterAssignment] = useState(false);
  const [selectedTesters, setSelectedTesters] = useState<string[]>([]);

  const { data, isLoading, refetch } = useRunAssignments(runId);
  const removeCases = useRemoveCasesFromRun();
  const updateStatus = useUpdateAssignmentStatus();
  const bulkAssignTester = useBulkAssignTester();

  const assignments = data?.assignments || [];
  const summary = data?.summary || {
    total: 0,
    pending: 0,
    in_progress: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };

  const existingCaseIds = useMemo(
    () => assignments.map((a) => a.test_case_id),
    [assignments]
  );

  const isRunActive = runStatus === 'in_progress';
  const canModify = runStatus === 'draft' || runStatus === 'in_progress';

  const handleStatusChange = async (assignmentId: string, status: AssignmentStatus) => {
    await updateStatus.mutateAsync({
      assignmentId,
      status,
      runId,
    });
  };

  const handleRemove = async (assignmentId: string, caseId: string) => {
    await removeCases.mutateAsync({
      runId,
      caseIds: [caseId],
    });
  };

  const handleBulkAssignTester = async () => {
    if (selectedIds.length === 0 || selectedTesters.length === 0) return;

    await bulkAssignTester.mutateAsync({
      runId,
      assignmentIds: selectedIds,
      testerId: selectedTesters[0], // Use first selected tester
    });

    setSelectedIds([]);
    setShowTesterAssignment(false);
    setSelectedTesters([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Test Cases</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {canModify && (
              <>
                {selectedIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTesterAssignment(!showTesterAssignment)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Assign Tester
                  </Button>
                )}
                <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Cases
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary bar */}
        {summary.total > 0 && <AssignmentSummaryBar summary={summary} />}

        {/* Bulk tester assignment */}
        {showTesterAssignment && selectedIds.length > 0 && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <p className="text-sm text-muted-foreground">
              Assign tester to {selectedIds.length} selected case(s):
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <TesterAssignment
                  selectedTesters={selectedTesters}
                  onSelectionChange={setSelectedTesters}
                  projectId={projectId}
                  maxTesters={1}
                />
              </div>
              <Button
                size="sm"
                onClick={handleBulkAssignTester}
                disabled={selectedTesters.length === 0 || bulkAssignTester.isPending}
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTesterAssignment(false);
                  setSelectedTesters([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Assignments list */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AssignmentsList
            assignments={assignments}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onStatusChange={handleStatusChange}
            onRemove={handleRemove}
            onExecute={onExecuteCase}
            isRunActive={isRunActive}
          />
        )}
      </CardContent>

      {/* Add cases dialog */}
      <AddCasesDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        runId={runId}
        projectId={projectId}
        existingCaseIds={existingCaseIds}
        onSuccess={() => refetch()}
      />
    </Card>
  );
}
