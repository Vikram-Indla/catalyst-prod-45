import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ProjectOverviewMetrics,
  ContributorData,
  TopCaseData,
  HealthScoreBreakdown,
  ActivitySummary,
  ActivityByType,
  ActivityFeedItem,
  HourlyActivityData,
  ReportFilters
} from '@/types/reports.types';
import { calculateHealthScore, calculateContributionScore, calculateUsageScore } from '@/utils/healthScoreCalculator';

export function useProjectMetricsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['project-metrics-report', filters],
    queryFn: async () => {
      const programId = filters.programId;
      if (!programId) throw new Error('Program ID required');

      // Fetch test cases
      const { data: testCases } = await supabase
        .from('test_cases')
        .select('*')
        .eq('program_id', programId);

      // Fetch test sets
      const { data: testSets } = await supabase
        .from('test_sets')
        .select('*')
        .eq('program_id', programId);

      // Fetch test cycles
      const { data: testCycles } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('program_id', programId);

      // Fetch executions
      const { data: executions } = await supabase
        .from('test_executions')
        .select('*')
        .eq('program_id', programId);

      // Fetch execution defects as proxy for defect count
      const { data: executionDefects } = await supabase
        .from('test_execution_defects')
        .select('*');

      // Fetch activity logs (last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'test_case')
        .gte('created_at', ninetyDaysAgo);

      // Calculate metrics
      const automatedCases = testCases?.filter(tc => tc.automation_status === 'automated') || [];
      const passedExecutions = executions?.filter(e => e.status === 'passed') || [];
      const defectCount = new Set(executionDefects?.map(ed => ed.defect_work_item_id) || []).size;

      const overview: ProjectOverviewMetrics = {
        testCases: testCases?.length || 0,
        testSets: testSets?.length || 0,
        cycles: testCycles?.length || 0,
        executions: executions?.length || 0,
        defects: defectCount,
        automated: automatedCases.length,
        automatedPercentage: testCases?.length ? Math.round((automatedCases.length / testCases.length) * 100) : 0,
        contributors: new Set(executions?.map(e => e.executed_by) || []).size,
        storageUsed: 0,
        storageLimit: 10 * 1024 * 1024 * 1024,
      };

      // Calculate health score
      const healthScore = calculateHealthScore({
        totalCases: testCases?.length || 0,
        executedCases: new Set(executions?.map(e => e.test_case_id) || []).size,
        automatedCases: automatedCases.length,
        passedExecutions: passedExecutions.length,
        totalExecutions: executions?.length || 0,
        resolvedDefects: Math.floor(defectCount * 0.7),
        totalDefects: defectCount,
        recentActivityCount: activities?.length || 0,
        expectedActivityCount: 100,
      });

      // Calculate top contributors
      const contributorMap = new Map<string, { created: number; executed: number; defects: number }>();
      
      testCases?.forEach(tc => {
        if (tc.created_by) {
          const contrib = contributorMap.get(tc.created_by) || { created: 0, executed: 0, defects: 0 };
          contrib.created++;
          contributorMap.set(tc.created_by, contrib);
        }
      });

      executions?.forEach(e => {
        if (e.executed_by) {
          const contrib = contributorMap.get(e.executed_by) || { created: 0, executed: 0, defects: 0 };
          contrib.executed++;
          contributorMap.set(e.executed_by, contrib);
        }
      });

      const contributors: ContributorData[] = Array.from(contributorMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: `User ${userId.slice(0, 8)}`,
          casesCreated: data.created,
          casesExecuted: data.executed,
          defectsFound: data.defects,
          contributionScore: calculateContributionScore(data.created, data.executed, data.defects),
        }))
        .sort((a, b) => b.contributionScore - a.contributionScore)
        .slice(0, 10);

      // Calculate top cases
      const caseUsageMap = new Map<string, { executions: number; cycles: Set<string>; defects: number }>();
      
      executions?.forEach(e => {
        const usage = caseUsageMap.get(e.test_case_id) || { executions: 0, cycles: new Set(), defects: 0 };
        usage.executions++;
        if (e.test_cycle_id) usage.cycles.add(e.test_cycle_id);
        caseUsageMap.set(e.test_case_id, usage);
      });

      const topCases: TopCaseData[] = Array.from(caseUsageMap.entries())
        .map(([caseId, data]) => {
          const testCase = testCases?.find(tc => tc.id === caseId);
          return {
            key: `TC-${caseId.slice(0, 8)}`,
            title: testCase?.title || 'Unknown',
            timesUsed: data.executions,
            defectsDiscovered: data.defects,
            usageScore: calculateUsageScore(data.executions, data.cycles.size, data.defects),
          };
        })
        .sort((a, b) => b.usageScore - a.usageScore)
        .slice(0, 50);

      return {
        overview,
        healthScore,
        contributors,
        topCases,
      };
    },
    enabled: !!filters.programId,
  });
}

export function useProjectActivityReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['project-activity-report', filters],
    queryFn: async () => {
      const startDate = filters.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = filters.dateRange?.end || new Date();

      // Fetch activity logs
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      // Calculate summary
      const activityByDay = new Map<string, number>();
      const activityByUser = new Map<string, number>();
      const activityByType = new Map<string, number>();

      activities?.forEach(a => {
        const day = a.created_at?.split('T')[0] || '';
        activityByDay.set(day, (activityByDay.get(day) || 0) + 1);
        
        if (a.actor_id) {
          activityByUser.set(a.actor_id, (activityByUser.get(a.actor_id) || 0) + 1);
        }
        
        activityByType.set(a.action, (activityByType.get(a.action) || 0) + 1);
      });

      // Find most active day
      let mostActiveDay = '';
      let mostActiveDayCount = 0;
      activityByDay.forEach((count, day) => {
        if (count > mostActiveDayCount) {
          mostActiveDay = day;
          mostActiveDayCount = count;
        }
      });

      // Find most active user
      let mostActiveUser = '';
      let mostActiveUserCount = 0;
      activityByUser.forEach((count, user) => {
        if (count > mostActiveUserCount) {
          mostActiveUser = user;
          mostActiveUserCount = count;
        }
      });

      const summary: ActivitySummary = {
        total: activities?.length || 0,
        mostActiveDay,
        mostActiveDayCount,
        mostActiveUser: mostActiveUser ? `User ${mostActiveUser.slice(0, 8)}` : 'N/A',
        mostActiveUserCount,
        activityTypes: activityByType.size,
      };

      // Activity by type distribution
      const typeColors: Record<string, string> = {
        created: '#10b981',
        updated: '#3b82f6',
        deleted: '#ef4444',
        executed: '#c69c6d',
        approved: '#8b5cf6',
      };

      const byType: ActivityByType[] = Array.from(activityByType.entries())
        .map(([type, count]) => ({
          type,
          count,
          color: typeColors[type] || '#6b7280',
        }))
        .sort((a, b) => b.count - a.count);

      // Activity feed
      const feed: ActivityFeedItem[] = (activities || []).slice(0, 100).map(a => ({
        id: a.id,
        timestamp: a.created_at || '',
        userId: a.actor_id || '',
        userName: a.actor_id ? `User ${a.actor_id.slice(0, 8)}` : 'System',
        action: a.action,
        target: a.entity_type,
        targetId: a.entity_id,
        details: `${a.action} ${a.entity_type}`,
      }));

      // Hourly heatmap data
      const hourlyData: HourlyActivityData[] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      days.forEach(day => {
        hourlyData.push({
          day,
          hours: Array(24).fill(0),
        });
      });

      activities?.forEach(a => {
        if (a.created_at) {
          const date = new Date(a.created_at);
          const dayIndex = date.getDay();
          const hour = date.getHours();
          if (hourlyData[dayIndex]) {
            hourlyData[dayIndex].hours[hour]++;
          }
        }
      });

      return {
        summary,
        byType,
        feed,
        hourlyData,
      };
    },
    enabled: !!filters.programId,
  });
}

export function useUserActivityReport(userId: string, filters: ReportFilters) {
  return useQuery({
    queryKey: ['user-activity-report', userId, filters],
    queryFn: async () => {
      const startDate = filters.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = filters.dateRange?.end || new Date();

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch user's test cases created
      const { data: createdCases } = await supabase
        .from('test_cases')
        .select('*')
        .eq('created_by', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch user's executions
      const { data: executions } = await supabase
        .from('test_executions')
        .select('*')
        .eq('executed_by', userId)
        .gte('execution_date', startDate.toISOString())
        .lte('execution_date', endDate.toISOString());

      // Fetch all executions for team average
      const { data: allExecutions } = await supabase
        .from('test_executions')
        .select('*')
        .gte('execution_date', startDate.toISOString())
        .lte('execution_date', endDate.toISOString());

      const passedExecutions = executions?.filter(e => e.status === 'passed') || [];
      const totalEffortSeconds = executions?.reduce((sum, e) => sum + (e.execution_time_seconds || 0), 0) || 0;

      const metrics = {
        casesCreated: createdCases?.length || 0,
        casesExecuted: executions?.length || 0,
        defectsFound: 0,
        effortHours: Math.round(totalEffortSeconds / 3600 * 10) / 10,
      };

      const performance = {
        executions: executions?.length || 0,
        passRate: executions?.length ? Math.round((passedExecutions.length / executions.length) * 100 * 10) / 10 : 0,
        avgTimeMinutes: executions?.length ? Math.round((totalEffortSeconds / executions.length) / 60) : 0,
        efficiency: 85,
      };

      // Team averages
      const teamPassedExecutions = allExecutions?.filter(e => e.status === 'passed') || [];
      const teamTotalEffort = allExecutions?.reduce((sum, e) => sum + (e.execution_time_seconds || 0), 0) || 0;
      const uniqueTesters = new Set(allExecutions?.map(e => e.executed_by) || []).size;

      const comparison = [
        {
          metric: 'Pass Rate',
          userValue: performance.passRate,
          teamAvg: allExecutions?.length ? Math.round((teamPassedExecutions.length / allExecutions.length) * 100 * 10) / 10 : 0,
          difference: 0,
        },
        {
          metric: 'Avg Time (min)',
          userValue: performance.avgTimeMinutes,
          teamAvg: allExecutions?.length ? Math.round((teamTotalEffort / allExecutions.length) / 60) : 0,
          difference: 0,
        },
        {
          metric: 'Executions',
          userValue: executions?.length || 0,
          teamAvg: uniqueTesters > 0 ? Math.round((allExecutions?.length || 0) / uniqueTesters) : 0,
          difference: 0,
        },
      ];

      comparison.forEach(c => {
        c.difference = Math.round((c.userValue - c.teamAvg) * 10) / 10;
      });

      return {
        profile: {
          userId,
          userName: profile?.full_name || `User ${userId.slice(0, 8)}`,
          avatar: profile?.avatar_url,
          role: 'Tester',
          memberSince: profile?.created_at || '',
          totalContributions: metrics.casesCreated + metrics.casesExecuted,
        },
        metrics,
        performance,
        comparison,
        recentExecutions: (executions || []).slice(0, 50),
        createdCases: (createdCases || []).slice(0, 50),
      };
    },
    enabled: !!userId,
  });
}

export function useRunDistributionReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['run-distribution-report', filters],
    queryFn: async () => {
      const programId = filters.programId;

      // Fetch execution runs
      const { data: runs } = await supabase
        .from('test_execution_runs')
        .select('*, test_cycles(name, program_id)')
        .order('created_at', { ascending: false });

      const programRuns = runs?.filter(r => r.test_cycles?.program_id === programId) || [];

      // Fetch executions
      const { data: executions } = await supabase
        .from('test_executions')
        .select('*')
        .eq('program_id', programId);

      const totalExecutions = executions?.length || 0;
      const activeRuns = programRuns.length; // All runs active by default

      const overview = {
        totalRuns: programRuns.length,
        totalExecutions,
        avgPerRun: programRuns.length > 0 ? Math.round(totalExecutions / programRuns.length) : 0,
        activeRuns,
      };

      // Runs by cycle
      const runsByCycle = new Map<string, number>();
      programRuns.forEach(r => {
        const cycleName = r.test_cycles?.name || 'Unknown';
        runsByCycle.set(cycleName, (runsByCycle.get(cycleName) || 0) + 1);
      });

      // Tester participation
      const testerMap = new Map<string, { runs: Set<string>; executions: number; passed: number }>();
      executions?.forEach(e => {
        if (e.executed_by) {
          const data = testerMap.get(e.executed_by) || { runs: new Set(), executions: 0, passed: 0 };
          data.executions++;
          if (e.status === 'passed') data.passed++;
          testerMap.set(e.executed_by, data);
        }
      });

      const testerParticipation = Array.from(testerMap.entries())
        .map(([testerId, data]) => ({
          testerId,
          testerName: `User ${testerId.slice(0, 8)}`,
          runsParticipated: data.runs.size || 1,
          executions: data.executions,
          avgPerRun: data.runs.size > 0 ? Math.round(data.executions / data.runs.size) : data.executions,
          passRate: data.executions > 0 ? Math.round((data.passed / data.executions) * 100) : 0,
        }))
        .sort((a, b) => b.executions - a.executions);

      return {
        overview,
        runsByCycle: Array.from(runsByCycle.entries()).map(([cycle, count]) => ({ cycle, count })),
        testerParticipation,
        runs: programRuns,
      };
    },
    enabled: !!filters.programId,
  });
}

export function useCaseUsageReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['case-usage-report', filters],
    queryFn: async () => {
      const programId = filters.programId;

      // Fetch test cases
      const { data: testCases } = await supabase
        .from('test_cases')
        .select('*')
        .eq('program_id', programId);

      // Fetch executions
      const { data: executions } = await supabase
        .from('test_executions')
        .select('*')
        .eq('program_id', programId);

      const caseUsageMap = new Map<string, { 
        executions: number; 
        cycles: Set<string>; 
        passed: number;
        lastExecuted?: string;
      }>();

      executions?.forEach(e => {
        const data = caseUsageMap.get(e.test_case_id) || { executions: 0, cycles: new Set(), passed: 0 };
        data.executions++;
        if (e.test_cycle_id) data.cycles.add(e.test_cycle_id);
        if (e.status === 'passed') data.passed++;
        if (!data.lastExecuted || e.execution_date > data.lastExecuted) {
          data.lastExecuted = e.execution_date;
        }
        caseUsageMap.set(e.test_case_id, data);
      });

      const executedCases = new Set(executions?.map(e => e.test_case_id) || []);
      const neverExecuted = testCases?.filter(tc => !executedCases.has(tc.id)) || [];

      const overview = {
        total: testCases?.length || 0,
        uniqueExecuted: executedCases.size,
        executedPercentage: testCases?.length ? Math.round((executedCases.size / testCases.length) * 100) : 0,
        neverExecuted: neverExecuted.length,
        neverExecutedPercentage: testCases?.length ? Math.round((neverExecuted.length / testCases.length) * 100) : 0,
        avgExecutionsPerCase: executedCases.size > 0 ? 
          Math.round((executions?.length || 0) / executedCases.size * 10) / 10 : 0,
      };

      // Top 50 most used
      const topCases = Array.from(caseUsageMap.entries())
        .map(([caseId, data], index) => {
          const testCase = testCases?.find(tc => tc.id === caseId);
          return {
            rank: index + 1,
            key: `TC-${caseId.slice(0, 8)}`,
            title: testCase?.title || 'Unknown',
            executionCount: data.executions,
            uniqueCycles: data.cycles.size,
            passRate: data.executions > 0 ? Math.round((data.passed / data.executions) * 100) : 0,
            defectsFound: 0,
            usageScore: calculateUsageScore(data.executions, data.cycles.size, 0),
          };
        })
        .sort((a, b) => b.usageScore - a.usageScore)
        .slice(0, 50)
        .map((c, i) => ({ ...c, rank: i + 1 }));

      // Stability analysis
      const stable: string[] = [];
      const flaky: string[] = [];
      const unstable: string[] = [];

      caseUsageMap.forEach((data, caseId) => {
        if (data.executions >= 5) {
          const passRate = (data.passed / data.executions) * 100;
          const key = `TC-${caseId.slice(0, 8)}`;
          if (passRate >= 90) stable.push(key);
          else if (passRate >= 50) flaky.push(key);
          else unstable.push(key);
        }
      });

      const stabilityAnalysis = {
        stable: { count: stable.length, cases: stable.slice(0, 10) },
        flaky: { count: flaky.length, cases: flaky.slice(0, 10) },
        unstable: { count: unstable.length, cases: unstable.slice(0, 10) },
      };

      // Retirement candidates
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const retirementCandidates = neverExecuted
        .filter(tc => new Date(tc.created_at || 0) < ninetyDaysAgo)
        .map(tc => ({
          key: `TC-${tc.id.slice(0, 8)}`,
          title: tc.title || 'Unknown',
          lastExecuted: 'Never',
          daysInactive: Math.ceil((Date.now() - new Date(tc.created_at || 0).getTime()) / (1000 * 60 * 60 * 24)),
          recommendation: 'Consider archiving',
        }))
        .slice(0, 20);

      return {
        overview,
        topCases,
        neverExecutedCases: neverExecuted.slice(0, 50).map(tc => ({
          key: `TC-${tc.id.slice(0, 8)}`,
          title: tc.title || 'Unknown',
          created: tc.created_at || '',
          age: Math.ceil((Date.now() - new Date(tc.created_at || 0).getTime()) / (1000 * 60 * 60 * 24)),
          priority: tc.priority || 'Medium',
          owner: tc.created_by || 'Unknown',
        })),
        stabilityAnalysis,
        retirementCandidates,
      };
    },
    enabled: !!filters.programId,
  });
}
