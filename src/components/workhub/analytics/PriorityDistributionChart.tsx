/**
 * PriorityDistributionChart — Donut chart for priority distribution
 * Phase 11
 */

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PRIORITY_CHART_COLORS } from '@/lib/workhub/chartConfig';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  data: { name: string; value: number }[];
}

export function PriorityDistributionChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{
      backgroundColor: 'var(--cp-float)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24, minHeight: 340,
    }}>
      <h3 style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 16, fontWeight: 600,
        color: 'var(--fg-1)', marginBottom: 16,
      }}>
        Priority Distribution
      </h3>

      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" innerRadius={60} outerRadius={100}
              paddingAngle={2} stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={PRIORITY_CHART_COLORS[entry.name] || 'var(--ds-text-subtlest, #94a3b8)'} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom" height={36}
              formatter={(value: string) => <span style={{ fontSize: 12, fontFamily: 'var(--cp-font-body)' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        <div style={{
          position: 'absolute',
          top: '42%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--fg-1)' }}>
            {total}
          </div>
          <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, color: 'var(--fg-4)' }}>
            items
          </div>
        </div>
      </div>
    </div>
  );
}
