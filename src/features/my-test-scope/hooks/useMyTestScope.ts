/**
 * My Test Scope Hook
 * Fetches and transforms data for the My Test Scope dashboard
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
  RelatedIncident,
  WorkloadAnalysis
} from '../types';

export const myTestScopeKeys = {
  all: ['my-test-scope'] as const,
  data: () => [...myTestScopeKeys.all, 'data'] as const,
};

async function fetchMyTestScopeData(): Promise<MyTestScopeData> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return getEmptyData();
  }

  // Fetch assigned scope items with full details
  const { data: scopeItems } = await supabase
    .from('tm_cycle_scope')
    .select('id, current_status, cycle_id, test_case_id, assigned_to')
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false });

  // Fetch test case details
  const testCaseIds = (scopeItems || []).map((s: any) => s.test_case_id).filter(Boolean);
  
  let testCaseMap = new Map<string, any>();
  let cycleMap = new Map<string, any>();
  
  if (testCaseIds.length > 0) {
    const { data: testCases } = await supabase
      .from('tm_test_cases')
      .select('id, case_key, title, priority_id, estimated_time_minutes')
      .in('id', testCaseIds);
    
    (testCases || []).forEach((tc: any) => testCaseMap.set(tc.id, tc));
  }

  // Fetch cycle details
  const cycleIds = [...new Set((scopeItems || []).map((s: any) => s.cycle_id).filter(Boolean))];
  if (cycleIds.length > 0) {
    const { data: cycles } = await supabase
      .from('tm_test_cycles')
      .select('id, cycle_key, name, status, planned_end')
      .in('id', cycleIds);
    
    (cycles || []).forEach((c: any) => cycleMap.set(c.id, c));
  }

  // Fetch defects linked to user's test cases
  let linkedDefects: LinkedDefect[] = [];
  if (testCaseIds.length > 0) {
    // Use filter with or condition for test_case_ids to avoid deep type inference
    const defectQuery = supabase
      .from('tm_defects')
      .select('id, defect_key, title, severity, status, test_case_id');
    
    const { data: defectLinks } = await (defectQuery as any).in('test_case_id', testCaseIds);
    
    // Group defects by defect ID
    const defectMap = new Map<string, LinkedDefect>();
    (defectLinks || []).forEach((d: any) => {
      if (!defectMap.has(d.id)) {
        defectMap.set(d.id, {
          id: d.id,
          key: d.defect_key,
          title: d.title,
          severity: d.severity || 'minor',
          status: d.status,
          affectedTestCount: 1,
          affectedTests: [d.test_case_id],
        });
      } else {
        const existing = defectMap.get(d.id)!;
        existing.affectedTestCount++;
        existing.affectedTests.push(d.test_case_id);
      }
    });
    linkedDefects = Array.from(defectMap.values());
  }

  // Transform scope items to TestAssignment with priority scores
  const tests: TestAssignment[] = (scopeItems || []).map((item: any) => {
    const priorityName = item.tm_test_cases?.tm_priorities?.name?.toLowerCase() || 'medium';
    const riskImpact = (['critical', 'high', 'medium', 'low'].includes(priorityName) 
      ? priorityName 
      : 'medium') as 'critical' | 'high' | 'medium' | 'low';
    
    const dueDate = item.tm_test_cycles?.planned_end || null;
    const linkedDefectsForTest = linkedDefects.filter(d => 
      d.affectedTests.includes(item.test_case_id)
    );
    
    const priorityScore = calculatePriorityScore({
      dueDate,
      riskImpact,
      blocksGate: false, // Would need quality gate data
      linkedDefectsCount: linkedDefectsForTest.length,
      hasIncident: false, // Would need incident data
    });

    return {
      id: item.test_case_id,
      scopeId: item.id,
      key: item.tm_test_cases?.case_key || '',
      title: item.tm_test_cases?.title || 'Unknown Test',
      status: mapStatus(item.current_status),
      priority: riskImpact,
      priorityScore,
      dueDate,
      urgency: getUrgencyFromDueDate(dueDate),
      cycleId: item.cycle_id,
      cycleName: item.tm_test_cycles?.name || 'Unknown Cycle',
      linkedStories: [],
      linkedDefects: linkedDefectsForTest.map(d => d.id),
      linkedIncidents: [],
      blocksGate: false,
      riskImpact,
      estimatedMinutes: item.tm_test_cases?.estimated_time_minutes || 15,
      lastExecutedAt: undefined,
      lastResult: undefined,
    };
  });

  // Sort by priority score descending
  tests.sort((a, b) => b.priorityScore - a.priorityScore);

  // Calculate summary
  const summary = calculateSummary(tests, linkedDefects);

  // Generate AI recommendation
  const aiRecommendation = generateAIRecommendation(tests, summary);

  // Calculate workload
  const workload = calculateWorkload(tests);

  return {
    summary,
    aiRecommendation,
    tests,
    defects: linkedDefects,
    incidents: [], // Would need incident integration
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

function calculateSummary(tests: TestAssignment[], defects: LinkedDefect[]): TestScopeSummary {
  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const blockedTests = tests.filter(t => t.status === 'blocked').length;
  const notRunTests = tests.filter(t => t.status === 'not_run').length;
  const overdueCount = tests.filter(t => t.urgency === 'overdue').length;
  const dueTodayCount = tests.filter(t => t.urgency === 'due_today').length;

  return {
    totalTests: tests.length,
    passedTests,
    failedTests,
    blockedTests,
    notRunTests,
    passRate: tests.length > 0 ? Math.round((passedTests / tests.length) * 100) : 0,
    overdueCount,
    dueTodayCount,
    linkedDefectsCount: defects.length,
    activeIncidentsCount: 0,
  };
}

function generateAIRecommendation(tests: TestAssignment[], summary: TestScopeSummary): AIRecommendation {
  const notRunTests = tests.filter(t => t.status === 'not_run' || t.status === 'failed');
  const priorityTest = notRunTests[0] || null;
  
  const reasons: string[] = [];
  
  if (priorityTest) {
    if (priorityTest.urgency === 'overdue') {
      reasons.push(`Overdue by ${formatOverdueDays(priorityTest.dueDate)} days`);
    } else if (priorityTest.urgency === 'due_today') {
      reasons.push('Due today — deadline approaching');
    }
    
    if (priorityTest.priority === 'critical' || priorityTest.priority === 'high') {
      reasons.push(`${priorityTest.priority.charAt(0).toUpperCase() + priorityTest.priority.slice(1)} priority test case`);
    }
    
    if (priorityTest.linkedDefects.length > 0) {
      reasons.push(`Linked to ${priorityTest.linkedDefects.length} defect(s)`);
    }
    
    if (priorityTest.blocksGate) {
      reasons.push('Blocks quality gate');
    }
    
    if (reasons.length === 0) {
      reasons.push('Highest priority score in your queue');
    }
  }

  // Add general insights
  if (summary.overdueCount > 0) {
    reasons.push(`🔴 ${summary.overdueCount} tests overdue`);
  }
  if (summary.linkedDefectsCount > 0) {
    reasons.push(`🐛 ${summary.linkedDefectsCount} linked defects`);
  }

  return {
    priorityTest,
    reasons: reasons.slice(0, 3), // Max 3 reasons
    nextTests: notRunTests.slice(1, 4), // Next 3 tests
  };
}

function formatOverdueDays(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  return Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateWorkload(tests: TestAssignment[]): WorkloadAnalysis {
  const remainingTests = tests.filter(t => t.status === 'not_run' || t.status === 'failed');
  const totalRemainingMinutes = remainingTests.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  
  // Find nearest deadline
  const testsWithDue = tests.filter(t => t.dueDate);
  const nearestDue = testsWithDue.length > 0 
    ? new Date(Math.min(...testsWithDue.map(t => new Date(t.dueDate!).getTime())))
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  const today = new Date();
  const daysUntilDeadline = Math.max(1, Math.ceil((nearestDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  const dailyCapacityMinutes = 360; // 6 hours
  const requiredDailyMinutes = totalRemainingMinutes / daysUntilDeadline;
  
  let projectedCompletion: 'on_track' | 'at_risk' | 'will_miss' = 'on_track';
  if (requiredDailyMinutes > dailyCapacityMinutes * 1.2) {
    projectedCompletion = 'will_miss';
  } else if (requiredDailyMinutes > dailyCapacityMinutes * 0.8) {
    projectedCompletion = 'at_risk';
  }

  // Generate burndown data
  const burndownData: { date: string; ideal: number; actual: number }[] = [];
  const startCount = tests.length;
  const completedCount = tests.filter(t => t.status === 'passed').length;
  
  for (let i = -3; i <= daysUntilDeadline; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const idealProgress = i <= 0 
      ? startCount - (Math.abs(i) * (startCount / (daysUntilDeadline + 3)))
      : startCount * (1 - ((i + 3) / (daysUntilDeadline + 3)));
    
    const actualProgress = i <= 0 
      ? startCount - (completedCount * (1 - Math.abs(i) / 3))
      : null;
    
    burndownData.push({
      date: dateStr,
      ideal: Math.max(0, Math.round(idealProgress)),
      actual: actualProgress !== null ? Math.round(actualProgress) : remainingTests.length,
    });
  }

  return {
    totalRemainingTests: remainingTests.length,
    totalRemainingMinutes,
    daysUntilDeadline,
    dailyCapacityMinutes,
    projectedCompletion,
    burndownData,
    collaborators: [], // Would need team data
  };
}

function getEmptyData(): MyTestScopeData {
  return {
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      blockedTests: 0,
      notRunTests: 0,
      passRate: 0,
      overdueCount: 0,
      dueTodayCount: 0,
      linkedDefectsCount: 0,
      activeIncidentsCount: 0,
    },
    aiRecommendation: {
      priorityTest: null,
      reasons: [],
      nextTests: [],
    },
    tests: [],
    defects: [],
    incidents: [],
    workload: {
      totalRemainingTests: 0,
      totalRemainingMinutes: 0,
      daysUntilDeadline: 7,
      dailyCapacityMinutes: 360,
      projectedCompletion: 'on_track',
      burndownData: [],
      collaborators: [],
    },
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
