/**
 * DepartmentUtilizationChart — Horizontal bar chart for department utilization
 * Phase 11
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CHART_TOOLTIP_STYLE } from '@/lib/workhub/chartConfig';
import { getUtilColor } from '@/components/workhub/shared/UtilizationBar';
import type { DepartmentCapacity } from '@/hooks/workhub/useCapacityData';

interface Props {
  departments: DepartmentCapacity[];
}

function DeptTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DepartmentCapacity;
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{d.department}</div>
      <div>Avg Utilization: <strong>{d.avgUtilization}%</strong></div>
      <div>Members: {d.memberCount}</div>
      <div>Capacity: {d.totalCapacityHours}h/wk</div>
      <div>Estimated Load: {d.totalEstimatedHours}h</div>
      <div>Active Items: {d.totalActiveItems}</div>
    </div>
  );
}

export function DepartmentUtilizationChart({ departments }: Props) {
  if (!departments.length) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--wh-surface)',
        border: '1px solid var(--wh-border)',
        borderRadius: 'var(--wh-radius-xl, 16px)',
        padding: 24,
      }}
    >
      <h3
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--wh-text-primary)',
          marginBottom: 20,
        }}
      >
        Department Utilization
      </h3>

      <ResponsiveContainer width="100%" height={departments.length * 60 + 40}>
        <BarChart layout="vertical" data={departments} margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 120]} tickFormatter={v => `${v}%`} />
          <YAxis
            type="category" dataKey="department" width={110}
            tick={{ fontSize: 13, fontFamily: 'Inter' }}
          />
          <Tooltip content={<DeptTooltip />} />
          <ReferenceLine x={80} stroke="#ef4444" strokeDasharray="4 4" />
          <ReferenceLine x={60} stroke="#d97706" strokeDasharray="4 4" />
          <Bar dataKey="avgUtilization" radius={[0, 4, 4, 0]} barSize={24}>
            {departments.map((d, i) => (
              <Cell key={i} fill={getUtilColor(d.avgUtilization)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
