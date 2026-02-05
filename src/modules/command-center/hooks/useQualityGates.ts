/**
 * Hook: useQualityGates
 * Fetches quality gate status and thresholds
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QualityGate, GateStatus } from '../types';
import { subDays } from 'date-fns';

// Default quality gate thresholds
const DEFAULT_GATES = [
  { id: 'pass_rate', name: 'Pass Rate', threshold: '≥ 85%', numericThreshold: 85 },
  { id: 'critical_defects', name: 'Critical Defects', threshold: '= 0', numericThreshold: 0 },
  { id: 'code_coverage', name: 'Code Coverage', threshold: '≥ 80%', numericThreshold: 80 },
  { id: 'blocked_tests', name: 'Blocked Tests', threshold: '≤ 10', numericThreshold: 10 },
  { id: 'test_execution', name: 'Test Execution', threshold: '≥ 90%', numericThreshold: 90 },
];

function determineStatus(gateId: string, value: number, threshold: number): GateStatus {
  switch (gateId) {
    case 'pass_rate':
    case 'code_coverage':
    case 'test_execution':
      if (value >= threshold) return 'passed';
      if (value >= threshold - 5) return 'warning';
      return 'failed';
    case 'critical_defects':
      if (value === 0) return 'passed';
      return 'failed';
    case 'blocked_tests':
      if (value <= threshold) return 'passed';
      if (value <= threshold + 5) return 'warning';
      return 'failed';
    default:
      return 'passed';
  }
}

export function useQualityGates(releaseId?: string) {
  return useQuery({
    queryKey: ['command-center-quality-gates', releaseId],
    queryFn: async (): Promise<QualityGate[]> => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Calculate pass rate
      const { data: runs } = await supabase
        .from('tm_test_runs')
        .select('status')
        .gte('executed_at', thirtyDaysAgo);

      const totalRuns = runs?.length || 0;
      const passedRuns = runs?.filter(r => r.status === 'passed').length || 0;
      const blockedRuns = runs?.filter(r => r.status === 'blocked').length || 0;
      const executedRuns = runs?.filter(r => r.status && r.status !== 'not_run').length || 0;
      
      const passRate = totalRuns > 0 ? (passedRuns / executedRuns) * 100 : 0;
      const executionRate = totalRuns > 0 ? (executedRuns / totalRuns) * 100 : 0;

      // Get critical defects
      const { count: criticalDefects } = await supabase
        .from('tm_defects')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .not('status', 'in', '("closed","resolved")');

      // Build quality gates with real values
      const gates: QualityGate[] = [
        {
          id: 'pass_rate',
          name: 'Pass Rate',
          threshold: '≥ 85%',
          currentValue: `${passRate.toFixed(1)}%`,
          numericValue: passRate,
          numericThreshold: 85,
          status: determineStatus('pass_rate', passRate, 85),
        },
        {
          id: 'critical_defects',
          name: 'Critical Defects',
          threshold: '= 0',
          currentValue: (criticalDefects || 0).toString(),
          numericValue: criticalDefects || 0,
          numericThreshold: 0,
          status: determineStatus('critical_defects', criticalDefects || 0, 0),
        },
        {
          id: 'code_coverage',
          name: 'Code Coverage',
          threshold: '≥ 80%',
          currentValue: 'N/A', // Requires external CI/CD integration
          numericValue: 0,
          numericThreshold: 80,
          status: 'warning' as GateStatus, // Shows as warning until integrated
        },
        {
          id: 'blocked_tests',
          name: 'Blocked Tests',
          threshold: '≤ 10',
          currentValue: blockedRuns.toString(),
          numericValue: blockedRuns,
          numericThreshold: 10,
          status: determineStatus('blocked_tests', blockedRuns, 10),
        },
        {
          id: 'test_execution',
          name: 'Test Execution',
          threshold: '≥ 90%',
          currentValue: `${executionRate.toFixed(0)}%`,
          numericValue: executionRate,
          numericThreshold: 90,
          status: determineStatus('test_execution', executionRate, 90),
        },
      ];

      return gates;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
