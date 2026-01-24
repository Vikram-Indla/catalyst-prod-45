/**
 * ExecuteWithDataButton — DDT-aware execution button
 * Checks for test data rows and shows selection modal if needed
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { DataRowSelectionModal } from '@/components/test-management/DataRowSelectionModal';
import { 
  useCreateRunWithDataRows, 
  useTestDataRowsForExecution,
  type DataRowSelection 
} from '@/hooks/test-management/useCreateRunWithDataRows';
import { useTestDataParameters } from '@/hooks/test-management/useTestData';
import { toast } from 'sonner';

interface ExecuteWithDataButtonProps extends Omit<ButtonProps, 'onClick'> {
  testCaseId: string;
  testCaseTitle: string;
  cycleId: string;
  scopeId: string;
  /** If true, skip DDT check and run single execution */
  skipDataRowSelection?: boolean;
  /** Callback after successful execution start */
  onExecutionStarted?: (runId: string) => void;
}

export function ExecuteWithDataButton({
  testCaseId,
  testCaseTitle,
  cycleId,
  scopeId,
  skipDataRowSelection = false,
  onExecutionStarted,
  children,
  ...buttonProps
}: ExecuteWithDataButtonProps) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [rows, setRows] = useState<DataRowSelection[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  const { data: parameters = [] } = useTestDataParameters(testCaseId);
  const { fetchRows } = useTestDataRowsForExecution(testCaseId);
  const createRunMutation = useCreateRunWithDataRows();

  const handleClick = useCallback(async () => {
    if (skipDataRowSelection) {
      // Start single execution without data rows
      await startExecution([]);
      return;
    }

    // Check for test data rows
    setIsLoadingRows(true);
    try {
      const dataRows = await fetchRows();
      
      if (dataRows.length === 0) {
        // No data rows, start single execution
        await startExecution([]);
      } else {
        // Show selection modal
        setRows(dataRows);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error checking data rows:', error);
      toast.error('Failed to check test data rows');
    } finally {
      setIsLoadingRows(false);
    }
  }, [skipDataRowSelection, fetchRows]);

  const startExecution = async (selectedRows: DataRowSelection[]) => {
    try {
      const result = await createRunMutation.mutateAsync({
        cycle_id: cycleId,
        scope_id: scopeId,
        case_id: testCaseId,
        selected_rows: selectedRows,
      });

      setShowModal(false);
      onExecutionStarted?.(result.first_run_id);

      // Navigate to the first execution
      navigate(`/test-management/execution/${result.first_run_id}`);
    } catch (error) {
      // Error is handled by the mutation
      console.error('Failed to start execution:', error);
    }
  };

  const handleConfirmSelection = (selectedRows: DataRowSelection[]) => {
    startExecution(selectedRows);
  };

  const columnOrder = parameters.map(p => p.parameter_name);
  const isLoading = isLoadingRows || createRunMutation.isPending;

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        {...buttonProps}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        {children || 'Run Test'}
      </Button>

      <DataRowSelectionModal
        open={showModal}
        onOpenChange={setShowModal}
        rows={rows}
        columnOrder={columnOrder}
        testCaseTitle={testCaseTitle}
        isLoading={createRunMutation.isPending}
        onConfirm={handleConfirmSelection}
      />
    </>
  );
}
