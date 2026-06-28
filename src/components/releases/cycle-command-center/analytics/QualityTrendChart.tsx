/**
 * Quality Trend Chart - Pass rate and execution rate over time
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from '@/lib/atlaskit-icons';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useCycleQualityTrends, QualityTrendPoint } from '@/hooks/test-cycles/useCycleAnalytics';

interface QualityTrendChartProps {
  cycleId: string;
  days?: number;
}

export function QualityTrendChart({ cycleId, days = 14 }: QualityTrendChartProps) {
  const { data: trends, isLoading } = useCycleQualityTrends(cycleId, days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Quality Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = trends || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Quality Trends ({days}d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border, #e5e7eb)" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 'var(--ds-font-size-100)' }} 
                stroke="var(--ds-text-subtlest, #626F86)"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 'var(--ds-font-size-100)' }} 
                stroke="var(--ds-text-subtlest, #626F86)"
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: '8px',
                  fontSize: 'var(--ds-font-size-200)'
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                iconSize={8}
              />
              <Line 
                type="monotone" 
                dataKey="passRate" 
                name="Pass Rate"
                stroke={CATALYST_V5.teal} 
                strokeWidth={2}
                dot={{ r: 3, fill: CATALYST_V5.teal }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="executionRate" 
                name="Execution Rate"
                stroke={CATALYST_V5.primary} 
                strokeWidth={2}
                dot={{ r: 3, fill: CATALYST_V5.primary }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="defectRate" 
                name="Defect Rate"
                stroke={CATALYST_V5.danger} 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: CATALYST_V5.danger }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
