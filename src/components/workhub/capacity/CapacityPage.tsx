/**
 * CapacityPage — Department & individual resource capacity planning
 * Phase 11
 */

import { BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import { useDepartmentCapacity } from '@/hooks/workhub/useCapacityData';
import { getUtilColor } from '@/components/workhub/shared/UtilizationBar';
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
    { label: 'Team Size', value: totalMembers, suffix: '', icon: Users, color: 'var(--wh-primary)' },
    { label: 'Total Capacity', value: totalCapacity, suffix: 'h/wk', icon: Clock, color: 'var(--wh-primary)' },
    { label: 'Estimated Load', value: totalEstimated, suffix: 'h', icon: TrendingUp, color: 'var(--wh-primary)' },
    { label: 'Avg Utilization', value: avgUtil, suffix: '%', icon: BarChart3, color: getUtilColor(avgUtil) },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ color: 'var(--wh-text-tertiary)', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading capacity data…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1400, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          backgroundColor: '#dbeafe', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <BarChart3 size={20} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 24,
            fontWeight: 700, color: 'var(--wh-text-primary)', margin: 0,
          }}>
            Capacity Planning
          </h1>
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
            color: 'var(--wh-text-secondary)', marginTop: 4,
          }}>
            Department & individual resource capacity — {totalMembers} members
          </p>
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: 'var(--wh-surface)',
              border: '1px solid var(--wh-border)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: '20px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: '#f1f5f9', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <kpi.icon size={18} style={{ color: kpi.color }} />
            </div>
            <div>
              <div style={{
                fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700,
                color: kpi.color, lineHeight: 1.1,
              }}>
                {kpi.value}{kpi.suffix}
              </div>
              <div style={{
                fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
                color: 'var(--wh-text-tertiary)', marginTop: 2,
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
  );
}
