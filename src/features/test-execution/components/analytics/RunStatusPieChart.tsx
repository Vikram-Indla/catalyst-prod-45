/**
 * Module 4C-4: Status distribution pie chart
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useRunStatusDistribution } from '../../hooks/useRunAnalytics';

interface RunStatusPieChartProps {
  runId: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  passed: '#22c55e',
  failed: '#ef4444',
  blocked: '#f59e0b',
  skipped: '#6b7280',
  in_progress: '#3b82f6',
  not_started: '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
  in_progress: 'In Progress',
  not_started: 'Not Started',
};

export function RunStatusPieChart({ runId }: RunStatusPieChartProps) {
  const { data: distribution, isLoading } = useRunStatusDistribution(runId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!distribution || distribution.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No assignments yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = distribution.map(d => ({
    name: STATUS_LABELS[d.status] || d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] || '#9ca3af',
    percentage: d.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-md">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            {data.value} cases ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChartIcon className="w-4 h-4" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
