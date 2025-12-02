import { useEffect } from 'react';
import { ProjectMetricsCards } from '@/components/test-management/ProjectMetricsCards';
import { ActivityTrendChart } from '@/components/test-management/ActivityTrendChart';
import { MyWorkSection } from '@/components/test-management/MyWorkSection';
import { ActivityFeed } from '@/components/test-management/ActivityFeed';
import { EmptyStateOverview } from '@/components/test-management/EmptyStateOverview';
import { useProjectMetrics, useCreateAdhocCycle } from '@/hooks/useTestDashboard';

export default function TestOverviewPage() {
  const { data: metrics } = useProjectMetrics();
  const { mutate: createAdhocCycle } = useCreateAdhocCycle();

  // Auto-create Adhoc cycle on first access
  useEffect(() => {
    createAdhocCycle();
  }, [createAdhocCycle]);

  const hasData = metrics && (
    metrics.total_cases > 0 || 
    metrics.total_sets > 0 || 
    metrics.total_defects > 0
  );

  return (
    <div className="container mx-auto px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)] space-y-[var(--s6)]">
      {/* Header with responsive spacing */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s4)]">
        <div>
          <h1 className="text-3xl font-bold">Catalyst Tests - Overview</h1>
          <p className="text-muted-foreground mt-1">
            Project-wide test management dashboard
          </p>
        </div>
      </div>

      {/* Project Metrics with design tokens */}
      <div>
        <h2 className="text-xl font-semibold mb-[var(--s4)]">Project Overview</h2>
        <ProjectMetricsCards />
      </div>

      {/* Empty State or Dashboard Content */}
      {!hasData ? (
        <EmptyStateOverview />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--s6)]">
          {/* Left Column - Activity Trends & My Work with responsive spacing */}
          <div className="lg:col-span-2 space-y-[var(--s6)]">
            <ActivityTrendChart />
            <MyWorkSection />
          </div>

          {/* Right Column - Activity Feed */}
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      )}
    </div>
  );
}
