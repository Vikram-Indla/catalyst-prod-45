/**
 * Test Dashboard Gadgets - Reusable dashboard widgets for test management
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  Activity,
} from 'lucide-react';

interface GadgetProps {
  title: string;
  data?: any;
  isLoading?: boolean;
}

const COLORS = {
  passed: '#10b981',
  failed: '#ef4444',
  blocked: '#f59e0b',
  skipped: '#3b82f6',
  not_executed: '#6b7280',
  brand: '#c69c6d',
};

// 1. Execution Status Pie Chart
export const ExecutionStatusGadget: React.FC<GadgetProps & {
  data?: { passed: number; failed: number; blocked: number; skipped: number; not_executed: number };
}> = ({ title, data, isLoading }) => {
  if (isLoading || !data) {
    return <GadgetSkeleton title={title} />;
  }

  const chartData = [
    { name: 'Passed', value: data.passed, color: COLORS.passed },
    { name: 'Failed', value: data.failed, color: COLORS.failed },
    { name: 'Blocked', value: data.blocked, color: COLORS.blocked },
    { name: 'Skipped', value: data.skipped, color: COLORS.skipped },
    { name: 'Not Executed', value: data.not_executed, color: COLORS.not_executed },
  ].filter(d => d.value > 0);

  const total = Object.values(data).reduce((a, b) => (a as number) + (b as number), 0) as number;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
            <div className="pt-1 border-t border-border text-xs text-muted-foreground">
              Total: {total}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. Pass Rate Gauge
export const PassRateGadget: React.FC<GadgetProps & { passRate?: number }> = ({
  title,
  passRate = 0,
  isLoading,
}) => {
  if (isLoading) {
    return <GadgetSkeleton title={title} />;
  }

  const getColor = (rate: number) => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-bold ${getColor(passRate)}`}>
            {Number(passRate).toFixed(1)}%
          </div>
          <Progress value={passRate} className="mt-3 h-2" />
          <div className="mt-2 text-xs text-muted-foreground">
            {passRate >= 90 ? 'Excellent' : passRate >= 70 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 3. Execution Trend Line Chart
export const ExecutionTrendGadget: React.FC<GadgetProps & {
  data?: Array<{ date: string; passed: number; failed: number; total: number }>;
}> = ({ title, data, isLoading }) => {
  if (isLoading || !data) {
    return <GadgetSkeleton title={title} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="passed" stroke={COLORS.passed} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="failed" stroke={COLORS.failed} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 4. Tester Productivity Bar Chart
export const TesterProductivityGadget: React.FC<GadgetProps & {
  data?: Array<{ name: string; executed: number; passed: number }>;
}> = ({ title, data, isLoading }) => {
  if (isLoading || !data) {
    return <GadgetSkeleton title={title} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-gold" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
            <Tooltip />
            <Bar dataKey="executed" fill={COLORS.brand} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 5. Cycle Progress Card
export const CycleProgressGadget: React.FC<GadgetProps & {
  data?: Array<{ name: string; progress: number; status: string }>;
}> = ({ title, data, isLoading }) => {
  if (isLoading || !data) {
    return <GadgetSkeleton title={title} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 4).map((cycle, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{cycle.name}</span>
                <Badge
                  variant="outline"
                  className={
                    cycle.status === 'active'
                      ? 'border-blue-500 text-blue-600'
                      : cycle.status === 'completed'
                      ? 'border-green-500 text-green-600'
                      : ''
                  }
                >
                  {cycle.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={cycle.progress} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-10">
                  {cycle.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 6. Quick Stats Cards
export const QuickStatsGadget: React.FC<GadgetProps & {
  stats?: { cases: number; sets: number; cycles: number; executions: number };
}> = ({ title, stats, isLoading }) => {
  if (isLoading || !stats) {
    return <GadgetSkeleton title={title} />;
  }

  const items = [
    { label: 'Test Cases', value: stats.cases, icon: FileText },
    { label: 'Test Sets', value: stats.sets, icon: Activity },
    { label: 'Cycles', value: stats.cycles, icon: Clock },
    { label: 'Executions', value: stats.executions, icon: CheckCircle2 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Icon className="h-4 w-4 text-brand-gold" />
                <div>
                  <div className="text-lg font-semibold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// 7. Recent Activity Feed
export const RecentActivityGadget: React.FC<GadgetProps & {
  data?: Array<{ id: string; action: string; user: string; time: string; type: 'pass' | 'fail' | 'create' | 'update' }>;
}> = ({ title, data, isLoading }) => {
  if (isLoading || !data) {
    return <GadgetSkeleton title={title} />;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'pass': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'fail': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'create': return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      default: return <Activity className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              {getIcon(item.type)}
              <div className="flex-1 min-w-0">
                <p className="truncate">{item.action}</p>
                <p className="text-muted-foreground">{item.user} • {item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// 8. Defects Summary
export const DefectsSummaryGadget: React.FC<GadgetProps & {
  data?: { open: number; inProgress: number; resolved: number; total: number };
}> = ({ title, data, isLoading }) => {
  if (isLoading || !data) {
    return <GadgetSkeleton title={title} />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Open</span>
            <Badge variant="destructive">{data.open}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">In Progress</span>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{data.inProgress}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Resolved</span>
            <Badge variant="outline" className="border-green-500 text-green-600">{data.resolved}</Badge>
          </div>
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <span className="text-xs font-medium">Total</span>
            <span className="font-semibold">{data.total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Skeleton loader
const GadgetSkeleton: React.FC<{ title: string }> = ({ title }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-20 bg-muted rounded" />
      </div>
    </CardContent>
  </Card>
);

export default {
  ExecutionStatusGadget,
  PassRateGadget,
  ExecutionTrendGadget,
  TesterProductivityGadget,
  CycleProgressGadget,
  QuickStatsGadget,
  RecentActivityGadget,
  DefectsSummaryGadget,
};
