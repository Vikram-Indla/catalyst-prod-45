/**
 * useTestReports Hook
 * CRUD operations for test reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import {
  listTestReports,
  getTestReportById,
  createTestReport,
  updateTestReport,
  deleteTestReport,
  generateReportData,
  TestReportFilters,
  TestReportInput,
  TestReportPatch,
} from '../api/testReports';

export interface ReportQueryState {
  filters: TestReportFilters;
}

const defaultReportQueryState: ReportQueryState = {
  filters: {},
};

/**
 * Hook for listing test reports with CRUD operations
 */
export function useTestReports(
  programId: string | null,
  projectId: string | null,
  queryState: Partial<ReportQueryState> = {}
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const state = { ...defaultReportQueryState, ...queryState };

  // Permission checks
  const { hasPermission: canView } = usePermission('test_reports', 'view', 'program', projectId || undefined);
  const { hasPermission: canCreate } = usePermission('test_reports', 'create', 'program', projectId || undefined);
  const { hasPermission: canEdit } = usePermission('test_reports', 'edit', 'program', projectId || undefined);
  const { hasPermission: canDelete } = usePermission('test_reports', 'delete', 'program', projectId || undefined);

  // List query
  const {
    data: reports,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-reports', programId, state.filters],
    queryFn: async () => {
      if (!programId) return [];
      return await listTestReports(programId, state.filters);
    },
    enabled: !!user && !!programId && canView,
    staleTime: 15000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: TestReportInput) => {
      if (!programId || !user) throw new Error('Not authorized');
      return await createTestReport(programId, user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-reports', programId] });
      toast.success('Report created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: TestReportPatch) => {
      if (!user) throw new Error('Not authorized');
      return await updateTestReport(user.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-reports', programId] });
      toast.success('Report updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authorized');
      return await deleteTestReport(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-reports', programId] });
      toast.success('Report deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Generate report data mutation
  const generateDataMutation = useMutation({
    mutationFn: async (cycleIds: string[]) => {
      return await generateReportData(cycleIds);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Data
    reports: reports || [],

    // Loading/Error
    isLoading,
    error: error as Error | null,
    refetch,

    // Mutations
    createReport: createMutation.mutateAsync,
    updateReport: updateMutation.mutateAsync,
    deleteReport: deleteMutation.mutateAsync,
    generateReportData: generateDataMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGenerating: generateDataMutation.isPending,
    generatedData: generateDataMutation.data,

    // Permissions
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

/**
 * Hook for fetching a single report
 */
export function useTestReport(id: string | null) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-report', id],
    queryFn: async () => {
      if (!id) return null;
      return await getTestReportById(id);
    },
    enabled: !!user && !!id,
    staleTime: 10000,
  });

  return {
    report: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
