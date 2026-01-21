/**
 * Defect Trend Chart - Stacked area chart by severity
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bug } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useCycleDefectTrends } from '@/hooks/test-cycles/useCycleAnalytics';

interface DefectTrendChartProps {
  cycleId: string;
  days?: number;
}

const SEVERITY_COLORS = {
  blocker: '#dc2626',  // Red-600
  critical: '#ea580c', // Orange-600
  major: '#d97706',    // Amber-600
  minor: '#65a30d',    // Lime-600
};

export function DefectTrendChart({ cycleId, days = 14 }: DefectTrendChartProps) {
  const { data: trends, isLoading } = useCycleDefectTrends(cycleId, days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Defect Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = trends || [];
  const hasData = chartData.some(d => d.totalDefects > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bug className="w-4 h-4" />
          Defect Trends by Severity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No defects recorded yet
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="dateLabel" 
                  tick={{ fontSize: 11 }} 
                  stroke="#9ca3af"
                />
                <YAxis 
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
                <Area 
                  type="monotone" 
                  dataKey="blockerCount" 
                  name="Blocker"
                  stackId="1"
                  stroke={SEVERITY_COLORS.blocker}
                  fill={SEVERITY_COLORS.blocker}
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="criticalCount" 
                  name="Critical"
                  stackId="1"
                  stroke={SEVERITY_COLORS.critical}
                  fill={SEVERITY_COLORS.critical}
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="majorCount" 
                  name="Major"
                  stackId="1"
                  stroke={SEVERITY_COLORS.major}
                  fill={SEVERITY_COLORS.major}
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="minorCount" 
                  name="Minor"
                  stackId="1"
                  stroke={SEVERITY_COLORS.minor}
                  fill={SEVERITY_COLORS.minor}
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
