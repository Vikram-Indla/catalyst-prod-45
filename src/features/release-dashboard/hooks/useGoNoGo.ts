/**
 * Go/No-Go Dashboard Hooks
 * Module 5B-2: Release decision management hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GoNoGoAssessment,
  GoNoGoSummary,
  GoNoGoDecision,
  GateStatus,
  RiskFactor,
  DecisionHistoryEntry,
  DECISION_THRESHOLDS,
} from '../types/go-no-go';

// Calculate decision based on metrics
function calculateDecision(
  blockingPassed: number,
  blockingTotal: number,
  openBlockers: number,
  openCriticals: number,
  passRate: number
): { decision: GoNoGoDecision; confidence: number } {
  const blockingPct = blockingTotal > 0 ? (blockingPassed / blockingTotal) * 100 : 100;
  
  // Calculate confidence based on multiple factors
  let confidence = 0;
  confidence += blockingPct * 0.4; // 40% weight for blocking gates
  confidence += Math.max(0, 100 - openBlockers * 25) * 0.2; // 20% weight for blockers
  confidence += Math.max(0, 100 - openCriticals * 10) * 0.2; // 20% weight for criticals
  confidence += passRate * 0.2; // 20% weight for pass rate
  
  // Determine decision
  if (
    blockingPct >= DECISION_THRESHOLDS.go.minBlockingGatesPct &&
    openBlockers <= DECISION_THRESHOLDS.go.maxOpenBlockers &&
    openCriticals <= DECISION_THRESHOLDS.go.maxOpenCriticals &&
    confidence >= DECISION_THRESHOLDS.go.minConfidence
  ) {
    return { decision: 'go', confidence: Math.round(confidence) };
  }
  
  if (
    blockingPct >= DECISION_THRESHOLDS.conditional.minBlockingGatesPct &&
    openBlockers <= DECISION_THRESHOLDS.conditional.maxOpenBlockers &&
    openCriticals <= DECISION_THRESHOLDS.conditional.maxOpenCriticals &&
    confidence >= DECISION_THRESHOLDS.conditional.minConfidence
  ) {
    return { decision: 'conditional', confidence: Math.round(confidence) };
  }
  
  return { decision: 'no_go', confidence: Math.round(confidence) };
}

// Generate risk factors based on metrics
function generateRiskFactors(
  passRate: number,
  executionRate: number,
  openBlockers: number,
  openCriticals: number,
  blockingGatesFailed: number
): RiskFactor[] {
  const risks: RiskFactor[] = [];
  
  if (passRate < 80) {
    risks.push({
      id: 'low-pass-rate',
      category: 'quality',
      severity: passRate < 60 ? 'critical' : passRate < 70 ? 'high' : 'medium',
      description: `Test pass rate is ${passRate.toFixed(1)}%`,
      impact: 'May indicate underlying quality issues',
      mitigation: 'Review failed tests and prioritize fixes',
    });
  }
  
  if (executionRate < 90) {
    risks.push({
      id: 'low-execution',
      category: 'coverage',
      severity: executionRate < 70 ? 'high' : 'medium',
      description: `Only ${executionRate.toFixed(1)}% of tests executed`,
      impact: 'Untested functionality may contain defects',
      mitigation: 'Complete remaining test execution',
    });
  }
  
  if (openBlockers > 0) {
    risks.push({
      id: 'open-blockers',
      category: 'defects',
      severity: 'critical',
      description: `${openBlockers} open blocker defect(s)`,
      impact: 'Release cannot proceed with open blockers',
      mitigation: 'Resolve all blocker defects before release',
    });
  }
  
  if (openCriticals > 2) {
    risks.push({
      id: 'open-criticals',
      category: 'defects',
      severity: openCriticals > 5 ? 'high' : 'medium',
      description: `${openCriticals} open critical defect(s)`,
      impact: 'High-severity issues may affect users',
      mitigation: 'Prioritize critical defect resolution',
    });
  }
  
  if (blockingGatesFailed > 0) {
    risks.push({
      id: 'failed-gates',
      category: 'quality',
      severity: 'high',
      description: `${blockingGatesFailed} blocking quality gate(s) failed`,
      impact: 'Release criteria not met',
      mitigation: 'Address quality gate failures',
    });
  }
  
  return risks;
}

// Generate recommendation text
function generateRecommendation(
  decision: GoNoGoDecision,
  risks: RiskFactor[]
): string {
  if (decision === 'go') {
    return 'All quality gates passed. The release meets the defined criteria and is recommended for deployment.';
  }
  
  if (decision === 'conditional') {
    const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');
    return `Conditional approval possible with ${criticalRisks.length} risk(s) to address. Consider deploying with additional monitoring or limiting scope.`;
  }
  
  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  return `Release not recommended. ${criticalCount} critical issue(s) must be resolved before proceeding.`;
}

// Hook to get Go/No-Go assessment
export function useGoNoGoAssessment(releaseId: string) {
  return useQuery({
    queryKey: ['go-no-go-assessment', releaseId],
    queryFn: async (): Promise<GoNoGoAssessment> => {
      // Fetch quality gates evaluation
      const { data: gateEval, error: gateError } = await supabase.rpc(
        'tm_evaluate_release_gates',
        { p_release_id: releaseId, p_user_id: null }
      );
      
      if (gateError) throw gateError;
      
      const evaluation = gateEval as unknown as {
        release_id: string;
        evaluated_at: string;
        gates: Array<{
          gate_id: string;
          gate_name: string;
          gate_type: string;
          threshold: string;
          actual_value: number;
          passed: boolean;
          is_blocking: boolean;
        }>;
        summary: {
          total_gates: number;
          passed_gates: number;
          blocking_passed: number;
          blocking_total: number;
          all_blocking_passed: boolean;
        };
        test_summary: {
          totals: {
            execution_pct: number;
            pass_pct: number;
          };
          defects: {
            open: number;
            blockers: number;
            criticals: number;
          };
        };
      };
      
      // Fetch release info
      const { data: release } = await supabase
        .from('releases')
        .select('name')
        .eq('id', releaseId)
        .single();
      
      // Transform gates
      const gates: GateStatus[] = (evaluation.gates || []).map(g => ({
        id: g.gate_id,
        name: g.gate_name,
        type: g.gate_type,
        threshold: g.threshold,
        actualValue: g.actual_value,
        passed: g.passed,
        isBlocking: g.is_blocking,
      }));
      
      // Calculate decision
      const blockingPassed = evaluation.summary?.blocking_passed || 0;
      const blockingTotal = evaluation.summary?.blocking_total || 0;
      const openBlockers = evaluation.test_summary?.defects?.blockers || 0;
      const openCriticals = evaluation.test_summary?.defects?.criticals || 0;
      const passRate = evaluation.test_summary?.totals?.pass_pct || 0;
      const executionRate = evaluation.test_summary?.totals?.execution_pct || 0;
      
      const { decision, confidence } = calculateDecision(
        blockingPassed,
        blockingTotal,
        openBlockers,
        openCriticals,
        passRate
      );
      
      // Generate risk factors
      const blockingFailed = blockingTotal - blockingPassed;
      const riskFactors = generateRiskFactors(
        passRate,
        executionRate,
        openBlockers,
        openCriticals,
        blockingFailed
      );
      
      const summary: GoNoGoSummary = {
        decision,
        confidence,
        blockingGatesPassed: blockingPassed,
        blockingGatesTotal: blockingTotal,
        nonBlockingGatesPassed: (evaluation.summary?.passed_gates || 0) - blockingPassed,
        nonBlockingGatesTotal: (evaluation.summary?.total_gates || 0) - blockingTotal,
        riskFactors,
        recommendation: generateRecommendation(decision, riskFactors),
      };
      
      return {
        releaseId,
        releaseName: release?.name || 'Unknown Release',
        assessmentDate: evaluation.evaluated_at || new Date().toISOString(),
        summary,
        gates,
        signoffs: [], // TODO: Implement stakeholder signoffs
        testMetrics: {
          executionRate,
          passRate,
          automationRate: 0, // TODO: Add automation rate
        },
        defectMetrics: {
          openBlockers,
          openCriticals,
          openMajors: 0,
          totalOpen: evaluation.test_summary?.defects?.open || 0,
        },
        previousAssessments: [], // TODO: Fetch history
      };
    },
    enabled: !!releaseId,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to record a Go/No-Go decision
export function useRecordDecision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      releaseId,
      decision,
      rationale,
      overrideReason,
      userId,
    }: {
      releaseId: string;
      decision: GoNoGoDecision;
      rationale: string;
      overrideReason?: string;
      userId: string;
    }) => {
      // Create a readiness snapshot with the decision
      const { data, error } = await supabase.rpc('tm_create_readiness_snapshot', {
        p_release_id: releaseId,
        p_user_id: userId,
        p_recommendation: `${decision.toUpperCase()}: ${rationale}${overrideReason ? ` (Override: ${overrideReason})` : ''}`,
      });
      
      if (error) throw error;
      
      // If approved, mark as approved
      if (decision === 'go') {
        const { error: approveError } = await supabase.rpc('tm_approve_release_readiness', {
          p_snapshot_id: data as string,
          p_user_id: userId,
        });
        
        if (approveError) throw approveError;
      }
      
      return { snapshotId: data, releaseId, decision };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['go-no-go-assessment', data.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release-readiness', data.releaseId] });
      
      const decisionLabel = data.decision === 'go' ? 'GO' : 
                           data.decision === 'no_go' ? 'NO-GO' : 'CONDITIONAL';
      toast({ 
        title: 'Decision Recorded', 
        description: `Release marked as ${decisionLabel}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to get decision history
export function useDecisionHistory(releaseId: string) {
  return useQuery({
    queryKey: ['decision-history', releaseId],
    queryFn: async (): Promise<DecisionHistoryEntry[]> => {
      const { data, error } = await supabase.rpc('tm_get_release_readiness_history', {
        p_release_id: releaseId,
      });
      
      if (error) throw error;
      
      // Transform to DecisionHistoryEntry format
      const history = data as unknown as Array<{
        id: string;
        snapshot_at: string;
        overall_status: string;
        recommendation: string | null;
        created_by_name: string | null;
        approved_by_name: string | null;
        approved_at: string | null;
        gates_passed: number;
        gates_total: number;
        blocking_gates_passed: number;
        blocking_gates_total: number;
      }>;
      
      return (history || []).map(h => {
        // Parse decision from recommendation or status
        let decision: GoNoGoDecision = 'pending';
        if (h.overall_status === 'approved') decision = 'go';
        else if (h.overall_status === 'ready') decision = 'conditional';
        else if (h.overall_status === 'not_ready') decision = 'no_go';
        else if (h.overall_status === 'at_risk') decision = 'conditional';
        
        return {
          id: h.id,
          releaseId,
          decision,
          decidedBy: '',
          decidedByName: h.approved_by_name || h.created_by_name || 'System',
          decidedAt: h.approved_at || h.snapshot_at,
          rationale: h.recommendation || '',
          snapshotData: {
            decision,
            confidence: 0,
            blockingGatesPassed: h.blocking_gates_passed,
            blockingGatesTotal: h.blocking_gates_total,
            nonBlockingGatesPassed: h.gates_passed - h.blocking_gates_passed,
            nonBlockingGatesTotal: h.gates_total - h.blocking_gates_total,
            riskFactors: [],
            recommendation: h.recommendation || '',
          },
        };
      });
    },
    enabled: !!releaseId,
  });
}
