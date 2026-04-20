// =====================================================
// RELEASE TEST SUMMARY PANEL
// Shows aggregated test metrics from all cycles
// =====================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import {
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Bug, 
  TestTube2,
  TrendingUp
} from 'lucide-react';
import { useReleaseTestSummary } from '@/lib/shared-quality/hooks/useQualityGates';

const CYCLE_STATUS_APPEARANCE: Record<string, LozengeAppearance> = {
  completed: 'success',
  in_progress: 'inprogress',
  planned: 'default',
};

interface ReleaseTestSummaryPanelProps {
  releaseId: string;
}

export function ReleaseTestSummaryPanel({ releaseId }: ReleaseTestSummaryPanelProps) {
  const { data: summary, isLoading } = useReleaseTestSummary(releaseId);

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <TestTube2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No test data available</p>
        </CardContent>
      </Card>
    );
  }

  const { totals, defects, cycles } = summary;

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{totals.pass_pct}%</div>
                <div className="text-sm text-muted-foreground">Pass Rate</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totals.execution_pct}%</div>
                <div className="text-sm text-muted-foreground">Executed</div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{defects.blockers}</div>
                <div className="text-sm text-muted-foreground">Blockers</div>
              </div>
              <Bug className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{defects.open}</div>
                <div className="text-sm text-muted-foreground">Open Defects</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Case Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Execution Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{totals.total_cases} Total Test Cases</span>
                <span>{totals.passed + totals.failed + totals.blocked} Executed</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${(totals.passed / totals.total_cases) * 100}%` }}
                />
                <div 
                  className="bg-red-500 h-full" 
                  style={{ width: `${(totals.failed / totals.total_cases) * 100}%` }}
                />
                <div 
                  className="bg-orange-500 h-full" 
                  style={{ width: `${(totals.blocked / totals.total_cases) * 100}%` }}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Passed: {totals.passed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>Failed: {totals.failed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span>Blocked: {totals.blocked}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                <span>Not Run: {totals.not_run}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycles Breakdown */}
      {cycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cycles.map((cycle) => (
                <div 
                  key={cycle.cycle_id}
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{cycle.cycle_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {cycle.total_cases} cases · {cycle.execution_pct}% executed
                    </div>
                  </div>
                  <Lozenge appearance={CYCLE_STATUS_APPEARANCE[cycle.status] ?? 'default'}>
                    {cycle.status}
                  </Lozenge>
                  <div className="text-right">
                    <div className="font-medium text-green-600">{cycle.pass_pct}%</div>
                    <div className="text-xs text-muted-foreground">pass rate</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
