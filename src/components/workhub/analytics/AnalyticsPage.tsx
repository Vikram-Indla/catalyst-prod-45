/**
 * AnalyticsPage — Portfolio data visualizations
 * Phase 11
 */

import { useAnalyticsData } from '@/hooks/workhub/useCapacityData';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
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
        <div style={{ color: 'var(--fg-4)', fontFamily: 'var(--cp-font-body)' }}>Loading analytics…</div>
      </div>
    );
  }

  const totalItems = kpis?.total_work_items ?? 0;
  const releaseCount = releases?.length ?? 0;

  return (
    <>
      <CommandCenterHeader
        title="Analytics"
        subtitle={`Portfolio data insights — ${totalItems} work items across ${releaseCount} releases`}
      />
      <div style={{ padding: '32px 32px 48px', maxWidth: 1400, margin: '0 auto' }}>
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
    </>
  );
}
