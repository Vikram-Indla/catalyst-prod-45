/**
 * Execution Trend Chart - Stacked bar chart showing test results over time
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TrendDataPoint } from '../../api/types';
import { format, parseISO } from 'date-fns';

interface ExecutionTrendChartProps {
  data: TrendDataPoint[];
  className?: string;
  height?: number;
}

export function ExecutionTrendChart({ 
  data, 
  className,
  height = 280 
}: ExecutionTrendChartProps) {
  const chartData = data.map(point => ({
    ...point,
    date: format(parseISO(point.period_start), 'MMM d'),
  }));

  return (
    <div className={cn('bg-background border rounded-xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="text-sm font-semibold text-foreground">Execution Trend</h3>
      </div>
      
      <div className="p-5" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={0} barCategoryGap="20%">
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconType="square"
              iconSize={10}
            />
            <Bar dataKey="passed_count" name="Passed" stackId="a" fill="#0d9488" radius={[0, 0, 0, 0]} />
            <Bar dataKey="failed_count" name="Failed" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="blocked_count" name="Blocked" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
            <Bar dataKey="skipped_count" name="Skipped" stackId="a" fill="#a3a3a3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
