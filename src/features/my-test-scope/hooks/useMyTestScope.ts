/**
 * My Test Scope Hook
 * Fetches and transforms data for the My Test Scope dashboard
 * Uses mock data for demonstration, with real DB queries as fallback
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

// Generate comprehensive mock data based on spec
function generateMockData(): MyTestScopeData {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 5);

  // Mock test assignments with priority scores
  const mockTests: TestAssignment[] = [
    {
      id: 'tc-2401',
      scopeId: 'scope-2401',
      key: 'TC-2401',
      title: 'OAuth token refresh flow validation',
      status: 'not_run',
      priority: 'critical',
      priorityScore: 98,
      dueDate: twoDaysAgo.toISOString(),
      urgency: 'overdue',
      cycleId: 'cycle-001',
      cycleName: 'Sprint 24.1 Regression',
      linkedStories: ['US-1234'],
      linkedDefects: ['DEF-401', 'DEF-402'],
      linkedIncidents: ['INC-101'],
      blocksGate: true,
      riskImpact: 'critical',
      estimatedMinutes: 30,
      lastExecutedAt: undefined,
      lastResult: undefined,
    },
    {
      id: 'tc-2402',
      scopeId: 'scope-2402',
      key: 'TC-2402',
      title: 'Token expiry handling with session recovery',
      status: 'not_run',
      priority: 'critical',
      priorityScore: 94,
      dueDate: yesterday.toISOString(),
      urgency: 'overdue',
      cycleId: 'cycle-001',
      cycleName: 'Sprint 24.1 Regression',
      linkedStories: ['US-1235'],
      linkedDefects: ['DEF-401'],
      linkedIncidents: [],
      blocksGate: true,
      riskImpact: 'critical',
      estimatedMinutes: 25,
      lastExecutedAt: undefined,
      lastResult: undefined,
    },
    {
      id: 'tc-2403',
      scopeId: 'scope-2403',
      key: 'TC-2403',
      title: 'Authorization code grant flow',
      status: 'failed',
      priority: 'high',
      priorityScore: 87,
      dueDate: today.toISOString(),
      urgency: 'due_today',
      cycleId: 'cycle-001',
      cycleName: 'Sprint 24.1 Regression',
      linkedStories: ['US-1236'],
      linkedDefects: ['DEF-403'],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'high',
      estimatedMinutes: 20,
      lastExecutedAt: yesterday.toISOString(),
      lastResult: 'failed',
    },
    {
      id: 'tc-2404',
      scopeId: 'scope-2404',
      key: 'TC-2404',
      title: 'Multi-factor authentication validation',
      status: 'not_run',
      priority: 'high',
      priorityScore: 76,
      dueDate: today.toISOString(),
      urgency: 'due_today',
      cycleId: 'cycle-001',
      cycleName: 'Sprint 24.1 Regression',
      linkedStories: ['US-1237'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'high',
      estimatedMinutes: 35,
      lastExecutedAt: undefined,
      lastResult: undefined,
    },
    {
      id: 'tc-2405',
      scopeId: 'scope-2405',
      key: 'TC-2405',
      title: 'Session timeout and refresh behavior',
      status: 'passed',
      priority: 'medium',
      priorityScore: 52,
      dueDate: tomorrow.toISOString(),
      urgency: 'due_soon',
      cycleId: 'cycle-001',
      cycleName: 'Sprint 24.1 Regression',
      linkedStories: ['US-1238'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'medium',
      estimatedMinutes: 15,
      lastExecutedAt: today.toISOString(),
      lastResult: 'passed',
    },
    {
      id: 'tc-2406',
      scopeId: 'scope-2406',
      key: 'TC-2406',
      title: 'Password reset email delivery',
      status: 'passed',
      priority: 'medium',
      priorityScore: 48,
      dueDate: tomorrow.toISOString(),
      urgency: 'due_soon',
      cycleId: 'cycle-002',
      cycleName: 'API Integration Tests',
      linkedStories: ['US-1239'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'medium',
      estimatedMinutes: 20,
      lastExecutedAt: today.toISOString(),
      lastResult: 'passed',
    },
    {
      id: 'tc-2407',
      scopeId: 'scope-2407',
      key: 'TC-2407',
      title: 'User profile data encryption at rest',
      status: 'blocked',
      priority: 'high',
      priorityScore: 72,
      dueDate: tomorrow.toISOString(),
      urgency: 'due_soon',
      cycleId: 'cycle-002',
      cycleName: 'API Integration Tests',
      linkedStories: ['US-1240'],
      linkedDefects: ['DEF-404'],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'high',
      estimatedMinutes: 45,
      lastExecutedAt: yesterday.toISOString(),
      lastResult: 'blocked',
    },
    {
      id: 'tc-2408',
      scopeId: 'scope-2408',
      key: 'TC-2408',
      title: 'API rate limiting validation',
      status: 'not_run',
      priority: 'medium',
      priorityScore: 45,
      dueDate: nextWeek.toISOString(),
      urgency: 'on_track',
      cycleId: 'cycle-002',
      cycleName: 'API Integration Tests',
      linkedStories: ['US-1241'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'medium',
      estimatedMinutes: 25,
      lastExecutedAt: undefined,
      lastResult: undefined,
    },
    {
      id: 'tc-2409',
      scopeId: 'scope-2409',
      key: 'TC-2409',
      title: 'Cross-origin request handling',
      status: 'passed',
      priority: 'low',
      priorityScore: 32,
      dueDate: nextWeek.toISOString(),
      urgency: 'on_track',
      cycleId: 'cycle-002',
      cycleName: 'API Integration Tests',
      linkedStories: ['US-1242'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'low',
      estimatedMinutes: 15,
      lastExecutedAt: yesterday.toISOString(),
      lastResult: 'passed',
    },
    {
      id: 'tc-2410',
      scopeId: 'scope-2410',
      key: 'TC-2410',
      title: 'WebSocket connection stability',
      status: 'not_run',
      priority: 'medium',
      priorityScore: 55,
      dueDate: tomorrow.toISOString(),
      urgency: 'due_soon',
      cycleId: 'cycle-003',
      cycleName: 'Performance Suite',
      linkedStories: ['US-1243'],
      linkedDefects: [],
      linkedIncidents: ['INC-102'],
      blocksGate: false,
      riskImpact: 'medium',
      estimatedMinutes: 40,
      lastExecutedAt: undefined,
      lastResult: undefined,
    },
    {
      id: 'tc-2411',
      scopeId: 'scope-2411',
      key: 'TC-2411',
      title: 'Database query performance under load',
      status: 'passed',
      priority: 'high',
      priorityScore: 42,
      dueDate: nextWeek.toISOString(),
      urgency: 'on_track',
      cycleId: 'cycle-003',
      cycleName: 'Performance Suite',
      linkedStories: ['US-1244'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'high',
      estimatedMinutes: 60,
      lastExecutedAt: today.toISOString(),
      lastResult: 'passed',
    },
    {
      id: 'tc-2412',
      scopeId: 'scope-2412',
      key: 'TC-2412',
      title: 'File upload size validation',
      status: 'not_run',
      priority: 'low',
      priorityScore: 28,
      dueDate: nextWeek.toISOString(),
      urgency: 'on_track',
      cycleId: 'cycle-003',
      cycleName: 'Performance Suite',
      linkedStories: ['US-1245'],
      linkedDefects: [],
      linkedIncidents: [],
      blocksGate: false,
      riskImpact: 'low',
      estimatedMinutes: 20,
      lastExecutedAt: undefined,
      lastResult: undefined,
    },
  ];

  // Sort by priority score
  mockTests.sort((a, b) => b.priorityScore - a.priorityScore);

  // Mock linked defects
  const mockDefects: LinkedDefect[] = [
    {
      id: 'def-401',
      key: 'DEF-401',
      title: 'OAuth token not refreshing after 30 minutes of inactivity',
      severity: 'critical',
      status: 'In Progress',
      affectedTestCount: 2,
      affectedTests: ['tc-2401', 'tc-2402'],
    },
    {
      id: 'def-402',
      key: 'DEF-402',
      title: 'Session ID leaking in URL parameters',
      severity: 'critical',
      status: 'Open',
      affectedTestCount: 1,
      affectedTests: ['tc-2401'],
    },
    {
      id: 'def-403',
      key: 'DEF-403',
      title: 'Authorization code expires too quickly in slow networks',
      severity: 'major',
      status: 'In Review',
      affectedTestCount: 1,
      affectedTests: ['tc-2403'],
    },
    {
      id: 'def-404',
      key: 'DEF-404',
      title: 'Encryption key rotation causing temporary service unavailability',
      severity: 'major',
      status: 'Blocked',
      affectedTestCount: 1,
      affectedTests: ['tc-2407'],
    },
    {
      id: 'def-405',
      key: 'DEF-405',
      title: 'Minor styling issue in password reset form',
      severity: 'minor',
      status: 'Open',
      affectedTestCount: 0,
      affectedTests: [],
    },
  ];

  // Mock related incidents
  const mockIncidents: RelatedIncident[] = [
    {
      id: 'inc-101',
      key: 'INC-101',
      title: 'Production authentication failures spike',
      severity: 'P1',
      status: 'Investigating',
      module: 'Authentication',
      affectedTestCount: 1,
      affectedTests: ['tc-2401'],
    },
    {
      id: 'inc-102',
      key: 'INC-102',
      title: 'WebSocket disconnections during peak hours',
      severity: 'P2',
      status: 'Mitigated',
      module: 'Real-time Events',
      affectedTestCount: 1,
      affectedTests: ['tc-2410'],
    },
  ];

  // Calculate summary
  const passedTests = mockTests.filter(t => t.status === 'passed').length;
  const failedTests = mockTests.filter(t => t.status === 'failed').length;
  const blockedTests = mockTests.filter(t => t.status === 'blocked').length;
  const notRunTests = mockTests.filter(t => t.status === 'not_run').length;
  const overdueCount = mockTests.filter(t => t.urgency === 'overdue').length;
  const dueTodayCount = mockTests.filter(t => t.urgency === 'due_today').length;

  const summary: TestScopeSummary = {
    totalTests: mockTests.length,
    passedTests,
    failedTests,
    blockedTests,
    notRunTests,
    passRate: Math.round((passedTests / mockTests.length) * 100),
    overdueCount,
    dueTodayCount,
    linkedDefectsCount: mockDefects.filter(d => d.affectedTestCount > 0).length,
    activeIncidentsCount: mockIncidents.length,
  };

  // Generate AI recommendation
  const priorityTest = mockTests.find(t => t.status === 'not_run' || t.status === 'failed') || null;
  const aiRecommendation: AIRecommendation = {
    priorityTest,
    reasons: priorityTest ? [
      priorityTest.urgency === 'overdue' 
        ? `Overdue by ${Math.abs(Math.ceil((new Date(priorityTest.dueDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))} days — blocks release gate`
        : priorityTest.urgency === 'due_today'
        ? 'Due today — deadline approaching'
        : 'High priority test in queue',
      priorityTest.linkedDefects.length > 0 
        ? `Linked to ${priorityTest.linkedDefects.length} active defect(s)` 
        : 'No blocking defects',
      priorityTest.linkedIncidents.length > 0
        ? '⚡ Related to active production incident'
        : priorityTest.blocksGate
        ? '🚦 Required for quality gate'
        : `${priorityTest.priority.charAt(0).toUpperCase() + priorityTest.priority.slice(1)} priority test case`,
    ].filter(Boolean).slice(0, 3) : [],
    nextTests: mockTests.filter(t => (t.status === 'not_run' || t.status === 'failed') && t.id !== priorityTest?.id).slice(0, 3),
  };

  // Calculate workload
  const remainingTests = mockTests.filter(t => t.status === 'not_run' || t.status === 'failed');
  const totalRemainingMinutes = remainingTests.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const daysUntilDeadline = 5;
  const dailyCapacityMinutes = 360;
  const requiredDailyMinutes = totalRemainingMinutes / daysUntilDeadline;
  
  let projectedCompletion: 'on_track' | 'at_risk' | 'will_miss' = 'on_track';
  if (requiredDailyMinutes > dailyCapacityMinutes * 1.2) {
    projectedCompletion = 'will_miss';
  } else if (requiredDailyMinutes > dailyCapacityMinutes * 0.8) {
    projectedCompletion = 'at_risk';
  }

  // Generate burndown data
  const burndownData: { date: string; ideal: number; actual: number }[] = [];
  const startCount = mockTests.length;
  for (let i = -5; i <= daysUntilDeadline; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    burndownData.push({
      date: date.toISOString().split('T')[0],
      ideal: Math.max(0, startCount - Math.round(startCount * ((i + 5) / (daysUntilDeadline + 5)))),
      actual: i <= 0 ? startCount - passedTests + Math.round(Math.random() * 2) : remainingTests.length,
    });
  }

  const workload: WorkloadAnalysis = {
    totalRemainingTests: remainingTests.length,
    totalRemainingMinutes,
    daysUntilDeadline,
    dailyCapacityMinutes,
    projectedCompletion,
    burndownData,
    collaborators: [
      { userId: 'user-002', name: 'Sarah Chen', module: 'Authentication', testCount: 8 },
      { userId: 'user-003', name: 'Mike Johnson', module: 'API Gateway', testCount: 5 },
      { userId: 'user-004', name: 'Emma Wilson', module: 'User Management', testCount: 6 },
    ],
  };

  return {
    summary,
    aiRecommendation,
    tests: mockTests,
    defects: mockDefects,
    incidents: mockIncidents,
    workload,
  };
}

async function fetchMyTestScopeData(): Promise<MyTestScopeData> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return generateMockData();
  }

  // Try to fetch real data from the database
  try {
    // Fetch assigned scope items - removed created_at ordering since column doesn't exist
    const { data: scopeItems, error: scopeError } = await supabase
      .from('tm_cycle_scope')
      .select(`
        id, 
        current_status, 
        cycle_id, 
        test_case_id, 
        assigned_to,
        tm_test_cases:test_case_id (
          id,
          case_key,
          title,
          priority_id,
          estimated_time_minutes,
          tm_priorities:priority_id (name)
        ),
        tm_test_cycles:cycle_id (
          id,
          cycle_key,
          name,
          status,
          planned_end
        )
      `)
      .eq('assigned_to', user.id);

    // If we have real data, process it; otherwise use mock data
    if (!scopeError && scopeItems && scopeItems.length > 0) {
      return processRealData(scopeItems, user.id);
    }
  } catch (error) {
    console.warn('Error fetching real data, using mock data:', error);
  }

  // Fall back to mock data
  return generateMockData();
}

async function processRealData(scopeItems: any[], userId: string): Promise<MyTestScopeData> {
  const testCaseIds = scopeItems.map((s: any) => s.test_case_id).filter(Boolean);
  
  // Fetch linked defects
  let linkedDefects: LinkedDefect[] = [];
  if (testCaseIds.length > 0) {
    try {
      const defectQuery = supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, test_case_id');
      const { data: defectLinks } = await (defectQuery as any).in('test_case_id', testCaseIds);
      
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
    } catch (error) {
      console.warn('Error fetching defects:', error);
    }
  }

  // Transform scope items to TestAssignment
  const tests: TestAssignment[] = scopeItems.map((item: any) => {
    const testCase = item.tm_test_cases;
    const cycle = item.tm_test_cycles;
    const priorityName = testCase?.tm_priorities?.name?.toLowerCase() || 'medium';
    const riskImpact = (['critical', 'high', 'medium', 'low'].includes(priorityName) 
      ? priorityName 
      : 'medium') as 'critical' | 'high' | 'medium' | 'low';
    
    const dueDate = cycle?.planned_end || null;
    const linkedDefectsForTest = linkedDefects.filter(d => 
      d.affectedTests.includes(item.test_case_id)
    );
    
    const priorityScore = calculatePriorityScore({
      dueDate,
      riskImpact,
      blocksGate: false,
      linkedDefectsCount: linkedDefectsForTest.length,
      hasIncident: false,
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
      linkedDefects: linkedDefectsForTest.map(d => d.id),
      linkedIncidents: [],
      blocksGate: false,
      riskImpact,
      estimatedMinutes: testCase?.estimated_time_minutes || 15,
      lastExecutedAt: undefined,
      lastResult: undefined,
    };
  });

  tests.sort((a, b) => b.priorityScore - a.priorityScore);

  const summary = calculateSummary(tests, linkedDefects);
  const aiRecommendation = generateAIRecommendation(tests, summary);
  const workload = calculateWorkload(tests);

  return {
    summary,
    aiRecommendation,
    tests,
    defects: linkedDefects,
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
      reasons.push(`Overdue — blocks release gate`);
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

  if (summary.overdueCount > 0 && !reasons.some(r => r.includes('overdue'))) {
    reasons.push(`🔴 ${summary.overdueCount} tests overdue`);
  }
  if (summary.linkedDefectsCount > 0) {
    reasons.push(`🐛 ${summary.linkedDefectsCount} linked defects`);
  }

  return {
    priorityTest,
    reasons: reasons.slice(0, 3),
    nextTests: notRunTests.slice(1, 4),
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
  if (requiredDailyMinutes > dailyCapacityMinutes * 1.2) {
    projectedCompletion = 'will_miss';
  } else if (requiredDailyMinutes > dailyCapacityMinutes * 0.8) {
    projectedCompletion = 'at_risk';
  }

  const burndownData: { date: string; ideal: number; actual: number }[] = [];
  const startCount = tests.length;
  const completedCount = tests.filter(t => t.status === 'passed').length;
  
  for (let i = -3; i <= daysUntilDeadline; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const idealProgress = startCount * (1 - ((i + 3) / (daysUntilDeadline + 3)));
    const actualProgress = i <= 0 
      ? startCount - (completedCount * (1 - Math.abs(i) / 3))
      : remainingTests.length;
    
    burndownData.push({
      date: dateStr,
      ideal: Math.max(0, Math.round(idealProgress)),
      actual: Math.round(actualProgress),
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
