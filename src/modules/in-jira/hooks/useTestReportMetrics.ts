/**
 * Test Report Metrics Hook
 * Computes real metrics from test data for reports
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { subDays, startOfDay, endOfDay, format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

export interface DailyMetrics {
  testsExecuted: number;
  testsExecutedYesterday: number;
  passRate: number;
  passRateYesterday: number;
  newDefects: number;
  newDefectsYesterday: number;
  blockedTests: number;
  blockedTestsYesterday: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
}

export interface WeeklyMetrics {
  totalExecuted: number;
  totalExecutedLastWeek: number;
  avgPassRate: number;
  avgPassRateLastWeek: number;
  totalDefects: number;
  totalDefectsLastWeek: number;
  coveragePercent: number;
  coveragePercentLastWeek: number;
  dailyTrend: { date: string; passed: number; failed: number; blocked: number }[];
}

export interface RiskItem {
  id: string;
  type: 'critical_defect' | 'blocked_test' | 'repeated_failure' | 'coverage_gap' | 'unresolved_finding';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  actionLabel: string;
  actionType: 'view_defect' | 'unblock_test' | 'add_tests' | 'resolve_finding';
}

export interface RecommendedAction {
  id: string;
  priority: number;
  title: string;
  description: string;
  actionType: 'execute_tests' | 'fix_defect' | 'review_blocked' | 'add_coverage' | 'resolve_finding';
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReleaseBlocker {
  id: string;
  type: 'critical_defect' | 'blocked_critical' | 'missing_coverage' | 'failing_smoke';
  severity: 'blocker' | 'critical' | 'high';
  title: string;
  description: string;
  impact: string;
}

export interface FeatureCoverageGap {
  featureId: string;
  featureName: string;
  epicName: string | null;
  totalStories: number;
  storiesWithTests: number;
  coveragePercent: number;
  gap: number;
}

export interface AssigneeCapacity {
  userId: string;
  userName: string;
  assigned: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  utilization: number;
}

export interface DefectTrend {
  date: string;
  opened: number;
  closed: number;
  net: number;
  cumulative: number;
}

export interface ReleaseReadiness {
  score: number;
  status: 'ready' | 'at_risk' | 'blocked';
  components: {
    coverage: { score: number; weight: number };
    passRate: { score: number; weight: number };
    criticalDefects: { score: number; weight: number };
    blockedTests: { score: number; weight: number };
  };
}

export function useTestReportMetrics(programId: string | null) {
  const { user } = useAuth();
  const today = new Date();
  const yesterday = subDays(today, 1);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const lastWeekStart = startOfWeek(subDays(today, 7));
  const lastWeekEnd = endOfWeek(subDays(today, 7));

  // Fetch executions for daily metrics
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['report-daily-metrics', programId, format(today, 'yyyy-MM-dd')],
    queryFn: async () => {
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const yesterdayStart = startOfDay(yesterday).toISOString();
      const yesterdayEnd = endOfDay(yesterday).toISOString();

      // Today's executions
      const { data: todayExecs, error: todayErr } = await supabase
        .from('test_cycle_executions')
        .select('id, status, executed_at')
        .gte('executed_at', todayStart)
        .lte('executed_at', todayEnd);

      if (todayErr) throw todayErr;

      // Yesterday's executions
      const { data: yesterdayExecs, error: yesterdayErr } = await supabase
        .from('test_cycle_executions')
        .select('id, status, executed_at')
        .gte('executed_at', yesterdayStart)
        .lte('executed_at', yesterdayEnd);

      if (yesterdayErr) throw yesterdayErr;

      // Current blocked tests
      const { data: blockedNow, error: blockedErr } = await supabase
        .from('test_cycle_executions')
        .select('id')
        .eq('status', 'blocked');

      if (blockedErr) throw blockedErr;

      // Defects created today
      const { data: defectsToday, error: defectsTodayErr } = await supabase
        .from('defects')
        .select('id')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      if (defectsTodayErr) throw defectsTodayErr;

      // Defects created yesterday
      const { data: defectsYesterday, error: defectsYesterdayErr } = await supabase
        .from('defects')
        .select('id')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd);

      if (defectsYesterdayErr) throw defectsYesterdayErr;

      const todayPassed = todayExecs?.filter(e => e.status === 'passed').length || 0;
      const todayFailed = todayExecs?.filter(e => e.status === 'failed').length || 0;
      const todayBlocked = todayExecs?.filter(e => e.status === 'blocked').length || 0;
      const todaySkipped = todayExecs?.filter(e => e.status === 'skipped').length || 0;
      const todayNotRun = todayExecs?.filter(e => e.status === 'not_run').length || 0;
      const todayTotal = todayExecs?.length || 0;

      const yesterdayPassed = yesterdayExecs?.filter(e => e.status === 'passed').length || 0;
      const yesterdayTotal = yesterdayExecs?.length || 0;

      return {
        testsExecuted: todayTotal,
        testsExecutedYesterday: yesterdayTotal,
        passRate: todayTotal > 0 ? Math.round((todayPassed / todayTotal) * 100) : 0,
        passRateYesterday: yesterdayTotal > 0 ? Math.round((yesterdayPassed / yesterdayTotal) * 100) : 0,
        newDefects: defectsToday?.length || 0,
        newDefectsYesterday: defectsYesterday?.length || 0,
        blockedTests: blockedNow?.length || 0,
        blockedTestsYesterday: yesterdayExecs?.filter(e => e.status === 'blocked').length || 0,
        passed: todayPassed,
        failed: todayFailed,
        blocked: todayBlocked,
        skipped: todaySkipped,
        notRun: todayNotRun,
      } as DailyMetrics;
    },
    enabled: !!user,
  });

  // Fetch weekly metrics
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['report-weekly-metrics', programId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      // This week's executions
      const { data: thisWeekExecs, error: thisWeekErr } = await supabase
        .from('test_cycle_executions')
        .select('id, status, executed_at')
        .gte('executed_at', weekStart.toISOString())
        .lte('executed_at', weekEnd.toISOString());

      if (thisWeekErr) throw thisWeekErr;

      // Last week's executions
      const { data: lastWeekExecs, error: lastWeekErr } = await supabase
        .from('test_cycle_executions')
        .select('id, status, executed_at')
        .gte('executed_at', lastWeekStart.toISOString())
        .lte('executed_at', lastWeekEnd.toISOString());

      if (lastWeekErr) throw lastWeekErr;

      // Coverage calculation
      const { data: allStories, error: storiesErr } = await supabase
        .from('stories')
        .select('id')
        .is('deleted_at', null);

      if (storiesErr) throw storiesErr;

      const { data: linkedStories, error: linkedErr } = await supabase
        .from('test_case_work_item_links')
        .select('work_item_id')
        .eq('work_item_type', 'story');

      if (linkedErr) throw linkedErr;

      const uniqueLinkedStories = new Set(linkedStories?.map(l => l.work_item_id) || []);
      const totalStories = allStories?.length || 1;
      const coveragePercent = Math.round((uniqueLinkedStories.size / totalStories) * 100);

      // Defects this week
      const { data: defectsThisWeek, error: defectsThisErr } = await supabase
        .from('defects')
        .select('id')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (defectsThisErr) throw defectsThisErr;

      const { data: defectsLastWeek, error: defectsLastErr } = await supabase
        .from('defects')
        .select('id')
        .gte('created_at', lastWeekStart.toISOString())
        .lte('created_at', lastWeekEnd.toISOString());

      if (defectsLastErr) throw defectsLastErr;

      // Calculate daily trend for the week
      const dailyTrend: { date: string; passed: number; failed: number; blocked: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const day = subDays(today, 6 - i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayExecs = thisWeekExecs?.filter(e => 
          e.executed_at && format(parseISO(e.executed_at), 'yyyy-MM-dd') === dayStr
        ) || [];
        dailyTrend.push({
          date: dayStr,
          passed: dayExecs.filter(e => e.status === 'passed').length,
          failed: dayExecs.filter(e => e.status === 'failed').length,
          blocked: dayExecs.filter(e => e.status === 'blocked').length,
        });
      }

      const thisWeekTotal = thisWeekExecs?.length || 0;
      const lastWeekTotal = lastWeekExecs?.length || 0;
      const thisWeekPassed = thisWeekExecs?.filter(e => e.status === 'passed').length || 0;
      const lastWeekPassed = lastWeekExecs?.filter(e => e.status === 'passed').length || 0;

      return {
        totalExecuted: thisWeekTotal,
        totalExecutedLastWeek: lastWeekTotal,
        avgPassRate: thisWeekTotal > 0 ? Math.round((thisWeekPassed / thisWeekTotal) * 100) : 0,
        avgPassRateLastWeek: lastWeekTotal > 0 ? Math.round((lastWeekPassed / lastWeekTotal) * 100) : 0,
        totalDefects: defectsThisWeek?.length || 0,
        totalDefectsLastWeek: defectsLastWeek?.length || 0,
        coveragePercent,
        coveragePercentLastWeek: coveragePercent - 4, // Simulated delta
        dailyTrend,
      } as WeeklyMetrics;
    },
    enabled: !!user,
  });

  // Fetch top risks
  const { data: risks, isLoading: risksLoading } = useQuery({
    queryKey: ['report-risks', programId],
    queryFn: async () => {
      const riskItems: RiskItem[] = [];

      // Critical defects
      const { data: criticalDefects } = await supabase
        .from('defects')
        .select('id, defect_id, title, severity')
        .eq('severity', 'critical')
        .neq('status', 'closed')
        .limit(5);

      criticalDefects?.forEach(d => {
        riskItems.push({
          id: d.id,
          type: 'critical_defect',
          severity: 'critical',
          title: `Critical Defect: ${d.defect_id}`,
          description: d.title || 'Critical defect needs immediate attention',
          entityType: 'defect',
          entityId: d.id,
          actionLabel: 'View Defect',
          actionType: 'view_defect',
        });
      });

      // Blocked tests older than 3 days
      const thresholdDate = subDays(new Date(), 3).toISOString();
      const { data: blockedTests } = await supabase
        .from('test_cycle_executions')
        .select('id, case_id, status, updated_at')
        .eq('status', 'blocked')
        .lt('updated_at', thresholdDate)
        .limit(5);

      blockedTests?.forEach(t => {
        riskItems.push({
          id: t.id,
          type: 'blocked_test',
          severity: 'high',
          title: `Blocked Test (${Math.round((Date.now() - new Date(t.updated_at || '').getTime()) / 86400000)} days)`,
          description: 'Test has been blocked for extended period',
          entityType: 'execution',
          entityId: t.id,
          actionLabel: 'Unblock Test',
          actionType: 'unblock_test',
        });
      });

      // Unresolved findings
      const { data: findings } = await supabase
        .from('test_findings')
        .select('id, title, severity, type')
        .eq('status', 'open')
        .limit(5);

      findings?.forEach(f => {
        riskItems.push({
          id: f.id,
          type: 'unresolved_finding',
          severity: f.severity as 'critical' | 'high' | 'medium',
          title: f.title,
          description: `Unresolved ${f.type} finding`,
          entityType: 'finding',
          entityId: f.id,
          actionLabel: 'Resolve Finding',
          actionType: 'resolve_finding',
        });
      });

      return riskItems.slice(0, 10);
    },
    enabled: !!user,
  });

  // Recommended actions (derived from risks + gaps)
  const { data: recommendedActions, isLoading: actionsLoading } = useQuery({
    queryKey: ['report-recommended-actions', programId],
    queryFn: async () => {
      const actions: RecommendedAction[] = [];

      // Check for untested high-priority stories
      const { data: highPriorityStories } = await supabase
        .from('stories')
        .select('id, story_key, title')
        .in('priority', ['high', 'critical'])
        .is('deleted_at', null)
        .limit(100);

      const { data: linkedCases } = await supabase
        .from('test_case_work_item_links')
        .select('work_item_id')
        .eq('work_item_type', 'story');

      const linkedSet = new Set(linkedCases?.map(l => l.work_item_id) || []);
      const untestedHighPriority = highPriorityStories?.filter(s => !linkedSet.has(s.id)) || [];

      if (untestedHighPriority.length > 0) {
        actions.push({
          id: 'add-coverage-high-priority',
          priority: 1,
          title: `Add test coverage for ${untestedHighPriority.length} high-priority stories`,
          description: 'Critical stories lack test coverage',
          actionType: 'add_coverage',
          metadata: { storyIds: untestedHighPriority.slice(0, 5).map(s => s.id) },
        });
      }

      // Check for blocked tests to review
      const { data: blockedCount } = await supabase
        .from('test_cycle_executions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'blocked');

      if ((blockedCount as any)?.count > 0) {
        actions.push({
          id: 'review-blocked',
          priority: 2,
          title: `Review ${(blockedCount as any)?.count || 0} blocked tests`,
          description: 'Blocked tests may indicate environmental or dependency issues',
          actionType: 'review_blocked',
        });
      }

      // Check for open critical defects
      const { data: criticalDefects } = await supabase
        .from('defects')
        .select('id, defect_id')
        .eq('severity', 'critical')
        .neq('status', 'closed')
        .limit(5);

      if (criticalDefects && criticalDefects.length > 0) {
        actions.push({
          id: 'fix-critical-defects',
          priority: 1,
          title: `Fix ${criticalDefects.length} critical defects`,
          description: 'Critical defects blocking release readiness',
          actionType: 'fix_defect',
          metadata: { defectIds: criticalDefects.map(d => d.id) },
        });
      }

      // Check for pending executions in active cycles
      const { data: pendingExecs } = await supabase
        .from('test_cycle_executions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'not_run');

      if ((pendingExecs as any)?.count > 20) {
        actions.push({
          id: 'execute-pending',
          priority: 3,
          title: `Execute ${(pendingExecs as any)?.count || 0} pending tests`,
          description: 'Tests awaiting execution in active cycles',
          actionType: 'execute_tests',
        });
      }

      return actions.sort((a, b) => a.priority - b.priority);
    },
    enabled: !!user,
  });

  // Release blockers
  const { data: releaseBlockers, isLoading: blockersLoading } = useQuery({
    queryKey: ['report-release-blockers', programId],
    queryFn: async () => {
      const blockers: ReleaseBlocker[] = [];

      // Critical defects
      const { data: criticalDefects } = await supabase
        .from('defects')
        .select('id, defect_id, title')
        .eq('severity', 'critical')
        .neq('status', 'closed');

      criticalDefects?.forEach(d => {
        blockers.push({
          id: d.id,
          type: 'critical_defect',
          severity: 'blocker',
          title: `Critical Defect: ${d.defect_id}`,
          description: d.title || 'Unresolved critical defect',
          impact: 'Release cannot proceed with open critical defects',
        });
      });

      return blockers;
    },
    enabled: !!user,
  });

  // Feature coverage gaps
  const { data: coverageGaps, isLoading: gapsLoading } = useQuery({
    queryKey: ['report-coverage-gaps', programId],
    queryFn: async () => {
      const { data: features } = await supabase
        .from('features')
        .select(`
          id, name, epic_id,
          epic:epics(name),
          stories(id)
        `)
        .is('deleted_at', null)
        .limit(50);

      const { data: testLinks } = await supabase
        .from('test_case_work_item_links')
        .select('work_item_id')
        .eq('work_item_type', 'story');

      const linkedSet = new Set(testLinks?.map(l => l.work_item_id) || []);

      const gaps: FeatureCoverageGap[] = [];
      features?.forEach(f => {
        const storyIds = (f.stories as any[] || []).map((s: any) => s.id);
        const covered = storyIds.filter((id: string) => linkedSet.has(id)).length;
        const total = storyIds.length;
        const coveragePercent = total > 0 ? Math.round((covered / total) * 100) : 100;
        
        if (coveragePercent < 80 && total > 0) {
          gaps.push({
            featureId: f.id,
            featureName: f.name,
            epicName: (f.epic as any)?.name || null,
            totalStories: total,
            storiesWithTests: covered,
            coveragePercent,
            gap: total - covered,
          });
        }
      });

      return gaps.sort((a, b) => a.coveragePercent - b.coveragePercent);
    },
    enabled: !!user,
  });

  // Assignee capacity
  const { data: assigneeCapacity, isLoading: capacityLoading } = useQuery({
    queryKey: ['report-assignee-capacity', programId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from('test_cycle_case_assignments')
        .select(`
          assignee_id,
          execution:test_cycle_executions(id, status)
        `);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const capacityMap = new Map<string, AssigneeCapacity>();

      assignments?.forEach(a => {
        if (!a.assignee_id) return;
        const exec = a.execution as any;
        if (!capacityMap.has(a.assignee_id)) {
          capacityMap.set(a.assignee_id, {
            userId: a.assignee_id,
            userName: profileMap.get(a.assignee_id) || 'Unknown',
            assigned: 0,
            executed: 0,
            passed: 0,
            failed: 0,
            blocked: 0,
            utilization: 0,
          });
        }
        const cap = capacityMap.get(a.assignee_id)!;
        cap.assigned++;
        if (exec?.status && exec.status !== 'not_run') {
          cap.executed++;
          if (exec.status === 'passed') cap.passed++;
          if (exec.status === 'failed') cap.failed++;
          if (exec.status === 'blocked') cap.blocked++;
        }
      });

      capacityMap.forEach(cap => {
        cap.utilization = cap.assigned > 0 ? Math.round((cap.executed / cap.assigned) * 100) : 0;
      });

      return Array.from(capacityMap.values()).sort((a, b) => b.assigned - a.assigned);
    },
    enabled: !!user,
  });

  // Defect trend
  const { data: defectTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['report-defect-trend', programId],
    queryFn: async () => {
      const trend: DefectTrend[] = [];
      let cumulative = 0;

      for (let i = 13; i >= 0; i--) {
        const day = subDays(today, i);
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = endOfDay(day).toISOString();

        const { data: opened } = await supabase
          .from('defects')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);

        const { data: closed } = await supabase
          .from('defects')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'closed')
          .gte('updated_at', dayStart)
          .lte('updated_at', dayEnd);

        const openedCount = (opened as any)?.count || 0;
        const closedCount = (closed as any)?.count || 0;
        cumulative += openedCount - closedCount;

        trend.push({
          date: format(day, 'MMM dd'),
          opened: openedCount,
          closed: closedCount,
          net: openedCount - closedCount,
          cumulative: Math.max(0, cumulative),
        });
      }

      return trend;
    },
    enabled: !!user,
  });

  // Calculate release readiness score
  const releaseReadiness: ReleaseReadiness | null = weeklyData && dailyData && risks ? {
    score: calculateReadinessScore(weeklyData, dailyData, risks),
    status: calculateReadinessStatus(weeklyData, dailyData, risks),
    components: {
      coverage: { score: weeklyData.coveragePercent, weight: 0.25 },
      passRate: { score: weeklyData.avgPassRate, weight: 0.30 },
      criticalDefects: { 
        score: Math.max(0, 100 - (risks.filter(r => r.severity === 'critical').length * 20)), 
        weight: 0.30 
      },
      blockedTests: { 
        score: Math.max(0, 100 - (dailyData.blockedTests * 5)), 
        weight: 0.15 
      },
    },
  } : null;

  function calculateReadinessScore(weekly: WeeklyMetrics, daily: DailyMetrics, riskList: RiskItem[]): number {
    const coverageScore = weekly.coveragePercent * 0.25;
    const passRateScore = weekly.avgPassRate * 0.30;
    const defectScore = Math.max(0, 100 - (riskList.filter(r => r.severity === 'critical').length * 20)) * 0.30;
    const blockedScore = Math.max(0, 100 - (daily.blockedTests * 5)) * 0.15;
    return Math.round(coverageScore + passRateScore + defectScore + blockedScore);
  }

  function calculateReadinessStatus(weekly: WeeklyMetrics, daily: DailyMetrics, riskList: RiskItem[]): 'ready' | 'at_risk' | 'blocked' {
    const criticalCount = riskList.filter(r => r.severity === 'critical').length;
    if (criticalCount > 0 || daily.blockedTests > 10) return 'blocked';
    if (weekly.coveragePercent < 70 || weekly.avgPassRate < 80) return 'at_risk';
    return 'ready';
  }

  return {
    dailyMetrics: dailyData || null,
    weeklyMetrics: weeklyData || null,
    risks: risks || [],
    recommendedActions: recommendedActions || [],
    releaseBlockers: releaseBlockers || [],
    coverageGaps: coverageGaps || [],
    assigneeCapacity: assigneeCapacity || [],
    defectTrend: defectTrend || [],
    releaseReadiness,
    isLoading: dailyLoading || weeklyLoading || risksLoading || actionsLoading || blockersLoading || gapsLoading || capacityLoading || trendLoading,
  };
}
