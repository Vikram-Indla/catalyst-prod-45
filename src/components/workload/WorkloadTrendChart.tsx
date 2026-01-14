/**
 * Workload Trend Chart Component
 * Line chart showing tests assigned vs completed over time
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useWorkloadTrends } from '@/hooks/workload';
import { format, parseISO } from 'date-fns';

export function WorkloadTrendChart({ teamId }: { teamId: string }) {
  const { data, isLoading } = useWorkloadTrends(teamId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-48 animate-pulse bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const trendIcon = data?.stats.trend === 'improving' ? TrendingUp : data?.stats.trend === 'declining' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = data?.stats.trend === 'improving' ? CATALYST_V5.teal : data?.stats.trend === 'declining' ? CATALYST_V5.danger : CATALYST_V5.slate[500];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" style={{ color: CATALYST_V5.slate[900] }}>
            Execution Trend
          </CardTitle>
          <Badge style={{ backgroundColor: `${trendColor}20`, color: trendColor }} className="gap-1">
            <TrendIcon className="h-3 w-3" />
            {data?.stats.trend}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.trends.slice(-14)}>
              <defs>
                <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CATALYST_V5.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CATALYST_V5.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(parseISO(d), 'd')}
                tick={{ fontSize: 10, fill: CATALYST_V5.slate[500] }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: `1px solid ${CATALYST_V5.slate[200]}`, borderRadius: 8 }}
                labelFormatter={(d) => format(parseISO(d), 'MMM d')}
              />
              <Area type="monotone" dataKey="assigned" stroke={CATALYST_V5.primary} fill="url(#colorAssigned)" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke={CATALYST_V5.teal} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-around mt-3 pt-3 border-t" style={{ borderColor: CATALYST_V5.slate[200] }}>
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: CATALYST_V5.slate[900] }}>{data?.stats.completionRate}%</p>
            <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>Completion Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: CATALYST_V5.slate[900] }}>{data?.stats.avgPerDay}</p>
            <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>Avg/Day</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
