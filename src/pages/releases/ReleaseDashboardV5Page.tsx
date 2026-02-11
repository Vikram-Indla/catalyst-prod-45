/**
 * Release Dashboard V5 Page
 * Route: /releases/:releaseId
 */

import { useParams } from 'react-router-dom';
import {
  DashboardHeader,
  MetricsGrid,
  AISummaryCard,
  DefectSummaryCard,
  TestCyclesTable,
  ExecutionTrendChart,
  TeamContributionList,
  ActivityFeed,
  mockDashboardData,
} from '@/features/release-dashboard';

export default function ReleaseDashboardV5Page() {
  const { releaseId } = useParams();
  const data = mockDashboardData; // Use mock data for now

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-5 py-4 space-y-4">
        {/* Header with Health Gauge and Quality Gates */}
        <DashboardHeader
          release={data.release}
          healthScore={data.healthScore}
          qualityGates={data.qualityGates}
          metrics={data.metrics}
        />

        {/* Metrics Grid */}
        <MetricsGrid metrics={data.metrics} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          <AISummaryCard insights={data.aiInsights} releaseData={{
            name: data.release.name,
            version: data.release.version,
            status: data.release.status,
            target_date: data.release.targetDate,
            daysRemaining: data.release.daysRemaining,
            healthScore: data.healthScore.score,
            healthLevel: data.healthScore.level,
            qualityGates: data.qualityGates.map(g => ({ name: g.name, status: g.status, current: g.currentValue, threshold: g.threshold })),
            metrics: data.metrics,
            defectSummary: data.defectSummary,
          }} />
          <DefectSummaryCard defects={data.defectSummary} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TestCyclesTable cycles={data.testCycles} />
          <ExecutionTrendChart data={data.executionTrend} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TeamContributionList team={data.teamContribution} />
          <ActivityFeed activities={data.activityFeed} />
        </div>
      </div>
    </div>
  );
}
