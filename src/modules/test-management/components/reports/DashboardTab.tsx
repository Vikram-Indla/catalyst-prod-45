/**
 * Dashboard Tab - Executive Summary
 * Top metrics, charts, and recent activity
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  Bug,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Mock data for demonstration
const EXECUTION_TREND_DATA = [
  { date: 'Jan 1', executed: 12, passed: 10 },
  { date: 'Jan 5', executed: 25, passed: 21 },
  { date: 'Jan 10', executed: 45, passed: 38 },
  { date: 'Jan 15', executed: 78, passed: 65 },
  { date: 'Jan 20', executed: 112, passed: 92 },
  { date: 'Jan 25', executed: 138, passed: 112 },
  { date: 'Jan 31', executed: 156, passed: 124 },
];

const STATUS_DISTRIBUTION = [
  { name: 'Passed', value: 124, color: 'hsl(var(--success))' },
  { name: 'Failed', value: 18, color: 'hsl(var(--danger))' },
  { name: 'Blocked', value: 8, color: 'hsl(var(--warning))' },
  { name: 'Not Run', value: 6, color: 'hsl(var(--muted))' },
];

const DEFECTS_BY_SEVERITY = [
  { severity: 'Critical', count: 8, color: 'hsl(var(--danger))' },
  { severity: 'Major', count: 15, color: 'hsl(var(--warning))' },
  { severity: 'Minor', count: 6, color: 'hsl(200, 80%, 50%)' },
  { severity: 'Trivial', count: 3, color: 'hsl(var(--muted))' },
];

const CYCLE_PROGRESS = [
  { cycle: 'CY-015', progress: 72, total: 45 },
  { cycle: 'CY-014', progress: 100, total: 38 },
  { cycle: 'CY-013', progress: 89, total: 52 },
  { cycle: 'CY-012', progress: 100, total: 21 },
];

const RECENT_ACTIVITY = [
  { 
    type: 'failed', 
    message: 'TC-045 failed in CY-015', 
    user: 'Ahmed', 
    time: '10 minutes ago',
    icon: XCircle,
    color: 'text-danger'
  },
  { 
    type: 'passed', 
    message: 'TC-032 passed in CY-015', 
    user: 'Fatima', 
    time: '25 minutes ago',
    icon: CheckCircle,
    color: 'text-success'
  },
  { 
    type: 'defect', 
    message: 'DEF-089 created: Login issue', 
    user: 'Ahmed', 
    time: '1 hour ago',
    icon: Bug,
    color: 'text-danger'
  },
  { 
    type: 'started', 
    message: 'CY-015 started', 
    user: 'System', 
    time: '2 hours ago',
    icon: PlayCircle,
    color: 'text-info'
  },
  { 
    type: 'passed', 
    message: 'TC-018 passed in CY-015', 
    user: 'Mohammed', 
    time: '2 hours ago',
    icon: CheckCircle,
    color: 'text-success'
  },
];

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  trendColor?: 'success' | 'danger' | 'muted';
  icon?: React.ElementType;
  iconColor?: string;
}

function MetricCard({ title, value, subtitle, trend, trendColor = 'muted', icon: Icon, iconColor }: MetricCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  
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
          {Icon && (
            <div className={cn('p-2 rounded-lg', iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-sm', `text-${trendColor}`)}>
            <TrendIcon className="h-4 w-4" />
            <span>{trend.direction === 'up' ? '+' : trend.direction === 'down' ? '' : ''}{trend.value}%</span>
            <span className="text-muted-foreground">vs previous</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardTab() {
  const totalTests = 156;
  const passed = 124;
  const failed = 18;
  const blocked = 8;
  const notRun = 6;
  const passRate = ((passed / totalTests) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          title="Total Tests"
          value={totalTests}
          trend={{ value: 12, direction: 'up' }}
          trendColor="success"
        />
        <MetricCard
          title="Passed"
          value={passed}
          subtitle={`✓ ${passRate}%`}
          trend={{ value: 5, direction: 'up' }}
          trendColor="success"
        />
        <MetricCard
          title="Failed"
          value={failed}
          subtitle="✗ 11.5%"
          trend={{ value: 3, direction: 'down' }}
          trendColor="success"
        />
        <MetricCard
          title="Blocked"
          value={blocked}
          subtitle="⊘ 5.1%"
          trend={{ value: 0, direction: 'neutral' }}
          trendColor="muted"
        />
        <MetricCard
          title="Not Run"
          value={notRun}
          subtitle="○ 3.8%"
          trend={{ value: 8, direction: 'down' }}
          trendColor="success"
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
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={EXECUTION_TREND_DATA}>
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
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={STATUS_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {STATUS_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {STATUS_DISTRIBUTION.map((item) => (
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
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEFECTS_BY_SEVERITY} layout="vertical">
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
                    {DEFECTS_BY_SEVERITY.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cycle Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cycle Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {CYCLE_PROGRESS.map((cycle) => (
                <div key={cycle.cycle} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cycle.cycle}</span>
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
          </CardContent>
        </Card>
      </div>

      {/* Row 4 - Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <Icon className={cn('h-5 w-5', activity.color)} />
                  <span className="flex-1 text-sm">{activity.message}</span>
                  <span className="text-sm text-muted-foreground">{activity.user}</span>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
