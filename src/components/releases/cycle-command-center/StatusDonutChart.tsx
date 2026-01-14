/**
 * Status Donut Chart - Distribution of test statuses
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { CycleStats } from '@/hooks/test-cycles/useCycleDetails';

interface StatusDonutChartProps {
  stats: CycleStats;
}

export function StatusDonutChart({ stats }: StatusDonutChartProps) {
  const data = [
    { name: 'Passed', value: stats.passed, color: CATALYST_V5.teal },
    { name: 'Failed', value: stats.failed, color: CATALYST_V5.danger },
    { name: 'Blocked', value: stats.blocked, color: CATALYST_V5.warning },
    { name: 'In Progress', value: stats.inProgress, color: CATALYST_V5.primary },
    { name: 'Pending', value: stats.notStarted, color: CATALYST_V5.slate[300] },
  ].filter(d => d.value > 0);

  const executed = stats.passed + stats.failed + stats.blocked;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percentage = stats.total > 0 
                      ? Math.round((data.value / stats.total) * 100) 
                      : 0;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg px-3 py-2">
                        <p className="text-sm font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value} ({percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">{executed}</span>
            <span className="text-xs text-muted-foreground">Executed</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
