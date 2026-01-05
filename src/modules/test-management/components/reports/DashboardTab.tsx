/**
 * Dashboard Tab - Executive Summary
 * Top metrics, charts, and recent activity
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Minus,
  Bug,
  PlayCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ReportSummary, ExecutionTrend, TesterPerformance } from '@/types/test-management';

interface DashboardTabProps {
  summary?: ReportSummary;
  summaryLoading: boolean;
  trendData: ExecutionTrend[];
  trendLoading: boolean;
  cycleProgress: Array<{ id: string; key: string; name: string; status: string; total: number; executed: number; progress: number }>;
  progressLoading: boolean;
  recentActivity: Array<{ type: 'run' | 'defect' | 'cycle'; timestamp: string; data: any }>;
  activityLoading: boolean;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  trendColor?: 'success' | 'danger' | 'muted';
  isLoading?: boolean;
}

function MetricCard({ title, value, subtitle, trend, trendColor = 'muted', isLoading }: MetricCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className={cn('text-sm mt-1', `text-${trendColor}`)}>{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-sm', `text-${trendColor}`)}>
            <TrendIcon className="h-4 w-4" />
            <span>{trend.direction === 'up' ? '+' : ''}{trend.value}%</span>
            <span className="text-muted-foreground">vs previous</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardTab({ 
  summary, 
  summaryLoading, 
  trendData, 
  trendLoading, 
  cycleProgress, 
  progressLoading,
  recentActivity,
  activityLoading 
}: DashboardTabProps) {
  const totalTests = summary?.total_runs || 0;
  const passed = summary?.passed_count || 0;
  const failed = summary?.failed_count || 0;
  const blocked = summary?.blocked_count || 0;
  const notRun = summary?.not_run_count || 0;
  const passRate = summary?.pass_rate || 0;

  // Status distribution for pie chart
  const statusDistribution = [
    { name: 'Passed', value: passed, color: 'hsl(var(--success))' },
    { name: 'Failed', value: failed, color: 'hsl(var(--danger))' },
    { name: 'Blocked', value: blocked, color: 'hsl(var(--warning))' },
    { name: 'Not Run', value: notRun, color: 'hsl(var(--muted))' },
  ].filter(s => s.value > 0);

  // Defects by severity for bar chart
  const defectsBySeverity = summary ? [
    { severity: 'Critical', count: summary.defects_by_severity?.CRITICAL || 0, color: 'hsl(var(--danger))' },
    { severity: 'Major', count: summary.defects_by_severity?.MAJOR || 0, color: 'hsl(var(--warning))' },
    { severity: 'Minor', count: summary.defects_by_severity?.MINOR || 0, color: 'hsl(200, 80%, 50%)' },
    { severity: 'Trivial', count: summary.defects_by_severity?.TRIVIAL || 0, color: 'hsl(var(--muted))' },
  ] : [];

  // Format trend data for chart
  const chartTrendData = trendData.map(t => ({
    date: t.date,
    executed: t.total,
    passed: t.passed,
    failed: t.failed,
  }));

  // Get activity icon and color
  const getActivityConfig = (activity: { type: string; data: any }) => {
    if (activity.type === 'run') {
      const status = activity.data?.status?.toLowerCase();
      if (status === 'passed') return { icon: CheckCircle, color: 'text-success', message: `${activity.data?.test_case?.key || 'Test'} passed` };
      if (status === 'failed') return { icon: XCircle, color: 'text-danger', message: `${activity.data?.test_case?.key || 'Test'} failed` };
      return { icon: Clock, color: 'text-info', message: `${activity.data?.test_case?.key || 'Test'} executed` };
    }
    if (activity.type === 'defect') {
      return { icon: Bug, color: 'text-danger', message: `${activity.data?.key || 'Defect'} created: ${activity.data?.title || ''}` };
    }
    if (activity.type === 'cycle') {
      return { icon: PlayCircle, color: 'text-info', message: `${activity.data?.key || 'Cycle'} ${activity.data?.status?.toLowerCase() || 'updated'}` };
    }
    return { icon: Clock, color: 'text-muted-foreground', message: 'Activity' };
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          title="Total Tests"
          value={totalTests}
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Passed"
          value={passed}
          subtitle={`✓ ${passRate}%`}
          trendColor="success"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Failed"
          value={failed}
          subtitle={totalTests > 0 ? `✗ ${((failed / totalTests) * 100).toFixed(1)}%` : '✗ 0%'}
          trendColor="danger"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Blocked"
          value={blocked}
          subtitle={totalTests > 0 ? `⊘ ${((blocked / totalTests) * 100).toFixed(1)}%` : '⊘ 0%'}
          trendColor="muted"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Not Run"
          value={notRun}
          subtitle={totalTests > 0 ? `○ ${((notRun / totalTests) * 100).toFixed(1)}%` : '○ 0%'}
          trendColor="muted"
          isLoading={summaryLoading}
        />
      </div>

      {/* Row 2 - Two Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Execution Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : chartTrendData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No execution data available
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="executed"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      dot={false}
                      name="Executed"
                    />
                    <Line
                      type="monotone"
                      dataKey="passed"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={false}
                      name="Passed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : statusDistribution.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No execution data available
              </div>
            ) : (
              <div className="h-[280px] flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-semibold ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 - Two Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Defects by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Defects by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : defectsBySeverity.every(d => d.count === 0) ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No defects found
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={defectsBySeverity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="severity" type="category" className="text-xs" width={80} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {defectsBySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cycle Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cycle Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : cycleProgress.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No active cycles
              </div>
            ) : (
              <div className="space-y-4">
                {cycleProgress.map((cycle) => (
                  <div key={cycle.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cycle.key}</span>
                      <span className="text-muted-foreground">{cycle.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          cycle.progress === 100 ? 'bg-success' : 'bg-primary'
                        )}
                        style={{ width: `${cycle.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 - Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const config = getActivityConfig(activity);
                const Icon = config.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    <Icon className={cn('h-5 w-5', config.color)} />
                    <span className="flex-1 text-sm">{config.message}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
