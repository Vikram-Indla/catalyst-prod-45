/**
 * useExecutionGrid Hook - State management for execution grid
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchExecutionGrid,
  executeCell,
  bulkExecute,
  assignCases,
  addRun,
  addDataset,
  closeCycle,
  reopenCycle,
  removeCasesFromCycle,
} from '@/services/executionGridService';
import type {
  ExecutionGridData,
  ExecutionGridCell,
  ExecutionStatus,
  ExecutionFilter,
  BulkExecuteRequest,
  AssignCasesRequest,
  AddRunRequest,
  AddDatasetRequest,
  CloseCycleRequest,
} from '@/types/executionGrid';

export function useExecutionGrid(cycleId: string) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExecutionFilter>({});
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  // Fetch grid data
  const {
    data: gridData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['execution-grid', cycleId, filters],
    queryFn: () => fetchExecutionGrid(cycleId, filters),
    enabled: !!cycleId,
    staleTime: 30000,
  });

  // Execute cell mutation
  const executeCellMutation = useMutation({
    mutationFn: async ({
      caseId,
      status,
      options,
    }: {
      caseId: string;
      status: ExecutionStatus;
      options?: {
        testerId?: string;
        runNumber?: number;
        datasetId?: string;
        actualResult?: string;
        defectId?: string;
      };
    }) => {
      await executeCell(cycleId, caseId, status, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      toast.success('Execution updated');
    },
    onError: (error) => {
      toast.error('Failed to update execution');
      console.error(error);
    },
  });

  // Bulk execute mutation
  const bulkExecuteMutation = useMutation({
    mutationFn: (request: BulkExecuteRequest) => bulkExecute(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      setSelectedCells(new Set());
      toast.success('Bulk execution completed');
    },
    onError: (error) => {
      toast.error('Failed to complete bulk execution');
      console.error(error);
    },
  });

  // Assign cases mutation
  const assignCasesMutation = useMutation({
    mutationFn: (request: AssignCasesRequest) => assignCases(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      toast.success('Cases assigned');
    },
    onError: (error) => {
      toast.error('Failed to assign cases');
      console.error(error);
    },
  });

  // Add run mutation
  const addRunMutation = useMutation({
    mutationFn: (request: AddRunRequest) => addRun(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      toast.success('Run added');
    },
    onError: (error) => {
      toast.error('Failed to add run');
      console.error(error);
    },
  });

  // Add dataset mutation
  const addDatasetMutation = useMutation({
    mutationFn: (request: AddDatasetRequest) => addDataset(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      toast.success('Dataset added');
    },
    onError: (error) => {
      toast.error('Failed to add dataset');
      console.error(error);
    },
  });

  // Close cycle mutation
  const closeCycleMutation = useMutation({
    mutationFn: (request: CloseCycleRequest) => closeCycle(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cycle closed');
    },
    onError: (error) => {
      toast.error('Failed to close cycle');
      console.error(error);
    },
  });

  // Reopen cycle mutation
  const reopenCycleMutation = useMutation({
    mutationFn: () => reopenCycle(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Cycle reopened');
    },
    onError: (error) => {
      toast.error('Failed to reopen cycle');
      console.error(error);
    },
  });

  // Remove cases mutation
  const removeCasesMutation = useMutation({
    mutationFn: (caseIds: string[]) => removeCasesFromCycle(cycleId, caseIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-grid', cycleId] });
      toast.success('Cases removed from cycle');
    },
    onError: (error) => {
      toast.error('Failed to remove cases');
      console.error(error);
    },
  });

  // Cell selection handlers
  const toggleCellSelection = useCallback((cellKey: string) => {
    setSelectedCells(prev => {
      const next = new Set(prev);
      if (next.has(cellKey)) {
        next.delete(cellKey);
      } else {
        next.add(cellKey);
      }
      return next;
    });
  }, []);

  const selectAllCells = useCallback(() => {
    if (!gridData) return;
    const allKeys = new Set<string>();
    gridData.rows.forEach(row => {
      row.cells.forEach((cell, colIndex) => {
        allKeys.add(`${row.caseId}-${colIndex}`);
      });
    });
    setSelectedCells(allKeys);
  }, [gridData]);

  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
  }, []);

  const selectRowCells = useCallback((caseId: string) => {
    if (!gridData) return;
    const row = gridData.rows.find(r => r.caseId === caseId);
    if (!row) return;
    
    setSelectedCells(prev => {
      const next = new Set(prev);
      row.cells.forEach((_, colIndex) => {
        next.add(`${caseId}-${colIndex}`);
      });
      return next;
    });
  }, [gridData]);

  const selectColumnCells = useCallback((colIndex: number) => {
    if (!gridData) return;
    setSelectedCells(prev => {
      const next = new Set(prev);
      gridData.rows.forEach(row => {
        next.add(`${row.caseId}-${colIndex}`);
      });
      return next;
    });
  }, [gridData]);

  // Get selected cells data
  const selectedCellsData = useMemo(() => {
    if (!gridData) return [];
    const cells: Array<ExecutionGridCell & { rowIndex: number; colIndex: number }> = [];
    
    selectedCells.forEach(key => {
      const [caseId, colIndexStr] = key.split('-');
      const colIndex = parseInt(colIndexStr, 10);
      const rowIndex = gridData.rows.findIndex(r => r.caseId === caseId);
      if (rowIndex >= 0 && gridData.rows[rowIndex].cells[colIndex]) {
        cells.push({
          ...gridData.rows[rowIndex].cells[colIndex],
          rowIndex,
          colIndex,
        });
      }
    });
    
    return cells;
  }, [gridData, selectedCells]);

  return {
    gridData,
    isLoading,
    error,
    refetch,
    
    // Filters
    filters,
    setFilters,
    
    // Selection
    selectedCells,
    selectedCellsData,
    toggleCellSelection,
    selectAllCells,
    clearSelection,
    selectRowCells,
    selectColumnCells,
    
    // Mutations
    executeCell: executeCellMutation.mutate,
    isExecuting: executeCellMutation.isPending,
    
    bulkExecute: bulkExecuteMutation.mutate,
    isBulkExecuting: bulkExecuteMutation.isPending,
    
    assignCases: assignCasesMutation.mutate,
    isAssigning: assignCasesMutation.isPending,
    
    addRun: addRunMutation.mutate,
    isAddingRun: addRunMutation.isPending,
    
    addDataset: addDatasetMutation.mutate,
    isAddingDataset: addDatasetMutation.isPending,
    
    closeCycle: closeCycleMutation.mutate,
    isClosingCycle: closeCycleMutation.isPending,
    
    reopenCycle: reopenCycleMutation.mutate,
    isReopening: reopenCycleMutation.isPending,
    
    removeCases: removeCasesMutation.mutate,
    isRemovingCases: removeCasesMutation.isPending,
  };
}
