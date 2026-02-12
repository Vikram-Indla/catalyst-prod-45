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
        Type Distribution
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Inter' }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
            {data.map((entry, i) => (
              <Cell key={i} fill={TYPE_CHART_COLORS[entry.name] || '#475569'} />
            ))}
            <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter', fill: 'var(--wh-text-secondary)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
