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
      backgroundColor: 'var(--wh-surface)',
      border: '1px solid var(--wh-border)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24, minHeight: 340,
    }}>
      <h3 style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16, fontWeight: 600,
        color: 'var(--wh-text-primary)', marginBottom: 16,
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
                <Cell key={i} fill={PRIORITY_CHART_COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom" height={36}
              formatter={(value: string) => <span style={{ fontSize: 12, fontFamily: 'Inter' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        <div style={{
          position: 'absolute',
          top: '42%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--wh-text-primary)' }}>
            {total}
          </div>
          <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: 'var(--wh-text-tertiary)' }}>
            items
          </div>
        </div>
      </div>
    </div>
  );
}
