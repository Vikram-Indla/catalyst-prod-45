/**
 * Module 3B-3: Trend line/area chart
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import type { TrendData, TrendDataPoint } from '../../types/progress-dashboard';

interface TrendChartProps {
  trendData: TrendData | null;
  className?: string;
  height?: number;
}

export function TrendChart({ trendData, className, height = 200 }: TrendChartProps) {
  if (!trendData || !trendData.data_points || trendData.data_points.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className="text-sm font-medium text-foreground">Pass Rate Trend</h3>
        <div 
          className="flex items-center justify-center rounded-lg border bg-card" 
          style={{ height }}
        >
          <p className="text-sm text-muted-foreground">Not enough data for trend</p>
        </div>
      </div>
    );
  }

  const chartData = trendData.data_points.map((point: TrendDataPoint) => ({
    ...point,
    time: format(new Date(point.timestamp), 'HH:mm'),
  }));

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-foreground">Pass Rate Trend</h3>
      
      <div className="rounded-lg border bg-card p-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="passRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value}%`, 'Pass Rate']}
            />
            <Area
              type="monotone"
              dataKey="pass_rate"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#passRateGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
