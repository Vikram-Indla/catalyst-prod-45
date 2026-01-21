// =====================================================
// REQUIREMENT LINKING HOOKS
// Hooks for managing test case to requirement links
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RequirementType = 'story' | 'epic' | 'feature' | 'business_request' | 'external';
export type LinkType = 'verifies' | 'tests' | 'derives_from' | 'related_to';
export type CoverageStatus = 'pending' | 'partial' | 'full' | 'blocked';

export interface RequirementLink {
  id: string;
  test_case_id: string;
  requirement_type: RequirementType;
  requirement_id: string | null;
  external_key: string | null;
  external_url: string | null;
  external_title: string | null;
  link_type: LinkType;
  coverage_status: CoverageStatus;
  notes: string | null;
  requirement_title: string | null;
  requirement_status: string | null;
  created_at: string;
}

export interface RequirementTestCase {
  link_id: string;
  test_case_id: string;
  test_case_key: string;
  test_case_title: string;
  test_case_status: string;
  test_case_priority: string;
  link_type: LinkType;
  coverage_status: CoverageStatus;
  last_execution_status: string | null;
  last_execution_date: string | null;
}

export interface TraceabilityRow {
  requirement_type: RequirementType;
  requirement_id: string;
  requirement_title: string;
  requirement_status: string;
  total_test_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  not_run_count: number;
  coverage_pct: number;
}

// Hook to get requirement links for a test case
export function useCaseRequirements(caseId: string | null) {
  return useQuery({
    queryKey: ['case-requirements', caseId],
    queryFn: async (): Promise<RequirementLink[]> => {
      if (!caseId) return [];

      const { data, error } = await supabase.rpc('tm_get_case_requirements', {
        p_case_id: caseId,
      });

      if (error) throw error;
      return (data || []) as RequirementLink[];
    },
    enabled: !!caseId,
  });
}

// Hook to get test cases for a requirement
export function useRequirementTestCases(requirementType: RequirementType | null, requirementId: string | null) {
  return useQuery({
    queryKey: ['requirement-test-cases', requirementType, requirementId],
    queryFn: async (): Promise<RequirementTestCase[]> => {
      if (!requirementType || !requirementId) return [];

      const { data, error } = await supabase.rpc('tm_get_requirement_test_cases', {
        p_requirement_type: requirementType,
        p_requirement_id: requirementId,
      });

      if (error) throw error;
      return (data || []) as RequirementTestCase[];
    },
    enabled: !!requirementType && !!requirementId,
  });
}

// Hook to get traceability matrix
export function useTraceabilityMatrix(projectId: string | null) {
  return useQuery({
    queryKey: ['traceability-matrix', projectId],
    queryFn: async (): Promise<TraceabilityRow[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase.rpc('tm_get_traceability_matrix', {
        p_project_id: projectId,
      });

      if (error) throw error;
      return (data || []) as TraceabilityRow[];
    },
    enabled: !!projectId,
  });
}

// Hook to link requirement
export function useLinkRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      requirementType,
      requirementId,
      externalKey,
      externalUrl,
      externalTitle,
      linkType = 'verifies',
      notes,
    }: {
      caseId: string;
      requirementType: RequirementType;
      requirementId?: string;
      externalKey?: string;
      externalUrl?: string;
      externalTitle?: string;
      linkType?: LinkType;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_link_requirement', {
        p_case_id: caseId,
        p_requirement_type: requirementType,
        p_requirement_id: requirementId || null,
        p_external_key: externalKey || null,
        p_external_url: externalUrl || null,
        p_external_title: externalTitle || null,
        p_link_type: linkType,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-requirements', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['requirement-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['traceability-matrix'] });
    },
  });
}

// Hook to unlink requirement
export function useUnlinkRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, caseId }: { linkId: string; caseId: string }) => {
      const { error } = await supabase
        .from('tm_requirement_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-requirements', variables.caseId] });
      queryClient.invalidateQueries({ queryKey: ['requirement-test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['traceability-matrix'] });
    },
  });
}

// Hook to update coverage status
export function useUpdateCoverageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, status, caseId }: { linkId: string; status: CoverageStatus; caseId: string }) => {
      const { data, error } = await supabase.rpc('tm_update_coverage_status', {
        p_link_id: linkId,
        p_status: status,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-requirements', variables.caseId] });
    },
  });
}

// Requirement type labels
export const REQUIREMENT_TYPE_LABELS: Record<RequirementType, string> = {
  story: 'User Story',
  epic: 'Epic',
  feature: 'Feature',
  business_request: 'Business Request',
  external: 'External',
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  verifies: 'Verifies',
  tests: 'Tests',
  derives_from: 'Derives From',
  related_to: 'Related To',
};

export const COVERAGE_STATUS_LABELS: Record<CoverageStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  full: { label: 'Full', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};
