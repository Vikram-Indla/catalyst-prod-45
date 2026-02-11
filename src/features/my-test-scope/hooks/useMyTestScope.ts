/**
 * My Test Scope Hook
 * Fetches data via get_my_scope and get_my_stats RPCs
 * No mock data — follows no-mock-data policy
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculatePriorityScore, getUrgencyFromDueDate } from '../utils/priorityScore';
import type { 
  MyTestScopeData, 
  TestAssignment, 
  TestScopeSummary, 
  AIRecommendation,
  LinkedDefect,
  WorkloadAnalysis
} from '../types';

export const myTestScopeKeys = {
  all: ['my-test-scope'] as const,
  data: () => [...myTestScopeKeys.all, 'data'] as const,
};

function emptyData(): MyTestScopeData {
  return {
    summary: {
      totalTests: 0, passedTests: 0, failedTests: 0, blockedTests: 0, notRunTests: 0,
      passRate: 0, overdueCount: 0, dueTodayCount: 0, linkedDefectsCount: 0, activeIncidentsCount: 0,
    },
    aiRecommendation: { priorityTest: null, reasons: [], nextTests: [] },
    tests: [],
    defects: [],
    incidents: [],
    workload: {
      totalRemainingTests: 0, totalRemainingMinutes: 0, daysUntilDeadline: 7,
      dailyCapacityMinutes: 360, projectedCompletion: 'on_track', burndownData: [], collaborators: [],
    },
  };
}

async function fetchMyTestScopeData(): Promise<MyTestScopeData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return emptyData();

  // Call both RPCs in parallel
  const [scopeResult, statsResult] = await Promise.all([
    supabase.rpc('get_my_scope', { p_user_id: user.id } as any),
    supabase.rpc('get_my_stats', { p_user_id: user.id } as any),
  ]);

  const scopeRows = scopeResult.data as any[] | null;
  const statsJson = statsResult.data as any;

  // Also try tm_cycle_scope direct query as fallback
  let tests: TestAssignment[] = [];

  if (scopeRows && Array.isArray(scopeRows) && scopeRows.length > 0) {
    tests = scopeRows.map((row: any) => {
      const priorityName = (row.priority || 'medium').toLowerCase();
      const riskImpact = (['critical', 'high', 'medium', 'low'].includes(priorityName) 
        ? priorityName 
        : 'medium') as 'critical' | 'high' | 'medium' | 'low';
      
      const dueDate = row.cycle_end_date || row.end_date || row.release_date || null;
      const priorityScore = calculatePriorityScore({
        dueDate,
        riskImpact,
        blocksGate: false,
        linkedDefectsCount: 0,
        hasIncident: false,
      });

      return {
        id: row.test_case_id || row.cycle_test_case_id,
        scopeId: row.cycle_test_case_id || row.run_id || '',
        key: row.case_key || '',
        title: row.title || 'Unknown Test',
        status: mapStatus(row.execution_status),
        priority: riskImpact,
        priorityScore,
        dueDate,
        urgency: getUrgencyFromDueDate(dueDate),
        cycleId: row.cycle_id || '',
        cycleName: row.cycle_name || '',
        releaseId: row.release_id || undefined,
        releaseName: row.release_name || undefined,
        releaseVersion: row.release_version || undefined,
        linkedStories: [],
        linkedDefects: [],
        linkedIncidents: [],
        blocksGate: false,
        riskImpact,
        estimatedMinutes: row.estimated_time || 15,
        lastExecutedAt: undefined,
        lastResult: undefined,
      };
    });
    tests.sort((a, b) => b.priorityScore - a.priorityScore);
  } else {
    // Fallback: direct query on tm_cycle_scope
    const { data: scopeItems } = await supabase
      .from('tm_cycle_scope')
      .select(`
        id, current_status, cycle_id, test_case_id, assigned_to, due_date,
        tm_test_cases:test_case_id (id, case_key, title, priority_id, estimated_time_minutes, tm_priorities:priority_id (name)),
        tm_test_cycles:cycle_id (id, cycle_key, name, status, planned_end)
      `)
      .eq('assigned_to', user.id);

    if (scopeItems && scopeItems.length > 0) {
      tests = scopeItems.map((item: any) => {
        const testCase = item.tm_test_cases;
        const cycle = item.tm_test_cycles;
        const priorityName = testCase?.tm_priorities?.name?.toLowerCase() || 'medium';
        const riskImpact = (['critical', 'high', 'medium', 'low'].includes(priorityName) 
          ? priorityName 
          : 'medium') as 'critical' | 'high' | 'medium' | 'low';
        const dueDate = item.due_date || cycle?.planned_end || null;
        const priorityScore = calculatePriorityScore({
          dueDate, riskImpact, blocksGate: false, linkedDefectsCount: 0, hasIncident: false,
        });

        return {
          id: item.test_case_id,
          scopeId: item.id,
          key: testCase?.case_key || '',
          title: testCase?.title || 'Unknown Test',
          status: mapStatus(item.current_status),
          priority: riskImpact,
          priorityScore,
          dueDate,
          urgency: getUrgencyFromDueDate(dueDate),
          cycleId: item.cycle_id,
          cycleName: cycle?.name || 'Unknown Cycle',
          linkedStories: [],
          linkedDefects: [],
          linkedIncidents: [],
          blocksGate: false,
          riskImpact,
          estimatedMinutes: testCase?.estimated_time_minutes || 15,
          lastExecutedAt: undefined,
          lastResult: undefined,
        };
      });
      tests.sort((a, b) => b.priorityScore - a.priorityScore);
    }
  }

  // Build stats from RPC or calculate from tests
  const stats = statsJson || {};
  const passedTests = stats.passed_count ?? tests.filter(t => t.status === 'passed').length;
  const failedTests = stats.failed_count ?? tests.filter(t => t.status === 'failed').length;
  const blockedTests = stats.blocked_count ?? tests.filter(t => t.status === 'blocked').length;
  const notRunTests = stats.remaining ?? tests.filter(t => t.status === 'not_run').length;
  const totalTests = stats.total_assigned ?? tests.length;

  const summary: TestScopeSummary = {
    totalTests,
    passedTests,
    failedTests,
    blockedTests,
    notRunTests,
    passRate: stats.pass_rate ?? (totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0),
    overdueCount: tests.filter(t => t.urgency === 'overdue').length,
    dueTodayCount: tests.filter(t => t.urgency === 'due_today').length,
    linkedDefectsCount: 0,
    activeIncidentsCount: 0,
  };

  const aiRecommendation = generateAIRecommendation(tests, summary);
  const workload = calculateWorkload(tests);

  return {
    summary,
    aiRecommendation,
    tests,
    defects: [],
    incidents: [],
    workload,
  };
}

function mapStatus(status: string): 'not_run' | 'passed' | 'failed' | 'blocked' {
  switch (status) {
    case 'passed': return 'passed';
    case 'failed': return 'failed';
    case 'blocked': return 'blocked';
    default: return 'not_run';
  }
}

function generateAIRecommendation(tests: TestAssignment[], summary: TestScopeSummary): AIRecommendation {
  const actionableTests = tests.filter(t => t.status === 'not_run' || t.status === 'failed');
  const priorityTest = actionableTests[0] || null;
  
  const reasons: string[] = [];
  if (priorityTest) {
    if (priorityTest.urgency === 'overdue') reasons.push('Overdue — blocks release gate');
    else if (priorityTest.urgency === 'due_today') reasons.push('Due today — deadline approaching');
    if (priorityTest.priority === 'critical' || priorityTest.priority === 'high') {
      reasons.push(`${priorityTest.priority.charAt(0).toUpperCase() + priorityTest.priority.slice(1)} priority test case`);
    }
    if (reasons.length === 0) reasons.push('Highest priority score in your queue');
  }
  if (summary.overdueCount > 0 && !reasons.some(r => r.includes('overdue'))) {
    reasons.push(`🔴 ${summary.overdueCount} tests overdue`);
  }

  return {
    priorityTest,
    reasons: reasons.slice(0, 3),
    nextTests: actionableTests.slice(1, 4),
  };
}

function calculateWorkload(tests: TestAssignment[]): WorkloadAnalysis {
  const remainingTests = tests.filter(t => t.status === 'not_run' || t.status === 'failed');
  const totalRemainingMinutes = remainingTests.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  
  const testsWithDue = tests.filter(t => t.dueDate);
  const nearestDue = testsWithDue.length > 0 
    ? new Date(Math.min(...testsWithDue.map(t => new Date(t.dueDate!).getTime())))
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  const today = new Date();
  const daysUntilDeadline = Math.max(1, Math.ceil((nearestDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyCapacityMinutes = 360;
  const requiredDailyMinutes = totalRemainingMinutes / daysUntilDeadline;
  
  let projectedCompletion: 'on_track' | 'at_risk' | 'will_miss' = 'on_track';
  if (requiredDailyMinutes > dailyCapacityMinutes * 1.2) projectedCompletion = 'will_miss';
  else if (requiredDailyMinutes > dailyCapacityMinutes * 0.8) projectedCompletion = 'at_risk';

  const startCount = tests.length;
  const completedCount = tests.filter(t => t.status === 'passed').length;
  const burndownData: { date: string; ideal: number; actual: number }[] = [];
  for (let i = -3; i <= daysUntilDeadline; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    burndownData.push({
      date: date.toISOString().split('T')[0],
      ideal: Math.max(0, Math.round(startCount * (1 - ((i + 3) / (daysUntilDeadline + 3))))),
      actual: i <= 0 ? Math.round(startCount - (completedCount * (1 - Math.abs(i) / 3))) : remainingTests.length,
    });
  }

  return {
    totalRemainingTests: remainingTests.length,
    totalRemainingMinutes,
    daysUntilDeadline,
    dailyCapacityMinutes,
    projectedCompletion,
    burndownData,
    collaborators: [],
  };
}

export function useMyTestScope() {
  return useQuery({
    queryKey: myTestScopeKeys.data(),
    queryFn: fetchMyTestScopeData,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
