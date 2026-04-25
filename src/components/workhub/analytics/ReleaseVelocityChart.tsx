/**
 * ReleaseVelocityChart — Combined bar chart showing completion % and total items per release
 * Phase 11
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { CHART_TOOLTIP_STYLE } from '@/lib/workhub/chartConfig';

interface VelocityData {
  name: string;
  completion: number;
  totalItems: number;
  doneItems: number;
  color: string;
}

interface Props {
  data: VelocityData[];
}

function VelocityTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as VelocityData;
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{d.name}</div>
      <div>Completion: <strong>{d.completion}%</strong></div>
      <div>Items: {d.doneItems}/{d.totalItems} done</div>
    </div>
  );
}

export function ReleaseVelocityChart({ data }: Props) {
  if (!data.length) return null;

  return (
    <div style={{
      backgroundColor: 'var(--cp-float)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24,
    }}>
      <h3 style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 16, fontWeight: 600,
        color: 'var(--fg-1)', marginBottom: 20,
      }}>
        Release Velocity
      </h3>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'var(--cp-font-body)' }} />
          <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip content={<VelocityTooltip />} />
          <Legend />
          <Bar yAxisId="left" dataKey="completion" name="Completion %" radius={[4, 4, 0, 0]} barSize={40}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || '#2563eb'} />
            ))}
          </Bar>
          <Bar yAxisId="right" dataKey="totalItems" name="Total Items" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} opacity={0.5} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
