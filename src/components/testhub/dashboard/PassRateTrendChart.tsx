/**
 * PassRateTrendChart — G5-04
 * Line chart showing pass rate across recent cycles
 */

import { TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface CyclePassRate {
  cycle_id: string;
  cycle_key: string;
  cycle_name: string;
  status: string;
  pass_rate: number;
  total_cases: number;
  executed: number;
}

interface Props {
  data: CyclePassRate[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as CyclePassRate;
  return (
    <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 16px hsla(0 0% 0%/.12)', minWidth: 160 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>{item.cycle_key}</p>
      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '2px 0 8px' }}>{item.cycle_name}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#2563EB' }}>{item.pass_rate}%</span>
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>pass rate</span>
      </div>
      <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>
        {item.executed} of {item.total_cases} executed
      </p>
    </div>
  );
}

export function PassRateTrendChart({ data }: Props) {
  const chartData = [...data].reverse();

  return (
    <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24, minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'hsl(217 91% 96%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={18} color="#2563EB" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Pass Rate Trend</p>
          <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>Last {data.length} cycles</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="cycle_key" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="pass_rate" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFF' }} activeDot={{ r: 6, fill: '#2563EB' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))' }}>
          <div style={{ textAlign: 'center' }}>
            <TrendingUp size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>No cycle data available yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
