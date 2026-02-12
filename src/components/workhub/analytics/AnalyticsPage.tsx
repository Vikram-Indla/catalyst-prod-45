/**
 * AnalyticsPage — Portfolio data visualizations
 * Phase 11
 */

import { PieChart } from 'lucide-react';
import { useAnalyticsData } from '@/hooks/workhub/useCapacityData';
import { StatusDistributionChart } from './StatusDistributionChart';
import { TypeDistributionChart } from './TypeDistributionChart';
import { PriorityDistributionChart } from './PriorityDistributionChart';
import { ProjectDistributionChart } from './ProjectDistributionChart';
import { ReleaseVelocityChart } from './ReleaseVelocityChart';
import { ThemeHealthChart } from './ThemeHealthChart';

export function AnalyticsPage() {
  const { analytics, kpis, themes, releases, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ color: 'var(--wh-text-tertiary)', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading analytics…</div>
      </div>
    );
  }

  const totalItems = kpis?.total_work_items ?? 0;
  const releaseCount = releases?.length ?? 0;

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1400, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          backgroundColor: '#dbeafe', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <PieChart size={20} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 24,
            fontWeight: 700, color: 'var(--wh-text-primary)', margin: 0,
          }}>
            Analytics
          </h1>
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
            color: 'var(--wh-text-secondary)', marginTop: 4,
          }}>
            Portfolio data insights — {totalItems} work items across {releaseCount} releases
          </p>
        </div>
      </div>

      {/* 2-COLUMN CHART GRID */}
      {analytics && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 24, marginBottom: 24,
          }}>
            <StatusDistributionChart data={analytics.statusDistribution} />
            <TypeDistributionChart data={analytics.typeDistribution} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 24, marginBottom: 24,
          }}>
            <PriorityDistributionChart data={analytics.priorityDistribution} />
            <ProjectDistributionChart data={analytics.projectDistribution} />
          </div>

          {/* Full-width sections */}
          <div style={{ marginBottom: 24 }}>
            <ReleaseVelocityChart data={analytics.releaseVelocity} />
          </div>
        </>
      )}

      {/* Theme Health */}
      {themes && themes.length > 0 && (
        <ThemeHealthChart themes={themes} />
      )}
    </div>
  );
}
