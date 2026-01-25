/**
 * Reports View - Enhanced analytics dashboard with charts
 * Module 4A-4: Plan/Cycle Analytics
 * 
 * DATA SOURCE: useCycleExecutionItems (shared hook)
 * Derives stats from tm_cycle_scope (source of truth)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { BarChart3 } from 'lucide-react';
import { useCycleExecutionItems } from '@/hooks/test-cycles/useCycleExecutionItems';
import { QualityTrendChart, DefectTrendChart, TesterPerformanceTable, VelocityChart } from './analytics';

interface CycleReportsViewProps {
  cycleId: string;
}

export function CycleReportsView({ cycleId }: CycleReportsViewProps) {
  // Use shared execution hook - single source of truth
  const { summary, isLoading } = useCycleExecutionItems(cycleId);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="pt-6 h-24 animate-pulse bg-muted" /></Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate derived metrics
  const executed = summary.passed + summary.failed + summary.blocked + summary.skipped;
  const executionRate = summary.total > 0 ? Math.round((executed / summary.total) * 100) : 0;
  const passRateDisplay = summary.passRate !== null ? summary.passRate : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pass Rate</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.teal }}>
              {summary.passRate !== null ? `${summary.passRate}%` : '-%'}
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ width: `${passRateDisplay}%`, backgroundColor: CATALYST_V5.teal }} 
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Execution Rate</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.primary }}>{executionRate}%</p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ width: `${executionRate}%`, backgroundColor: CATALYST_V5.primary }} 
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Failed Tests</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.danger }}>{summary.failed}</p>
            <p className="text-xs text-muted-foreground mt-1">Defects to investigate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Blocked</p>
            <p className="text-3xl font-bold" style={{ color: CATALYST_V5.warning }}>{summary.blocked}</p>
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
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Executed</p>
              <p className="text-2xl font-bold">{executed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">{summary.notRun + summary.inProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
