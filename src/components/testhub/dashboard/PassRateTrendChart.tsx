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
    <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>{item.cycle_key}</p>
      <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '2px 0 8px' }}>{item.cycle_name}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--cp-blue)' }}>{item.pass_rate}%</span>
        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>pass rate</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: '4px 0 0' }}>
        {item.executed} of {item.total_cases} executed
      </p>
    </div>
  );
}

export function PassRateTrendChart({ data }: Props) {
  const chartData = [...data].reverse();

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--divider)', borderRadius: 12, padding: 24, minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={18} color="var(--cp-blue)" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>Pass Rate Trend</p>
          <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>Last {data.length} cycles</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
            <XAxis dataKey="cycle_key" tick={{ fontSize: 11, fill: 'var(--fg-3)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--fg-3)' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="pass_rate" stroke="var(--cp-blue)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--cp-blue)', strokeWidth: 2, stroke: '#FFF' }} activeDot={{ r: 6, fill: 'var(--cp-blue)' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)' }}>
          <div style={{ textAlign: 'center' }}>
            <TrendingUp size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>No cycle data available yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
