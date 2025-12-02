/**
 * Cycle Trend Report - Shows execution trends across test cycles
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Target } from 'lucide-react';

interface CycleTrend {
  cycleId: string;
  cycleName: string;
  startDate: string;
  endDate: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passRate: number;
  executionRate: number;
}

interface CycleTrendReportProps {
  trends: CycleTrend[];
  comparison?: {
    passRateChange: number;
    executionRateChange: number;
    defectRateChange: number;
  };
}

export const CycleTrendReport: React.FC<CycleTrendReportProps> = ({
  trends,
  comparison,
}) => {
  const chartData = trends.map((t) => ({
    name: t.cycleName,
    passRate: t.passRate,
    executionRate: t.executionRate,
    passed: t.passed,
    failed: t.failed,
    blocked: t.blocked,
  }));

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number, inverse = false) => {
    if (value > 0) return inverse ? 'text-red-500' : 'text-green-500';
    if (value < 0) return inverse ? 'text-green-500' : 'text-red-500';
    return 'text-muted-foreground';
  };

  const latestCycle = trends[trends.length - 1];
  const avgPassRate = trends.length > 0
    ? Math.round(trends.reduce((sum, t) => sum + t.passRate, 0) / trends.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-brand-gold" />
              <div>
                <p className="text-2xl font-bold">{trends.length}</p>
                <p className="text-sm text-muted-foreground">Cycles Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{avgPassRate}%</p>
                <p className="text-sm text-muted-foreground">Avg Pass Rate</p>
              </div>
            </div>
            {comparison && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(comparison.passRateChange)}`}>
                {getTrendIcon(comparison.passRateChange)}
                <span>{Math.abs(comparison.passRateChange)}% vs previous</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-gold/20 flex items-center justify-center">
                <span className="text-brand-gold font-bold">{latestCycle?.passRate || 0}%</span>
              </div>
              <div>
                <p className="text-sm font-medium">Latest Cycle</p>
                <p className="text-xs text-muted-foreground truncate max-w-24">
                  {latestCycle?.cycleName || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-2xl font-bold">
                {trends.reduce((sum, t) => sum + t.totalTests, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Executions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pass Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Pass Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Pass Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  stroke="#c69c6d"
                  strokeWidth={2}
                  dot={{ fill: '#c69c6d', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#c69c6d' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Execution Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Results by Cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="passed"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                  name="Passed"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                  name="Failed"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                  name="Blocked"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cycle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-sm">Cycle</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Period</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Tests</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Passed</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Failed</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, idx) => (
                  <tr key={trend.cycleId} className="border-b border-border/50">
                    <td className="py-3 px-4">
                      <span className="font-medium">{trend.cycleName}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(trend.startDate).toLocaleDateString()} - {new Date(trend.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">{trend.totalTests}</td>
                    <td className="py-3 px-4 text-right text-green-500">{trend.passed}</td>
                    <td className="py-3 px-4 text-right text-red-500">{trend.failed}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant="outline"
                        className={
                          trend.passRate >= 90
                            ? 'border-green-500 text-green-500'
                            : trend.passRate >= 70
                            ? 'border-amber-500 text-amber-500'
                            : 'border-red-500 text-red-500'
                        }
                      >
                        {trend.passRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {trends.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No cycle data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
