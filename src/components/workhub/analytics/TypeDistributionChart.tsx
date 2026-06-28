/**
 * TypeDistributionChart — Vertical bar chart for work item type distribution
 * Phase 11
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
import { TYPE_CHART_COLORS } from '@/lib/workhub/chartConfig';
import { ChartTooltip } from './ChartTooltip';

interface Props {
  data: { name: string; value: number }[];
}

export function TypeDistributionChart({ data }: Props) {
  return (
    <div style={{
      backgroundColor: 'var(--cp-float)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--wh-radius-xl, 16px)',
      padding: 24, minHeight: 340,
    }}>
      <h3 style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 'var(--ds-font-size-500)', fontWeight: 600,
        color: 'var(--fg-1)', marginBottom: 16,
      }}>
        Type Distribution
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'var(--cp-font-body)' }} />
          <YAxis tick={{ fontSize: 'var(--ds-font-size-200)' }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
            {data.map((entry, i) => (
              <Cell key={i} fill={TYPE_CHART_COLORS[entry.name] || 'var(--ds-text-subtle, #475569)'} />
            ))}
            <LabelList dataKey="value" position="top" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, fontFamily: 'var(--cp-font-body)', fill: 'var(--fg-3)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
