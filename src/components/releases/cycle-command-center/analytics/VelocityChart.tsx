/**
 * Velocity Chart - Execution velocity with cumulative progress
 */

import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useCycleExecutionVelocity } from '@/hooks/test-cycles/useCycleExecutionVelocity';

interface VelocityChartProps {
  cycleId: string;
  days?: number;
}

export function VelocityChart({ cycleId, days = 14 }: VelocityChartProps) {
  const { data: velocityData, isLoading } = useCycleExecutionVelocity(cycleId, days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Execution Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = velocityData || [];
  const avgVelocity = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.velocityPerDay, 0) / chartData.length 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Execution Velocity
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            Avg: <span className="font-medium text-foreground">{avgVelocity.toFixed(1)}/day</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 11 }} 
                stroke="#9ca3af"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }} 
                stroke="#9ca3af"
                allowDecimals={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }} 
                stroke="#9ca3af"
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                iconSize={8}
              />
              <Bar 
                yAxisId="left"
                dataKey="executedCount" 
                name="Tests Executed"
                fill={CATALYST_V5.primary}
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativeExecuted" 
                name="Cumulative"
                stroke={CATALYST_V5.teal}
                strokeWidth={2}
                dot={{ r: 3, fill: CATALYST_V5.teal }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="velocityPerDay" 
                name="3-Day Avg"
                stroke={CATALYST_V5.warning}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
