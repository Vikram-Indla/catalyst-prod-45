/**
 * CapacityPage — Department & individual resource capacity planning
 * Phase 11
 */

import { BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import { useDepartmentCapacity } from '@/hooks/workhub/useCapacityData';
import { getUtilColor } from '@/components/workhub/shared/UtilizationBar';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { DepartmentUtilizationChart } from './DepartmentUtilizationChart';
import { CapacityTable } from './CapacityTable';

export function CapacityPage() {
  const { departments, resources, isLoading } = useDepartmentCapacity();

  const totalMembers = resources?.length ?? 0;
  const totalCapacity = departments.reduce((s, d) => s + d.totalCapacityHours, 0);
  const totalEstimated = departments.reduce((s, d) => s + d.totalEstimatedHours, 0);
  const avgUtil = totalMembers > 0
    ? Math.round(departments.reduce((s, d) => s + d.avgUtilization * d.memberCount, 0) / totalMembers)
    : 0;

  const kpis = [
    { label: 'Team Size', value: totalMembers, suffix: '', icon: Users, color: 'var(--cp-blue)' },
    { label: 'Total Capacity', value: totalCapacity, suffix: 'h/wk', icon: Clock, color: 'var(--cp-blue)' },
    { label: 'Estimated Load', value: totalEstimated, suffix: 'h', icon: TrendingUp, color: 'var(--cp-blue)' },
    { label: 'Avg Utilization', value: avgUtil, suffix: '%', icon: BarChart3, color: getUtilColor(avgUtil) },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ color: 'var(--fg-4)', fontFamily: 'var(--cp-font-body)' }}>Loading capacity data…</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <CommandCenterHeader
        title="Capacity Planning"
        subtitle={`Department & individual resource capacity — ${totalMembers} members`}
      />

      {/* Content with padding */}
      <div className="flex flex-col flex-1 min-h-0 px-6 pb-4 overflow-y-auto">
        {/* KPI ROW */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16, marginBottom: 28,
        }}>
          {kpis.map(kpi => (
            <div
              key={kpi.label}
              style={{
                backgroundColor: 'var(--cp-float)',
                border: '1px solid var(--divider)',
                borderRadius: 'var(--wh-radius-xl, 16px)',
                padding: '20px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{
                width: 36, height: 50, borderRadius: 12,
                backgroundColor: 'var(--bg-1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--cp-font-heading)', fontSize: 22, fontWeight: 700,
                  color: kpi.color, lineHeight: 1.1,
                }}>
                  {kpi.value}{kpi.suffix}
                </div>
                <div style={{
                  fontFamily: 'var(--cp-font-body)', fontSize: 12,
                  color: 'var(--fg-4)', marginTop: 2,
                }}>
                  {kpi.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DEPARTMENT UTILIZATION CHART */}
        <div style={{ marginBottom: 28 }}>
          <DepartmentUtilizationChart departments={departments} />
        </div>

        {/* INDIVIDUAL CAPACITY TABLE */}
        <CapacityTable resources={resources ?? []} />
      </div>
    </div>
  );
}
