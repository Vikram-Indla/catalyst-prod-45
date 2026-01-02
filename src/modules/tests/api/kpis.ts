/**
 * Test KPIs API
 * Analytics and metrics for test management
 */

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TestKPIs {
  totalTestCases: number;
  totalExecutions: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number;
  failRate: number;
  executionRate: number;
  activeCycles: number;
  completedCycles: number;
  avgCycleProgress: number;
  coverageByFeature: FeatureCoverage[];
  trendData: TrendDataPoint[];
}

export interface FeatureCoverage {
  featureId: string;
  featureName: string;
  totalCases: number;
  executedCases: number;
  passedCases: number;
  coverage: number;
}

export interface TrendDataPoint {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
  passRate: number;
}

export interface KPIFilters {
  dateFrom?: string;
  dateTo?: string;
  cycleIds?: string[];
  environment?: string;
}

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get comprehensive test KPIs for a project
 */
export async function getTestKPIs(
  projectId: string,
  filters: KPIFilters = {}
): Promise<TestKPIs> {
  if (!projectId) throw new Error('Project ID is required');

  // Get total test cases
  const { count: totalTestCases } = await supabase
    .from('test_cases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('deleted_at', null);

  // Get cycles with executions
  let cyclesQuery = supabase
    .from('test_cycles')
    .select(`
      id, name, status,
      test_cycle_executions(id, status, executed_at)
    `)
    .eq('project_id', projectId)
    .eq('archived', false);

  if (filters.cycleIds?.length) {
    cyclesQuery = cyclesQuery.in('id', filters.cycleIds);
  }
  if (filters.environment) {
    cyclesQuery = cyclesQuery.eq('environment', filters.environment);
  }

  const { data: cycles } = await cyclesQuery;

  // Aggregate execution stats
  let passed = 0, failed = 0, blocked = 0, notRun = 0;
  let activeCycles = 0, completedCycles = 0;
  const cycleProgresses: number[] = [];

  cycles?.forEach((cycle: any) => {
    const execs = cycle.test_cycle_executions || [];
    
    // Filter by date if specified
    const filteredExecs = execs.filter((e: any) => {
      if (filters.dateFrom && e.executed_at && e.executed_at < filters.dateFrom) return false;
      if (filters.dateTo && e.executed_at && e.executed_at > filters.dateTo) return false;
      return true;
    });

    filteredExecs.forEach((e: any) => {
      switch (e.status) {
        case 'passed': passed++; break;
        case 'failed': failed++; break;
        case 'blocked': blocked++; break;
        default: notRun++; break;
      }
    });

    if (cycle.status === 'active' || cycle.status === 'in_progress') {
      activeCycles++;
    } else if (cycle.status === 'completed') {
      completedCycles++;
    }

    // Calculate cycle progress
    const total = execs.length;
    const executed = execs.filter((e: any) => e.status !== 'not_run').length;
    if (total > 0) {
      cycleProgresses.push(Math.round((executed / total) * 100));
    }
  });

  const totalExecutions = passed + failed + blocked + notRun;
  const executedTotal = passed + failed + blocked;
  const passRate = executedTotal > 0 ? Math.round((passed / executedTotal) * 100) : 0;
  const failRate = executedTotal > 0 ? Math.round((failed / executedTotal) * 100) : 0;
  const executionRate = totalExecutions > 0 ? Math.round((executedTotal / totalExecutions) * 100) : 0;
  const avgCycleProgress = cycleProgresses.length > 0 
    ? Math.round(cycleProgresses.reduce((a, b) => a + b, 0) / cycleProgresses.length)
    : 0;

  // Get coverage by feature
  const coverageByFeature = await getFeatureCoverage(projectId);

  // Get trend data (last 30 days)
  const trendData = await getTrendData(projectId, 30);

  return {
    totalTestCases: totalTestCases || 0,
    totalExecutions,
    passed,
    failed,
    blocked,
    notRun,
    passRate,
    failRate,
    executionRate,
    activeCycles,
    completedCycles,
    avgCycleProgress,
    coverageByFeature,
    trendData,
  };
}

/**
 * Get test coverage by feature
 */
async function getFeatureCoverage(projectId: string): Promise<FeatureCoverage[]> {
  const { data: features } = await supabase
    .from('features')
    .select('id, display_id, name')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  if (!features?.length) return [];

  const coverage: FeatureCoverage[] = [];

  for (const feature of features) {
    // Get test cases linked to this feature
    const { data: links } = await supabase
      .from('test_case_work_items')
      .select(`
        test_case_id,
        test_case:test_cases(
          id,
          project_id
        )
      `)
      .eq('work_item_id', feature.id)
      .eq('work_item_type', 'feature');

    const testCaseIds = links
      ?.filter((l: any) => l.test_case?.project_id === projectId)
      .map((l: any) => l.test_case_id) || [];

    if (!testCaseIds.length) continue;

    // Get execution stats for these test cases
    const { data: executions } = await supabase
      .from('test_cycle_executions')
      .select('status')
      .in('case_id', testCaseIds);

    const executed = executions?.filter((e: any) => e.status !== 'not_run').length || 0;
    const passedCases = executions?.filter((e: any) => e.status === 'passed').length || 0;

    coverage.push({
      featureId: feature.id,
      featureName: feature.name || feature.display_id,
      totalCases: testCaseIds.length,
      executedCases: executed,
      passedCases,
      coverage: testCaseIds.length > 0 ? Math.round((passedCases / testCaseIds.length) * 100) : 0,
    });
  }

  return coverage.sort((a, b) => b.totalCases - a.totalCases);
}

/**
 * Get trend data for the last N days
 */
async function getTrendData(projectId: string, days: number): Promise<TrendDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: executions } = await supabase
    .from('test_cycle_executions')
    .select(`
      status,
      executed_at,
      test_cycle:test_cycles(project_id)
    `)
    .not('executed_at', 'is', null)
    .gte('executed_at', startDate.toISOString())
    .order('executed_at', { ascending: true });

  // Filter by project
  const projectExecs = executions?.filter((e: any) => e.test_cycle?.project_id === projectId) || [];

  // Group by date
  const dateMap = new Map<string, { passed: number; failed: number; blocked: number }>();

  projectExecs.forEach((exec: any) => {
    const date = exec.executed_at.split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { passed: 0, failed: 0, blocked: 0 });
    }
    const stats = dateMap.get(date)!;
    switch (exec.status) {
      case 'passed': stats.passed++; break;
      case 'failed': stats.failed++; break;
      case 'blocked': stats.blocked++; break;
    }
  });

  // Convert to array
  const trend: TrendDataPoint[] = [];
  dateMap.forEach((stats, date) => {
    const total = stats.passed + stats.failed + stats.blocked;
    trend.push({
      date,
      ...stats,
      total,
      passRate: total > 0 ? Math.round((stats.passed / total) * 100) : 0,
    });
  });

  return trend.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get quick summary stats for dashboard cards
 */
export async function getQuickStats(projectId: string) {
  const kpis = await getTestKPIs(projectId);
  
  return {
    totalCases: kpis.totalTestCases,
    passRate: kpis.passRate,
    failed: kpis.failed,
    blocked: kpis.blocked,
    notRun: kpis.notRun,
    activeCycles: kpis.activeCycles,
  };
}
