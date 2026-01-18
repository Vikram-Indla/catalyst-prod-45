/**
 * Execution Progress Chart - Stacked bar chart showing daily execution
 */

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useExecutionProgress } from '@/hooks/test-cycles/useExecutionProgress';

interface ExecutionProgressChartProps {
  cycleId: string;
}

export function ExecutionProgressChart({ cycleId }: ExecutionProgressChartProps) {
  const [days, setDays] = useState(14);
  const { data = [], isLoading } = useExecutionProgress(cycleId, days);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Daily Execution Progress
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button 
              className={`px-3 py-1 text-xs font-medium rounded-md ${days === 14 ? '' : 'text-muted-foreground hover:bg-background'}`}
              style={days === 14 ? { backgroundColor: CATALYST_V5.primaryLighter, color: CATALYST_V5.primary } : undefined}
              onClick={() => setDays(14)}
            >
              14D
            </button>
            <button 
              className={`px-3 py-1 text-xs font-medium rounded-md ${days === 30 ? '' : 'text-muted-foreground hover:bg-background'}`}
              style={days === 30 ? { backgroundColor: CATALYST_V5.primaryLighter, color: CATALYST_V5.primary } : undefined}
              onClick={() => setDays(30)}
            >
              30D
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={0}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
                        <p className="text-sm font-medium mb-1">{label}</p>
                        {payload.map((entry: any, index: number) => (
                          <p key={index} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Bar 
                dataKey="passed" 
                name="Passed" 
                stackId="a" 
                fill={CATALYST_V5.teal}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="failed" 
                name="Failed" 
                stackId="a" 
                fill={CATALYST_V5.danger}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="blocked" 
                name="Blocked" 
                stackId="a" 
                fill={CATALYST_V5.warning}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
