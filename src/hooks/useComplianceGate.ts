import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type CoverageLevel = 'covered' | 'partial' | 'not_specified';
export type Framework = 'DGA' | 'NCA';
export type Verdict = 'COMPLIANT' | 'CONDITIONAL' | 'NON_COMPLIANT';

export interface ComplianceRow {
  id: string;
  framework: Framework;
  control_id: string;
  control_name: string;
  coverage: CoverageLevel;
  evidence_refs: string[];
}

export interface ComplianceMatrix {
  rows: ComplianceRow[];
}

export interface ComplianceScores {
  dga_score: number;
  nca_score: number;
  weighted_score: number;
  verdict: Verdict;
}

export interface ComplianceReport {
  matrix: ComplianceMatrix;
  scores: ComplianceScores;
}

export interface JustificationData {
  justification_text: string;
  decision_owner: string;
  decision_date: string;
  risk_acceptance_type: string;
  review_date?: string;
}

// Compute scores locally (mirrors backend logic)
export function computeLocalScores(rows: ComplianceRow[]): ComplianceScores {
  const COVERAGE_VALUES: Record<CoverageLevel, number> = {
    covered: 100,
    partial: 50,
    not_specified: 0,
  };

  const dgaRows = rows.filter(r => r.framework === 'DGA');
  const ncaRows = rows.filter(r => r.framework === 'NCA');

  const calcFrameworkScore = (frameworkRows: ComplianceRow[]) => {
    if (frameworkRows.length === 0) return 100;
    const total = frameworkRows.reduce((sum, row) => sum + COVERAGE_VALUES[row.coverage], 0);
    return total / frameworkRows.length;
  };

  const dga_score = calcFrameworkScore(dgaRows);
  const nca_score = calcFrameworkScore(ncaRows);
  const weighted_score = (dga_score * 60 + nca_score * 40) / 100;

  let verdict: Verdict;
  if (weighted_score >= 80) {
    verdict = 'COMPLIANT';
  } else if (weighted_score >= 60) {
    verdict = 'CONDITIONAL';
  } else {
    verdict = 'NON_COMPLIANT';
  }

  return { dga_score, nca_score, weighted_score, verdict };
}

// Fetch existing compliance report artifact for a draft
export function useComplianceReport(draftId: string | undefined) {
  return useQuery({
    queryKey: ['compliance-report', draftId],
    queryFn: async (): Promise<{ report: ComplianceReport | null; artifactId: string | null }> => {
      if (!draftId) return { report: null, artifactId: null };

      // Get latest run for this draft
      const { data: runs } = await supabase
        .from('ai_assist_runs')
        .select('id')
        .eq('draft_id', draftId)
        .order('run_number', { ascending: false })
        .limit(1);

      if (!runs || runs.length === 0) return { report: null, artifactId: null };

      const runId = runs[0].id;

      // Get compliance report artifact
      const { data: artifacts } = await supabase
        .from('ai_assist_artifacts')
        .select('*')
        .eq('run_id', runId)
        .eq('artifact_type', 'compliance_report')
        .order('version', { ascending: false })
        .limit(1);

      if (!artifacts || artifacts.length === 0) return { report: null, artifactId: null };

      const artifact = artifacts[0];
      return {
        report: artifact.content_json as unknown as ComplianceReport,
        artifactId: artifact.id,
      };
    },
    enabled: !!draftId,
  });
}

// Fetch existing justification artifact
export function useJustification(draftId: string | undefined) {
  return useQuery({
    queryKey: ['justification', draftId],
    queryFn: async (): Promise<JustificationData | null> => {
      if (!draftId) return null;

      // Get latest run for this draft
      const { data: runs } = await supabase
        .from('ai_assist_runs')
        .select('id')
        .eq('draft_id', draftId)
        .order('run_number', { ascending: false })
        .limit(1);

      if (!runs || runs.length === 0) return null;

      const runId = runs[0].id;

      // Get justification artifact
      const { data: artifacts } = await supabase
        .from('ai_assist_artifacts')
        .select('*')
        .eq('run_id', runId)
        .eq('artifact_type', 'justification')
        .order('version', { ascending: false })
        .limit(1);

      if (!artifacts || artifacts.length === 0) return null;

      return artifacts[0].content_json as unknown as JustificationData;
    },
    enabled: !!draftId,
  });
}

// Submit compliance matrix for scoring
export function useComputeComplianceScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draftId,
      runId,
      matrix,
    }: {
      draftId: string;
      runId: string;
      matrix: ComplianceMatrix;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ai-assist-compliance', {
        body: {
          action: 'compute_score',
          draft_id: draftId,
          run_id: runId,
          matrix,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data as { success: boolean; scores: ComplianceScores; artifact_id: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-report', variables.draftId] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-artifacts', variables.draftId] });
      toast.success('Compliance score computed');
    },
    onError: (error) => {
      toast.error('Failed to compute compliance score: ' + error.message);
    },
  });
}

// Record justification
export function useRecordJustification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draftId,
      runId,
      justification,
    }: {
      draftId: string;
      runId: string;
      justification: JustificationData;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ai-assist-compliance', {
        body: {
          action: 'record_justification',
          draft_id: draftId,
          run_id: runId,
          justification,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      return response.data as { success: boolean; artifact_id: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['justification', variables.draftId] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-audit-events', variables.draftId] });
      toast.success('Justification recorded');
    },
    onError: (error) => {
      toast.error('Failed to record justification: ' + error.message);
    },
  });
}
