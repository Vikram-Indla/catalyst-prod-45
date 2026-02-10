/**
 * StatusDistributionChart — G5-04
 * Donut chart showing execution status breakdown
 */

import { Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardStats } from './DashboardStatCards';

const STATUS_COLORS: { key: string; label: string; color: string }[] = [
  { key: 'passed', label: 'Passed', color: '#10B981' },
  { key: 'failed', label: 'Failed', color: '#EF4444' },
  { key: 'blocked', label: 'Blocked', color: '#F59E0B' },
  { key: 'skipped', label: 'Skipped', color: '#64748B' },
  { key: 'not_run', label: 'Not Run', color: '#CBD5E1' },
];

interface Props {
  stats: DashboardStats | null;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px hsla(0 0% 0%/.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{item.name}</span>
      </div>
      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 0' }}>
        <strong>{item.value}</strong> ({item.pct}%)
      </p>
    </div>
  );
}

export function StatusDistributionChart({ stats }: Props) {
  const total =
    (stats?.total_passed ?? 0) +
    (stats?.total_failed ?? 0) +
    (stats?.total_blocked ?? 0) +
    (stats?.total_skipped ?? 0) +
    (stats?.total_not_run ?? 0);

  const data = stats
    ? STATUS_COLORS.map((s) => {
        const value = (stats as any)[`total_${s.key}`] as number ?? 0;
        return { name: s.label, value, color: s.color, pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0' };
      }).filter((d) => d.value > 0)
    : [];

  return (
    <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 24, minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'hsl(152 81% 96%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} color="#10B981" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Execution by Status</p>
          <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>All test executions</p>
        </div>
      </div>

      {data.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1 }}>{total}</span>
              <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>total</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {data.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color }} />
                  <span style={{ fontSize: 13, color: 'hsl(var(--foreground))' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))' }}>
          <div style={{ textAlign: 'center' }}>
            <Activity size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>No execution data available yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
