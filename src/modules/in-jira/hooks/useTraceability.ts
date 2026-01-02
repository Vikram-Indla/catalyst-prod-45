/**
 * Traceability Hook
 * Fetches and computes traceability data: stories, coverage, executions, defects, gaps
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface TraceabilityStory {
  id: string;
  story_key: string;
  title: string;
  name: string;
  status: string;
  priority: string | null;
  feature_id: string | null;
  feature?: {
    id: string;
    name: string;
    epic_id: string | null;
    epic?: {
      id: string;
      name: string;
    };
  };
}

export interface TraceabilityTestCase {
  id: string;
  title: string;
  status: string;
  priority: string;
  work_item_id: string;
}

export interface TraceabilityExecution {
  id: string;
  status: string;
  case_id: string;
  executed_at: string | null;
  cycle_id: string;
  cycle?: {
    id: string;
    name: string;
  };
}

export interface TraceabilityDefect {
  id: string;
  execution_id: string;
  defect_work_item_id: string;
}

export interface StoryCoverage {
  storyId: string;
  story: TraceabilityStory;
  testCases: TraceabilityTestCase[];
  testCaseCount: number;
  executions: TraceabilityExecution[];
  executionStats: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    notRun: number;
  };
  defects: TraceabilityDefect[];
  defectCount: number;
  riskScore: number; // 0-100
}

export interface FeatureGroup {
  id: string;
  name: string;
  epicId: string | null;
  epicName: string | null;
  stories: StoryCoverage[];
  aggregatedStats: {
    totalStories: number;
    storiesWithTests: number;
    totalTests: number;
    totalExecutions: number;
    passRate: number;
    defectCount: number;
    avgRiskScore: number;
  };
}

export interface TraceabilityGap {
  id: string;
  type: 'missing_tests' | 'no_execution' | 'repeated_failure' | 'blocked_stale' | 'coverage_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityId: string;
  entityType: 'story' | 'test_case' | 'execution';
  entityTitle: string;
  metadata?: Record<string, unknown>;
}

export interface TestFinding {
  id: string;
  program_id: string | null;
  severity: string;
  type: string;
  title: string;
  description: string | null;
  entities_json: Record<string, unknown>;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  created_by: string | null;
}

function calculateRiskScore(coverage: Omit<StoryCoverage, 'riskScore'>): number {
  let score = 0;
  
  // No test cases = high risk
  if (coverage.testCaseCount === 0) {
    score += 40;
  }
  
  // No executions = medium risk
  if (coverage.executionStats.total === 0 && coverage.testCaseCount > 0) {
    score += 25;
  }
  
  // High failure rate
  if (coverage.executionStats.total > 0) {
    const failRate = coverage.executionStats.failed / coverage.executionStats.total;
    score += Math.round(failRate * 25);
  }
  
  // Has defects
  if (coverage.defectCount > 0) {
    score += Math.min(10, coverage.defectCount * 3);
  }
  
  // High priority story with less coverage
  if (coverage.story.priority === 'high' || coverage.story.priority === 'critical') {
    if (coverage.testCaseCount < 3) {
      score += 10;
    }
  }
  
  return Math.min(100, score);
}

export function useTraceability(programId: string | null, blockedThresholdDays: number = 7) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch stories with features and epics
  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ['traceability-stories', programId],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select(`
          id, story_key, title, name, status, priority, feature_id,
          feature:features(id, name, epic_id, epic:epics(id, name))
        `)
        .is('deleted_at', null)
        .order('story_key', { ascending: true });

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as TraceabilityStory[];
    },
    enabled: !!user,
  });

  // Fetch test case links to work items (stories)
  const { data: testCaseLinks, isLoading: linksLoading } = useQuery({
    queryKey: ['traceability-test-links', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_case_work_item_links')
        .select(`
          case_id, work_item_id, work_item_type,
          test_case:test_cases(id, title, status, priority)
        `)
        .eq('work_item_type', 'story');

      // Note: Supabase doesn't support subqueries in .in(), so we skip program filtering for now
      // The filtering happens client-side when processing the data

      const { data, error } = await query;
      if (error) throw error;
      return data as Array<{
        case_id: string;
        work_item_id: string;
        work_item_type: string;
        test_case: { id: string; title: string; status: string; priority: string } | null;
      }>;
    },
    enabled: !!user,
  });

  // Fetch executions
  const { data: executions, isLoading: executionsLoading } = useQuery({
    queryKey: ['traceability-executions', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_cycle_executions')
        .select(`
          id, status, case_id, executed_at, cycle_id,
          cycle:test_cycles(id, name, program_id)
        `);

      // Note: Supabase doesn't support subqueries in .in(), filtering via joined data

      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return data as Array<{
        id: string;
        status: string;
        case_id: string;
        executed_at: string | null;
        cycle_id: string;
        cycle: { id: string; name: string; program_id: string } | null;
      }>;
    },
    enabled: !!user,
  });

  // Fetch defects linked to executions
  const { data: defects, isLoading: defectsLoading } = useQuery({
    queryKey: ['traceability-defects', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_execution_defects')
        .select('id, execution_id, defect_work_item_id');
      if (error) throw error;
      return data as TraceabilityDefect[];
    },
    enabled: !!user,
  });

  // Fetch existing findings
  const { data: findings, refetch: refetchFindings } = useQuery({
    queryKey: ['test-findings', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_findings')
        .select('*')
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TestFinding[];
    },
    enabled: !!user,
  });

  // Compute coverage data
  const coverageData = (() => {
    if (!stories || !testCaseLinks || !executions || !defects) return null;

    // Build lookup maps
    const casesByStory = new Map<string, TraceabilityTestCase[]>();
    testCaseLinks.forEach(link => {
      if (!link.test_case) return;
      const existing = casesByStory.get(link.work_item_id) || [];
      existing.push({
        id: link.test_case.id,
        title: link.test_case.title,
        status: link.test_case.status,
        priority: link.test_case.priority,
        work_item_id: link.work_item_id,
      });
      casesByStory.set(link.work_item_id, existing);
    });

    const executionsByCase = new Map<string, TraceabilityExecution[]>();
    executions.forEach(exec => {
      const existing = executionsByCase.get(exec.case_id) || [];
      existing.push({
        id: exec.id,
        status: exec.status || 'not_run',
        case_id: exec.case_id,
        executed_at: exec.executed_at,
        cycle_id: exec.cycle_id,
        cycle: exec.cycle || undefined,
      });
      executionsByCase.set(exec.case_id, existing);
    });

    const defectsByExecution = new Map<string, TraceabilityDefect[]>();
    defects.forEach(def => {
      const existing = defectsByExecution.get(def.execution_id) || [];
      existing.push(def);
      defectsByExecution.set(def.execution_id, existing);
    });

    // Build story coverage
    const storyCoverages: StoryCoverage[] = stories.map(story => {
      const testCases = casesByStory.get(story.id) || [];
      const storyExecutions: TraceabilityExecution[] = [];
      const storyDefects: TraceabilityDefect[] = [];

      testCases.forEach(tc => {
        const execs = executionsByCase.get(tc.id) || [];
        storyExecutions.push(...execs);
        execs.forEach(e => {
          const defs = defectsByExecution.get(e.id) || [];
          storyDefects.push(...defs);
        });
      });

      const executionStats = {
        total: storyExecutions.length,
        passed: storyExecutions.filter(e => e.status === 'passed').length,
        failed: storyExecutions.filter(e => e.status === 'failed').length,
        blocked: storyExecutions.filter(e => e.status === 'blocked').length,
        notRun: storyExecutions.filter(e => !e.status || e.status === 'not_run').length,
      };

      const coverageBase = {
        storyId: story.id,
        story,
        testCases,
        testCaseCount: testCases.length,
        executions: storyExecutions,
        executionStats,
        defects: storyDefects,
        defectCount: storyDefects.length,
      };

      return {
        ...coverageBase,
        riskScore: calculateRiskScore(coverageBase),
      };
    });

    // Group by feature
    const featureMap = new Map<string, FeatureGroup>();
    const noFeatureStories: StoryCoverage[] = [];

    storyCoverages.forEach(sc => {
      const feature = sc.story.feature;
      if (!feature) {
        noFeatureStories.push(sc);
        return;
      }

      if (!featureMap.has(feature.id)) {
        featureMap.set(feature.id, {
          id: feature.id,
          name: feature.name,
          epicId: feature.epic_id,
          epicName: feature.epic?.name || null,
          stories: [],
          aggregatedStats: {
            totalStories: 0,
            storiesWithTests: 0,
            totalTests: 0,
            totalExecutions: 0,
            passRate: 0,
            defectCount: 0,
            avgRiskScore: 0,
          },
        });
      }

      featureMap.get(feature.id)!.stories.push(sc);
    });

    // Compute aggregated stats
    featureMap.forEach(fg => {
      fg.aggregatedStats.totalStories = fg.stories.length;
      fg.aggregatedStats.storiesWithTests = fg.stories.filter(s => s.testCaseCount > 0).length;
      fg.aggregatedStats.totalTests = fg.stories.reduce((sum, s) => sum + s.testCaseCount, 0);
      fg.aggregatedStats.totalExecutions = fg.stories.reduce((sum, s) => sum + s.executionStats.total, 0);
      
      const totalPassed = fg.stories.reduce((sum, s) => sum + s.executionStats.passed, 0);
      fg.aggregatedStats.passRate = fg.aggregatedStats.totalExecutions > 0 
        ? Math.round((totalPassed / fg.aggregatedStats.totalExecutions) * 100) 
        : 0;
      
      fg.aggregatedStats.defectCount = fg.stories.reduce((sum, s) => sum + s.defectCount, 0);
      fg.aggregatedStats.avgRiskScore = fg.stories.length > 0
        ? Math.round(fg.stories.reduce((sum, s) => sum + s.riskScore, 0) / fg.stories.length)
        : 0;
    });

    const featureGroups = Array.from(featureMap.values()).sort((a, b) => 
      b.aggregatedStats.avgRiskScore - a.aggregatedStats.avgRiskScore
    );

    return {
      storyCoverages,
      featureGroups,
      noFeatureStories,
      totals: {
        stories: storyCoverages.length,
        withTests: storyCoverages.filter(s => s.testCaseCount > 0).length,
        withoutTests: storyCoverages.filter(s => s.testCaseCount === 0).length,
        totalExecutions: storyCoverages.reduce((sum, s) => sum + s.executionStats.total, 0),
        passRate: (() => {
          const total = storyCoverages.reduce((sum, s) => sum + s.executionStats.total, 0);
          const passed = storyCoverages.reduce((sum, s) => sum + s.executionStats.passed, 0);
          return total > 0 ? Math.round((passed / total) * 100) : 0;
        })(),
        defects: storyCoverages.reduce((sum, s) => sum + s.defectCount, 0),
      },
    };
  })();

  // Compute gaps (live)
  const gaps: TraceabilityGap[] = (() => {
    if (!coverageData || !executions) return [];
    
    const result: TraceabilityGap[] = [];
    const now = new Date();
    const thresholdMs = blockedThresholdDays * 24 * 60 * 60 * 1000;

    // Stories with zero tests
    coverageData.storyCoverages
      .filter(s => s.testCaseCount === 0)
      .forEach(s => {
        result.push({
          id: `gap-no-tests-${s.storyId}`,
          type: 'missing_tests',
          severity: s.story.priority === 'high' || s.story.priority === 'critical' ? 'high' : 'medium',
          title: `Story has no test cases`,
          description: `${s.story.story_key || s.story.title} has no linked test cases`,
          entityId: s.storyId,
          entityType: 'story',
          entityTitle: s.story.story_key || s.story.title || s.story.name,
        });
      });

    // High priority stories with no executions
    coverageData.storyCoverages
      .filter(s => (s.story.priority === 'high' || s.story.priority === 'critical') && s.testCaseCount > 0 && s.executionStats.total === 0)
      .forEach(s => {
        result.push({
          id: `gap-no-exec-${s.storyId}`,
          type: 'no_execution',
          severity: 'high',
          title: `High priority story has no executions`,
          description: `${s.story.story_key || s.story.title} has ${s.testCaseCount} tests but none executed`,
          entityId: s.storyId,
          entityType: 'story',
          entityTitle: s.story.story_key || s.story.title || s.story.name,
        });
      });

    // Repeated failures (3+ failed executions on same case with no defect)
    const caseFailureCounts = new Map<string, number>();
    const caseHasDefect = new Map<string, boolean>();
    
    executions.forEach(e => {
      if (e.status === 'failed') {
        caseFailureCounts.set(e.case_id, (caseFailureCounts.get(e.case_id) || 0) + 1);
      }
    });

    defects?.forEach(d => {
      const exec = executions.find(e => e.id === d.execution_id);
      if (exec) {
        caseHasDefect.set(exec.case_id, true);
      }
    });

    caseFailureCounts.forEach((count, caseId) => {
      if (count >= 3 && !caseHasDefect.get(caseId)) {
        const testCase = testCaseLinks?.find(l => l.case_id === caseId)?.test_case;
        result.push({
          id: `gap-repeated-fail-${caseId}`,
          type: 'repeated_failure',
          severity: 'critical',
          title: `Repeated failures with no defect`,
          description: `Test case "${testCase?.title || caseId}" failed ${count} times without a linked defect`,
          entityId: caseId,
          entityType: 'test_case',
          entityTitle: testCase?.title || 'Unknown test case',
          metadata: { failureCount: count },
        });
      }
    });

    // Blocked tests older than N days
    executions
      .filter(e => e.status === 'blocked' && e.executed_at)
      .forEach(e => {
        const blockedAt = new Date(e.executed_at!);
        if (now.getTime() - blockedAt.getTime() > thresholdMs) {
          const testCase = testCaseLinks?.find(l => l.case_id === e.case_id)?.test_case;
          result.push({
            id: `gap-blocked-stale-${e.id}`,
            type: 'blocked_stale',
            severity: 'medium',
            title: `Blocked test older than ${blockedThresholdDays} days`,
            description: `Execution has been blocked since ${blockedAt.toLocaleDateString()}`,
            entityId: e.id,
            entityType: 'execution',
            entityTitle: testCase?.title || 'Unknown test case',
          });
        }
      });

    return result.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  })();

  // Create finding
  const createFindingMutation = useMutation({
    mutationFn: async (input: {
      severity: string;
      type: string;
      title: string;
      description?: string;
      entities_json?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        program_id: programId,
        severity: input.severity,
        type: input.type,
        title: input.title,
        description: input.description || null,
        entities_json: JSON.parse(JSON.stringify(input.entities_json || {})),
        status: 'open',
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('test_findings')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-findings'] });
      toast.success('Finding created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Resolve finding
  const resolveFindingMutation = useMutation({
    mutationFn: async (findingId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_findings')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', findingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-findings'] });
      toast.success('Finding resolved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Dismiss finding
  const dismissFindingMutation = useMutation({
    mutationFn: async (findingId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_findings')
        .update({ status: 'dismissed' })
        .eq('id', findingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-findings'] });
      toast.success('Finding dismissed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isLoading = storiesLoading || linksLoading || executionsLoading || defectsLoading;

  return {
    coverageData,
    gaps,
    findings: findings || [],
    isLoading,
    refetchFindings,
    createFinding: createFindingMutation.mutateAsync,
    resolveFinding: resolveFindingMutation.mutateAsync,
    dismissFinding: dismissFindingMutation.mutateAsync,
    isCreatingFinding: createFindingMutation.isPending,
  };
}
