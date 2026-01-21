/**
 * Reports View - Enhanced analytics dashboard with charts
 * Module 4A-4: Plan/Cycle Analytics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { TrendingUp, BarChart3, Bug, Users } from 'lucide-react';
import type { TestCycle, CycleStats } from '@/hooks/test-cycles/useCycleDetails';
import { QualityTrendChart, DefectTrendChart, TesterPerformanceTable, VelocityChart } from './analytics';

interface CycleReportsViewProps {
  cycleId: string;
  cycle: TestCycle | undefined;
  stats: CycleStats | undefined;
  isLoading: boolean;
}

export function CycleReportsView({ cycleId, cycle, stats, isLoading }: CycleReportsViewProps) {
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pass Rate</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.teal }}>{stats.passRate}%</p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${stats.passRate}%`, backgroundColor: CATALYST_V5.teal }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Execution Rate</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.primary }}>{stats.executionRate}%</p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${stats.executionRate}%`, backgroundColor: CATALYST_V5.primary }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Failed Tests</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.danger }}>{stats.failed}</p>
            <p className="text-xs text-muted-foreground mt-1">Defects to investigate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Blocked</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.warning }}>{stats.blocked}</p>
            <p className="text-xs text-muted-foreground mt-1">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Quality Trends + Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualityTrendChart cycleId={cycleId} />
        <VelocityChart cycleId={cycleId} />
      </div>

      {/* Charts Row 2: Defect Trends + Tester Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DefectTrendChart cycleId={cycleId} />
        <TesterPerformanceTable cycleId={cycleId} />
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Cycle Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Executed</p>
              <p className="text-2xl font-bold">{stats.passed + stats.failed + stats.blocked}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">{stats.notStarted + stats.inProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
