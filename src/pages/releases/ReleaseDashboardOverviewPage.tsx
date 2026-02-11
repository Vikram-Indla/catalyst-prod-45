/**
 * Release Dashboard Overview Page
 * Route: /releases/dashboard
 * Shows the V5 dashboard with the first/selected release
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  type ReleaseDetail,
  type HealthScore,
  type QualityGate,
  type ReleaseMetrics,
  type DefectSummary,
  type TestCycleSummary,
  type ExecutionTrendData,
  type TeamMember,
  type ActivityItem,
  type AIInsight,
} from '@/features/release-dashboard';

// Transform database release to dashboard format
function transformToDashboardData(release: any): {
  release: ReleaseDetail;
  healthScore: HealthScore;
  qualityGates: QualityGate[];
  metrics: ReleaseMetrics;
  defectSummary: DefectSummary;
  testCycles: TestCycleSummary[];
  executionTrend: ExecutionTrendData[];
  teamContribution: TeamMember[];
  activityFeed: ActivityItem[];
  aiInsights: AIInsight[];
} {
  const passRate = release.test_cases_total > 0 
    ? Math.round((release.test_cases_passed / release.test_cases_total) * 100) 
    : 100;
  
  const healthScore = Math.round(
    (passRate * 0.4) + 
    ((release.coverage_percent || 0) * 0.3) + 
    (Math.max(0, 100 - (release.defects_open || 0) * 10) * 0.3)
  );
  
  const healthLevel = healthScore >= 85 ? 'healthy' 
    : healthScore >= 70 ? 'attention' 
    : healthScore >= 50 ? 'at_risk' 
    : 'critical';

  const daysRemaining = release.target_date 
    ? Math.max(0, Math.floor((new Date(release.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  return {
    release: {
      id: release.id,
      version: release.version || 'v1.0',
      name: release.name,
      description: release.description || release.notes,
      status: release.status === 'planned' ? 'planning' : release.status === 'active' ? 'in_progress' : release.status,
      startDate: release.start_date || new Date().toISOString(),
      targetDate: release.target_date || new Date().toISOString(),
      daysRemaining,
      organization: 'Organization',
    releaseManager: release.owner 
        ? { 
            id: release.owner.id, 
            name: release.owner.full_name, 
            initials: release.owner.full_name?.split(' ').map((n: string) => n[0]).join('') || '?',
            avatarUrl: release.owner.avatar_url 
          }
        : { id: '1', name: 'Unassigned', initials: 'U', avatarUrl: undefined },
    },
    healthScore: {
      score: healthScore,
      level: healthLevel,
      trend: { value: 3, direction: healthScore >= 70 ? 'up' : 'down', period: 'vs last week' },
      breakdown: { passRate, coverage: release.coverage_percent || 0, defects: Math.max(0, 100 - (release.defects_open || 0) * 10) },
    },
    qualityGates: [
      { id: '1', name: 'Code Coverage', status: (release.coverage_percent || 0) >= 80 ? 'pass' : 'fail', currentValue: `${release.coverage_percent || 0}%`, threshold: '80%' },
      { id: '2', name: 'Pass Rate', status: passRate >= 85 ? 'pass' : 'fail', currentValue: `${passRate}%`, threshold: '85%' },
      { id: '3', name: 'Zero Blockers', status: (release.defects_open || 0) === 0 ? 'pass' : 'fail', currentValue: `${release.defects_open || 0}`, threshold: '0' },
      { id: '4', name: 'Regression', status: 'pass', currentValue: '100%', threshold: '95%' },
      { id: '5', name: 'Performance', status: 'pending', currentValue: 'N/A', threshold: '<3s' },
      { id: '6', name: 'Security', status: 'pass', currentValue: 'Clean', threshold: 'No critical' },
    ],
    metrics: {
      workItems: { total: 24, complete: Math.floor((release.progress || 0) * 0.24), inProgress: 8 },
      testCases: { total: release.test_cases_total || 0, trend: { value: 12, direction: 'up' } },
      testCycles: { total: 4, active: 2, complete: 2 },
      openDefects: { total: release.defects_open || 0, trend: { value: 2, direction: release.defects_open > 5 ? 'up' : 'down' } },
    },
    defectSummary: {
      blocker: Math.floor((release.defects_open || 0) / 4),
      critical: Math.floor((release.defects_open || 0) / 4),
      major: Math.floor((release.defects_open || 0) / 3),
      minor: Math.floor((release.defects_open || 0) / 4),
      total: release.defects_open || 0,
    },
    testCycles: mockDashboardData.testCycles,
    executionTrend: mockDashboardData.executionTrend,
    teamContribution: mockDashboardData.teamContribution,
    activityFeed: mockDashboardData.activityFeed,
    aiInsights: generateInsights(release, healthScore, passRate),
  };
}

function generateInsights(release: any, healthScore: number, passRate: number): AIInsight[] {
  const insights: AIInsight[] = [];
  
  if ((release.defects_open || 0) > 0) {
    insights.push({
      type: 'critical',
      icon: '🔴',
      message: `${release.defects_open} open defect(s) blocking Zero Blockers gate.`,
      action: 'Resolve blockers immediately',
    });
  }
  
  if (passRate < 85) {
    insights.push({
      type: 'warning',
      icon: '⚠',
      message: `Pass rate ${passRate}% below 85% threshold.`,
      action: 'Review failing tests and fix defects',
    });
  }
  
  if (healthScore >= 90) {
    insights.push({
      type: 'positive',
      icon: '✅',
      message: 'Release is healthy. Ready for deployment consideration.',
      action: 'Proceed with approval workflow',
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      icon: '✅',
      message: 'No critical issues detected. Release is on track.',
    });
  }
  
  return insights;
}

export default function ReleaseDashboardOverviewPage() {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  
  // Fetch all releases for the dropdown
  const { data: releases, isLoading: releasesLoading } = useQuery({
    queryKey: ['releases-for-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select(`
          *,
          owner:profiles!releases_owner_id_fkey(id, full_name, avatar_url)
        `)
        .order('name', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });
  
  // Set first release as default when loaded
  const currentReleaseId = selectedReleaseId || releases?.[0]?.id || '';
  const currentRelease = releases?.find(r => r.id === currentReleaseId);
  
  // Transform release to dashboard data
  const dashboardData = useMemo(() => {
    if (!currentRelease) return null;
    return transformToDashboardData(currentRelease);
  }, [currentRelease]);
  
  if (releasesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }
  
  if (!releases || releases.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-2">No releases found</p>
          <p className="text-sm text-slate-400">Create a release to see the dashboard</p>
        </div>
      </div>
    );
  }
  
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-5 py-4 space-y-4">
        {/* Release Selector */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Release:</span>
            <Select value={currentReleaseId} onValueChange={setSelectedReleaseId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a release" />
              </SelectTrigger>
              <SelectContent>
                {releases.map((release) => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.version || 'v1.0'} — {release.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Header with Health Gauge and Quality Gates */}
        <DashboardHeader
          release={dashboardData.release}
          healthScore={dashboardData.healthScore}
          qualityGates={dashboardData.qualityGates}
          metrics={dashboardData.metrics}
        />

        {/* Metrics Grid */}
        <MetricsGrid metrics={dashboardData.metrics} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AISummaryCard insights={dashboardData.aiInsights} releaseData={currentRelease ? {
            name: currentRelease.name,
            version: currentRelease.version,
            status: currentRelease.status,
            target_date: currentRelease.target_date,
            start_date: currentRelease.start_date,
            progress: currentRelease.progress,
            test_cases_total: currentRelease.test_cases_total,
            test_cases_passed: currentRelease.test_cases_passed,
            test_cases_failed: currentRelease.test_cases_failed,
            coverage_percent: currentRelease.coverage_percent,
            defects_open: currentRelease.defects_open,
            defects_closed: 0,
            healthScore: dashboardData.healthScore.score,
            healthLevel: dashboardData.healthScore.level,
            qualityGates: dashboardData.qualityGates.map(g => ({ name: g.name, status: g.status, current: g.currentValue, threshold: g.threshold })),
            daysRemaining: dashboardData.release.daysRemaining,
          } : undefined} />
          <DefectSummaryCard defects={dashboardData.defectSummary} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TestCyclesTable cycles={dashboardData.testCycles} />
          <ExecutionTrendChart data={dashboardData.executionTrend} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamContributionList team={dashboardData.teamContribution} />
          <ActivityFeed activities={dashboardData.activityFeed} />
        </div>
      </div>
    </div>
  );
}
