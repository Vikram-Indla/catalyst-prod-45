/**
 * ProjectDistributionChart — Horizontal bar chart for project distribution
 * Phase 11
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  data: { name: string; value: number }[];
}

export function ProjectDistributionChart({ data }: Props) {
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
        Project Distribution
      </h3>

      <ResponsiveContainer width="100%" height={data.length * 48 + 40}>
        <BarChart layout="vertical" data={data} margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category" dataKey="name" width={50}
            tick={{ fontSize: 12, fontFamily: 'monospace' }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
