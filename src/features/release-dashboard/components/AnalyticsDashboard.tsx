/**
 * Module 5C-1: Release Analytics Dashboard
 * Comprehensive analytics view for a release
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lozenge } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Bug,
  BarChart3,
  PieChart,
  Clock,
  Target,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  useReleaseAnalyticsSummary,
  useAnalyticsTrend,
  useDefectAging,
  useCoverageBreakdown,
} from '../hooks/useAnalytics';
import { CATALYST_COLORS } from '../types';

interface AnalyticsDashboardProps {
  releaseId: string;
  releaseName?: string;
  onExport?: () => void;
}

const STATUS_COLORS = {
  passed: CATALYST_COLORS.teal,
  failed: CATALYST_COLORS.danger,
  blocked: CATALYST_COLORS.warning,
  skipped: CATALYST_COLORS.gray[400],
  not_run: CATALYST_COLORS.gray[300],
};

export function AnalyticsDashboard({ releaseId, releaseName, onExport }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: summary, isLoading: summaryLoading, refetch } = useReleaseAnalyticsSummary(releaseId);
  const { data: trendData, isLoading: trendLoading } = useAnalyticsTrend(releaseId, 30);
  const { data: agingData } = useDefectAging(releaseId);
  const { data: coverageData } = useCoverageBreakdown(releaseId);

  if (summaryLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No analytics data available for this release.
        </CardContent>
      </Card>
    );
  }

  const statusDistribution = [
    { name: 'Passed', value: summary.keyMetrics.passedCount, color: STATUS_COLORS.passed },
    { name: 'Failed', value: summary.keyMetrics.failedCount, color: STATUS_COLORS.failed },
    { name: 'Blocked', value: summary.keyMetrics.blockedCount, color: STATUS_COLORS.blocked },
    { name: 'Skipped', value: summary.keyMetrics.skippedCount, color: STATUS_COLORS.skipped },
    { name: 'Not Run', value: summary.keyMetrics.totalTestCases - summary.keyMetrics.executedCount, color: STATUS_COLORS.not_run },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {releaseName || summary.releaseName} Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date(summary.period.start).toLocaleDateString()} - {new Date(summary.period.end).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Execution Rate"
          value={`${summary.keyMetrics.executionRate}%`}
          subtitle={`${summary.keyMetrics.executedCount} of ${summary.keyMetrics.totalTestCases} tests`}
          icon={<Activity className="h-5 w-5" />}
          color="primary"
        />
        <MetricCard
          title="Pass Rate"
          value={`${summary.keyMetrics.passRate}%`}
          subtitle={`${summary.keyMetrics.passedCount} passed`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="success"
          trend={summary.keyMetrics.passRate >= 80 ? 'up' : 'down'}
        />
        <MetricCard
          title="Open Defects"
          value={summary.defectMetrics.totalOpen.toString()}
          subtitle={`${summary.defectMetrics.blockers} blockers`}
          icon={<Bug className="h-5 w-5" />}
          color={summary.defectMetrics.blockers > 0 ? 'danger' : 'warning'}
        />
        <MetricCard
          title="Quality Gates"
          value={`${summary.qualityGateMetrics.passedGates}/${summary.qualityGateMetrics.totalGates}`}
          subtitle={`${summary.qualityGateMetrics.blockingPassed}/${summary.qualityGateMetrics.blockingTotal} blocking`}
          icon={<Target className="h-5 w-5" />}
          color={summary.qualityGateMetrics.blockingPassed === summary.qualityGateMetrics.blockingTotal ? 'success' : 'warning'}
        />
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="defects">Defects</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Execution Trend (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dateLabel" fontSize={11} className="fill-muted-foreground" />
                      <YAxis fontSize={11} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="passed"
                        stackId="1"
                        stroke={STATUS_COLORS.passed}
                        fill={STATUS_COLORS.passed}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        stackId="1"
                        stroke={STATUS_COLORS.failed}
                        fill={STATUS_COLORS.failed}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="blocked"
                        stackId="1"
                        stroke={STATUS_COLORS.blocked}
                        fill={STATUS_COLORS.blocked}
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Test Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Defect Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Defect Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <div className="text-2xl font-bold text-destructive">{summary.defectMetrics.blockers}</div>
                  <div className="text-xs text-muted-foreground">Blockers</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-500/10">
                  <div className="text-2xl font-bold text-orange-500">{summary.defectMetrics.criticals}</div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{summary.defectMetrics.totalOpen}</div>
                  <div className="text-xs text-muted-foreground">Open</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{summary.defectMetrics.totalClosed}</div>
                  <div className="text-xs text-muted-foreground">Closed</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{summary.defectMetrics.avgResolutionDays}</div>
                  <div className="text-xs text-muted-foreground">Avg Resolution (days)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cumulative Execution Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dateLabel" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="cumulativeExecuted"
                    stroke={CATALYST_COLORS.primary}
                    fill={CATALYST_COLORS.primary}
                    fillOpacity={0.3}
                    name="Executed"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativePassed"
                    stroke={CATALYST_COLORS.teal}
                    fill={CATALYST_COLORS.teal}
                    fillOpacity={0.3}
                    name="Passed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defects" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Defect Aging Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agingData || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="ageGroup" type="category" width={100} fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="blocker" stackId="a" fill={CATALYST_COLORS.danger} name="Blocker" />
                  <Bar dataKey="critical" stackId="a" fill="#f97316" name="Critical" />
                  <Bar dataKey="major" stackId="a" fill={CATALYST_COLORS.warning} name="Major" />
                  <Bar dataKey="minor" stackId="a" fill={CATALYST_COLORS.gray[400]} name="Minor" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Coverage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {coverageData?.length ? (
                <div className="space-y-4">
                  {coverageData.map((item) => (
                    <div key={item.categoryId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">
                          {item.executed}/{item.totalCases} executed ({item.coveragePercent}%)
                        </span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                        <div
                          className="bg-teal-500 transition-all"
                          style={{ width: `${(item.passed / item.totalCases) * 100}%` }}
                        />
                        <div
                          className="bg-destructive transition-all"
                          style={{ width: `${(item.failed / item.totalCases) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No coverage data available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger';
  trend?: 'up' | 'down';
}

function MetricCard({ title, value, subtitle, icon, color, trend }: MetricCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-teal-600 bg-teal-500/10',
    warning: 'text-amber-600 bg-amber-500/10',
    danger: 'text-destructive bg-destructive/10',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend && (
            <Lozenge appearance={trend === 'up' ? 'success' : 'removed'}>
              {trend === 'up' ? 'Good' : 'Low'}
            </Lozenge>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-[350px]" />
    </div>
  );
}
