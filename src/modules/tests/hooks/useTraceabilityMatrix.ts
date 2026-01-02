/**
 * Traceability Matrix Hook
 * Full end-to-end traceability: Story ↔ Test Case ↔ Execution ↔ Defect ↔ Story/Feature
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ==================== TYPES ====================

export interface TraceabilityRequirement {
  id: string;
  key: string;
  title: string;
  type: 'epic' | 'feature' | 'story';
  status: string;
  priority: string | null;
  parentId: string | null;
  parentKey: string | null;
}

export interface TraceabilityTestCase {
  id: string;
  title: string;
  caseKey: string;
  status: string;
  priority: string;
  linkedRequirements: string[]; // work_item_ids
}

export interface TraceabilityExecution {
  id: string;
  caseId: string;
  cycleId: string;
  cycleName: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_run' | 'in_progress';
  executedAt: string | null;
  executedBy: string | null;
}

export interface TraceabilityDefect {
  id: string;
  defectKey: string;
  title: string;
  severity: string;
  status: string;
  linkedExecutionId: string | null;
  linkedStoryId: string | null;
  linkedFeatureId: string | null;
}

export interface TraceabilityChain {
  requirement: TraceabilityRequirement;
  testCases: TraceabilityTestCase[];
  executions: TraceabilityExecution[];
  defects: TraceabilityDefect[];
  coverage: {
    hasTests: boolean;
    testCount: number;
    hasExecutions: boolean;
    executionCount: number;
    passRate: number;
    failRate: number;
    blockedRate: number;
    hasDefects: boolean;
    defectCount: number;
    openDefectCount: number;
  };
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: string[];
}

export interface CoverageGap {
  id: string;
  type: 'no_tests' | 'no_executions' | 'stale_executions' | 'repeated_failures' | 'unlinked_defects' | 'orphan_tests';
  severity: 'critical' | 'high' | 'medium' | 'low';
  entityType: 'requirement' | 'test_case' | 'execution' | 'defect';
  entityId: string;
  entityKey: string;
  title: string;
  description: string;
  suggestion: string;
  metadata?: Record<string, unknown>;
}

export interface TraceabilityMatrixData {
  requirements: TraceabilityRequirement[];
  testCases: TraceabilityTestCase[];
  executions: TraceabilityExecution[];
  defects: TraceabilityDefect[];
  chains: TraceabilityChain[];
  gaps: CoverageGap[];
  summary: {
    totalRequirements: number;
    requirementsWithTests: number;
    requirementsWithoutTests: number;
    coveragePercentage: number;
    totalTestCases: number;
    executedTestCases: number;
    passedTestCases: number;
    failedTestCases: number;
    blockedTestCases: number;
    notRunTestCases: number;
    totalDefects: number;
    openDefects: number;
    linkedDefects: number;
    unlinkedDefects: number;
    avgRisk: number;
    criticalRiskCount: number;
    highRiskCount: number;
  };
}

// ==================== RISK CALCULATION ====================

function calculateRiskLevel(chain: Omit<TraceabilityChain, 'riskLevel' | 'riskFactors'>): {
  level: 'critical' | 'high' | 'medium' | 'low';
  factors: string[];
} {
  const factors: string[] = [];
  let score = 0;

  const { requirement, coverage } = chain;
  const isPriority = requirement.priority === 'high' || requirement.priority === 'critical';

  // No test coverage
  if (!coverage.hasTests) {
    score += isPriority ? 40 : 25;
    factors.push('No test cases linked');
  }

  // Has tests but no executions
  if (coverage.hasTests && !coverage.hasExecutions) {
    score += isPriority ? 30 : 20;
    factors.push('Tests not executed');
  }

  // High failure rate
  if (coverage.failRate >= 50) {
    score += 25;
    factors.push(`High failure rate (${Math.round(coverage.failRate)}%)`);
  } else if (coverage.failRate >= 25) {
    score += 15;
    factors.push(`Moderate failure rate (${Math.round(coverage.failRate)}%)`);
  }

  // Blocked tests
  if (coverage.blockedRate >= 30) {
    score += 15;
    factors.push('Many blocked tests');
  }

  // Open defects
  if (coverage.openDefectCount > 0) {
    score += Math.min(20, coverage.openDefectCount * 5);
    factors.push(`${coverage.openDefectCount} open defects`);
  }

  // Low test count for priority items
  if (isPriority && coverage.testCount < 3 && coverage.testCount > 0) {
    score += 10;
    factors.push('Insufficient test coverage for priority item');
  }

  let level: 'critical' | 'high' | 'medium' | 'low';
  if (score >= 60) level = 'critical';
  else if (score >= 40) level = 'high';
  else if (score >= 20) level = 'medium';
  else level = 'low';

  return { level, factors };
}

// ==================== GAP DETECTION ====================

function detectCoverageGaps(
  requirements: TraceabilityRequirement[],
  testCases: TraceabilityTestCase[],
  executions: TraceabilityExecution[],
  defects: TraceabilityDefect[],
  chains: TraceabilityChain[],
  staleThresholdDays: number = 30
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  const now = new Date();
  const staleThresholdMs = staleThresholdDays * 24 * 60 * 60 * 1000;

  // 1. Requirements without tests
  chains
    .filter(c => !c.coverage.hasTests)
    .forEach(c => {
      const isPriority = c.requirement.priority === 'high' || c.requirement.priority === 'critical';
      gaps.push({
        id: `gap-no-tests-${c.requirement.id}`,
        type: 'no_tests',
        severity: isPriority ? 'critical' : 'high',
        entityType: 'requirement',
        entityId: c.requirement.id,
        entityKey: c.requirement.key,
        title: 'No test coverage',
        description: `${c.requirement.type} "${c.requirement.key}" has no linked test cases`,
        suggestion: 'Create or link test cases to cover this requirement',
      });
    });

  // 2. Requirements with tests but no executions
  chains
    .filter(c => c.coverage.hasTests && !c.coverage.hasExecutions)
    .forEach(c => {
      gaps.push({
        id: `gap-no-exec-${c.requirement.id}`,
        type: 'no_executions',
        severity: c.requirement.priority === 'high' ? 'high' : 'medium',
        entityType: 'requirement',
        entityId: c.requirement.id,
        entityKey: c.requirement.key,
        title: 'Tests not executed',
        description: `${c.requirement.key} has ${c.coverage.testCount} tests but none have been executed`,
        suggestion: 'Add tests to a test cycle and execute them',
      });
    });

  // 3. Stale executions (last executed > N days ago)
  const executionsByCase = new Map<string, TraceabilityExecution[]>();
  executions.forEach(e => {
    const existing = executionsByCase.get(e.caseId) || [];
    existing.push(e);
    executionsByCase.set(e.caseId, existing);
  });

  testCases.forEach(tc => {
    const tcExecs = executionsByCase.get(tc.id) || [];
    if (tcExecs.length === 0) return;

    const latestExec = tcExecs
      .filter(e => e.executedAt)
      .sort((a, b) => new Date(b.executedAt!).getTime() - new Date(a.executedAt!).getTime())[0];

    if (latestExec?.executedAt) {
      const lastExecDate = new Date(latestExec.executedAt);
      if (now.getTime() - lastExecDate.getTime() > staleThresholdMs) {
        gaps.push({
          id: `gap-stale-${tc.id}`,
          type: 'stale_executions',
          severity: 'medium',
          entityType: 'test_case',
          entityId: tc.id,
          entityKey: tc.caseKey || tc.id.slice(0, 8),
          title: 'Stale test execution',
          description: `Test case "${tc.title}" was last executed ${Math.round((now.getTime() - lastExecDate.getTime()) / (24 * 60 * 60 * 1000))} days ago`,
          suggestion: 'Re-execute this test to ensure current validity',
          metadata: { lastExecuted: latestExec.executedAt },
        });
      }
    }
  });

  // 4. Repeated failures without linked defect
  const failureCountByCase = new Map<string, number>();
  executions.forEach(e => {
    if (e.status === 'failed') {
      failureCountByCase.set(e.caseId, (failureCountByCase.get(e.caseId) || 0) + 1);
    }
  });

  const casesWithDefects = new Set(
    defects
      .filter(d => d.linkedExecutionId)
      .map(d => {
        const exec = executions.find(e => e.id === d.linkedExecutionId);
        return exec?.caseId;
      })
      .filter(Boolean)
  );

  failureCountByCase.forEach((count, caseId) => {
    if (count >= 3 && !casesWithDefects.has(caseId)) {
      const tc = testCases.find(t => t.id === caseId);
      gaps.push({
        id: `gap-repeated-fail-${caseId}`,
        type: 'repeated_failures',
        severity: 'critical',
        entityType: 'test_case',
        entityId: caseId,
        entityKey: tc?.caseKey || caseId.slice(0, 8),
        title: 'Repeated failures without defect',
        description: `"${tc?.title || 'Test case'}" has failed ${count} times without a linked defect`,
        suggestion: 'Investigate failures and log a defect if there is a product issue',
        metadata: { failureCount: count },
      });
    }
  });

  // 5. Unlinked defects (defects not linked to any execution or requirement)
  defects
    .filter(d => !d.linkedExecutionId && !d.linkedStoryId && !d.linkedFeatureId)
    .forEach(d => {
      gaps.push({
        id: `gap-unlinked-defect-${d.id}`,
        type: 'unlinked_defects',
        severity: 'medium',
        entityType: 'defect',
        entityId: d.id,
        entityKey: d.defectKey,
        title: 'Unlinked defect',
        description: `Defect "${d.defectKey}" is not linked to any requirement or test execution`,
        suggestion: 'Link this defect to the originating test execution or affected requirement',
      });
    });

  // 6. Orphan tests (tests not linked to any requirement)
  const linkedCaseIds = new Set(testCases.flatMap(tc => tc.linkedRequirements.length > 0 ? [tc.id] : []));
  testCases
    .filter(tc => tc.linkedRequirements.length === 0)
    .forEach(tc => {
      gaps.push({
        id: `gap-orphan-test-${tc.id}`,
        type: 'orphan_tests',
        severity: 'low',
        entityType: 'test_case',
        entityId: tc.id,
        entityKey: tc.caseKey || tc.id.slice(0, 8),
        title: 'Orphan test case',
        description: `Test case "${tc.title}" is not linked to any requirement`,
        suggestion: 'Link this test to the requirement it validates',
      });
    });

  return gaps.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ==================== MAIN HOOK ====================

export function useTraceabilityMatrix(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch requirements (stories with features and epics)
  const { data: requirementsData, isLoading: reqLoading } = useQuery({
    queryKey: ['traceability-matrix-requirements', programId],
    queryFn: async () => {
      // Get stories
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select(`
          id, story_key, title, name, status, priority, feature_id,
          feature:features(id, name, feature_key, epic_id, epic:epics(id, name, epic_key))
        `)
        .is('deleted_at', null)
        .order('story_key');

      if (storiesError) throw storiesError;

      const reqs: TraceabilityRequirement[] = [];

      // Process stories
      (stories || []).forEach((s: any) => {
        reqs.push({
          id: s.id,
          key: s.story_key || s.id.slice(0, 8),
          title: s.title || s.name || 'Untitled',
          type: 'story',
          status: s.status || 'open',
          priority: s.priority,
          parentId: s.feature_id,
          parentKey: s.feature?.feature_key || s.feature?.name || null,
        });
      });

      return reqs;
    },
    enabled: !!user,
  });

  // Fetch test case links
  const { data: testCaseData, isLoading: tcLoading } = useQuery({
    queryKey: ['traceability-matrix-testcases', programId],
    queryFn: async () => {
      const { data: links, error: linksError } = await supabase
        .from('test_case_work_item_links')
        .select(`
          case_id, work_item_id, work_item_type,
          test_case:test_cases(id, title, case_key, status, priority)
        `);

      if (linksError) throw linksError;

      // Group by test case
      const caseMap = new Map<string, TraceabilityTestCase>();

      (links || []).forEach((l: any) => {
        if (!l.test_case) return;
        
        const existing = caseMap.get(l.case_id);
        if (existing) {
          existing.linkedRequirements.push(l.work_item_id);
        } else {
          caseMap.set(l.case_id, {
            id: l.test_case.id,
            title: l.test_case.title || 'Untitled',
            caseKey: l.test_case.case_key || l.case_id.slice(0, 8),
            status: l.test_case.status || 'draft',
            priority: l.test_case.priority || 'medium',
            linkedRequirements: [l.work_item_id],
          });
        }
      });

      // Also get test cases without links
      const { data: allCases } = await supabase
        .from('test_cases')
        .select('id, title, case_key, status, priority')
        .is('deleted_at', null);

      (allCases || []).forEach((c: any) => {
        if (!caseMap.has(c.id)) {
          caseMap.set(c.id, {
            id: c.id,
            title: c.title || 'Untitled',
            caseKey: c.case_key || c.id.slice(0, 8),
            status: c.status || 'draft',
            priority: c.priority || 'medium',
            linkedRequirements: [],
          });
        }
      });

      return Array.from(caseMap.values());
    },
    enabled: !!user,
  });

  // Fetch executions
  const { data: executionsData, isLoading: execLoading } = useQuery({
    queryKey: ['traceability-matrix-executions', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          id, status, case_id, executed_at, executed_by, cycle_id,
          cycle:test_cycles(id, name, program_id)
        `)
        .limit(5000);

      if (error) throw error;

      // Filter by program if provided
      const filtered = programId
        ? (data || []).filter((e: any) => e.cycle?.program_id === programId)
        : data || [];

      return filtered.map((e: any) => ({
        id: e.id,
        caseId: e.case_id,
        cycleId: e.cycle_id,
        cycleName: e.cycle?.name || 'Unknown Cycle',
        status: e.status || 'not_run',
        executedAt: e.executed_at,
        executedBy: e.executed_by,
      })) as TraceabilityExecution[];
    },
    enabled: !!user,
  });

  // Fetch defects
  const { data: defectsData, isLoading: defectsLoading } = useQuery({
    queryKey: ['traceability-matrix-defects', programId],
    queryFn: async () => {
      // Get execution-defect links
      const { data: execDefects } = await supabase
        .from('test_execution_defects')
        .select('id, execution_id, defect_work_item_id');

      // Get defects
      const { data: defects } = await supabase
        .from('defects')
        .select('id, defect_id, title, severity, workflow_status, linked_story_id, linked_feature_id');

      const defectMap = new Map<string, TraceabilityDefect>();

      (defects || []).forEach((d: any) => {
        const linkedExec = (execDefects || []).find((ed: any) => ed.defect_work_item_id === d.id);
        defectMap.set(d.id, {
          id: d.id,
          defectKey: d.defect_id || d.id.slice(0, 8),
          title: d.title || 'Untitled',
          severity: d.severity || 'medium',
          status: d.workflow_status || 'open',
          linkedExecutionId: linkedExec?.execution_id || null,
          linkedStoryId: d.linked_story_id,
          linkedFeatureId: d.linked_feature_id,
        });
      });

      return Array.from(defectMap.values());
    },
    enabled: !!user,
  });

  // Compute full matrix
  const matrixData: TraceabilityMatrixData | null = (() => {
    if (!requirementsData || !testCaseData || !executionsData || !defectsData) {
      return null;
    }

    const requirements = requirementsData;
    const testCases = testCaseData;
    const executions = executionsData;
    const defects = defectsData;

    // Build chains
    const chains: TraceabilityChain[] = requirements.map(req => {
      // Find linked test cases
      const linkedCases = testCases.filter(tc => tc.linkedRequirements.includes(req.id));
      const linkedCaseIds = new Set(linkedCases.map(tc => tc.id));

      // Find executions for linked cases
      const linkedExecutions = executions.filter(e => linkedCaseIds.has(e.caseId));

      // Find defects linked to these executions or directly to requirement
      const linkedExecutionIds = new Set(linkedExecutions.map(e => e.id));
      const linkedDefects = defects.filter(d =>
        (d.linkedExecutionId && linkedExecutionIds.has(d.linkedExecutionId)) ||
        d.linkedStoryId === req.id
      );

      // Calculate coverage metrics
      const executionCount = linkedExecutions.length;
      const passedCount = linkedExecutions.filter(e => e.status === 'passed').length;
      const failedCount = linkedExecutions.filter(e => e.status === 'failed').length;
      const blockedCount = linkedExecutions.filter(e => e.status === 'blocked').length;
      const openDefects = linkedDefects.filter(d => 
        d.status === 'open' || d.status === 'in_progress' || d.status === 'new'
      ).length;

      const coverage = {
        hasTests: linkedCases.length > 0,
        testCount: linkedCases.length,
        hasExecutions: executionCount > 0,
        executionCount,
        passRate: executionCount > 0 ? (passedCount / executionCount) * 100 : 0,
        failRate: executionCount > 0 ? (failedCount / executionCount) * 100 : 0,
        blockedRate: executionCount > 0 ? (blockedCount / executionCount) * 100 : 0,
        hasDefects: linkedDefects.length > 0,
        defectCount: linkedDefects.length,
        openDefectCount: openDefects,
      };

      const chainBase = {
        requirement: req,
        testCases: linkedCases,
        executions: linkedExecutions,
        defects: linkedDefects,
        coverage,
      };

      const { level, factors } = calculateRiskLevel(chainBase);

      return {
        ...chainBase,
        riskLevel: level,
        riskFactors: factors,
      };
    });

    // Detect coverage gaps
    const gaps = detectCoverageGaps(requirements, testCases, executions, defects, chains);

    // Calculate summary
    const totalReqs = requirements.length;
    const reqsWithTests = chains.filter(c => c.coverage.hasTests).length;
    const executedCases = new Set(executions.map(e => e.caseId)).size;
    const passedCases = new Set(
      executions.filter(e => e.status === 'passed').map(e => e.caseId)
    ).size;
    const failedCases = new Set(
      executions.filter(e => e.status === 'failed').map(e => e.caseId)
    ).size;
    const blockedCases = new Set(
      executions.filter(e => e.status === 'blocked').map(e => e.caseId)
    ).size;
    const linkedDefects = defects.filter(d => d.linkedExecutionId || d.linkedStoryId).length;
    const avgRisk = chains.length > 0
      ? chains.reduce((sum, c) => {
          const riskValue = { critical: 100, high: 70, medium: 40, low: 10 }[c.riskLevel];
          return sum + riskValue;
        }, 0) / chains.length
      : 0;

    return {
      requirements,
      testCases,
      executions,
      defects,
      chains,
      gaps,
      summary: {
        totalRequirements: totalReqs,
        requirementsWithTests: reqsWithTests,
        requirementsWithoutTests: totalReqs - reqsWithTests,
        coveragePercentage: totalReqs > 0 ? Math.round((reqsWithTests / totalReqs) * 100) : 0,
        totalTestCases: testCases.length,
        executedTestCases: executedCases,
        passedTestCases: passedCases,
        failedTestCases: failedCases,
        blockedTestCases: blockedCases,
        notRunTestCases: testCases.length - executedCases,
        totalDefects: defects.length,
        openDefects: defects.filter(d => d.status === 'open' || d.status === 'new').length,
        linkedDefects,
        unlinkedDefects: defects.length - linkedDefects,
        avgRisk: Math.round(avgRisk),
        criticalRiskCount: chains.filter(c => c.riskLevel === 'critical').length,
        highRiskCount: chains.filter(c => c.riskLevel === 'high').length,
      },
    };
  })();

  const isLoading = reqLoading || tcLoading || execLoading || defectsLoading;

  // Forward traceability: Requirement -> Test Cases -> Executions -> Defects
  const getForwardTrace = (requirementId: string) => {
    if (!matrixData) return null;
    return matrixData.chains.find(c => c.requirement.id === requirementId) || null;
  };

  // Backward traceability: Defect -> Execution -> Test Case -> Requirement
  const getBackwardTrace = (defectId: string) => {
    if (!matrixData) return null;

    const defect = matrixData.defects.find(d => d.id === defectId);
    if (!defect) return null;

    const execution = defect.linkedExecutionId
      ? matrixData.executions.find(e => e.id === defect.linkedExecutionId)
      : null;

    const testCase = execution
      ? matrixData.testCases.find(tc => tc.id === execution.caseId)
      : null;

    const requirements = testCase
      ? matrixData.requirements.filter(r => testCase.linkedRequirements.includes(r.id))
      : defect.linkedStoryId
        ? matrixData.requirements.filter(r => r.id === defect.linkedStoryId)
        : [];

    return {
      defect,
      execution,
      testCase,
      requirements,
    };
  };

  // Get chain from any entity
  const getTraceChainFromEntity = (
    entityType: 'requirement' | 'test_case' | 'execution' | 'defect',
    entityId: string
  ) => {
    if (!matrixData) return null;

    switch (entityType) {
      case 'requirement':
        return getForwardTrace(entityId);
      case 'test_case': {
        const tc = matrixData.testCases.find(t => t.id === entityId);
        if (!tc || tc.linkedRequirements.length === 0) return null;
        return getForwardTrace(tc.linkedRequirements[0]);
      }
      case 'execution': {
        const exec = matrixData.executions.find(e => e.id === entityId);
        if (!exec) return null;
        const tc = matrixData.testCases.find(t => t.id === exec.caseId);
        if (!tc || tc.linkedRequirements.length === 0) return null;
        return getForwardTrace(tc.linkedRequirements[0]);
      }
      case 'defect': {
        const backward = getBackwardTrace(entityId);
        if (!backward || backward.requirements.length === 0) return null;
        return getForwardTrace(backward.requirements[0].id);
      }
      default:
        return null;
    }
  };

  return {
    matrixData,
    isLoading,
    getForwardTrace,
    getBackwardTrace,
    getTraceChainFromEntity,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['traceability-matrix-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['traceability-matrix-testcases'] });
      queryClient.invalidateQueries({ queryKey: ['traceability-matrix-executions'] });
      queryClient.invalidateQueries({ queryKey: ['traceability-matrix-defects'] });
    },
  };
}

// Types are already exported at definition
