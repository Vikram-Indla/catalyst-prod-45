import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectMetricsCards } from '@/components/test-management/ProjectMetricsCards';
import { ActivityTrendChart } from '@/components/test-management/ActivityTrendChart';
import { MyWorkSection } from '@/components/test-management/MyWorkSection';
import { ActivityFeed } from '@/components/test-management/ActivityFeed';
import { EmptyStateOverview } from '@/components/test-management/EmptyStateOverview';
import { useProjectMetrics, useCreateAdhocCycle } from '@/hooks/useTestDashboard';
import { useNavigate } from 'react-router-dom';

export default function TestOverviewPage() {
  const navigate = useNavigate();
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catalyst Tests - Overview</h1>
          <p className="text-muted-foreground mt-1">
            Project-wide test management dashboard
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases" onClick={() => navigate('/tests/cases')}>
            Cases
          </TabsTrigger>
          <TabsTrigger value="cycles" onClick={() => navigate('/tests/cycles')}>
            Cycles
          </TabsTrigger>
          <TabsTrigger value="library" onClick={() => navigate('/tests/library')}>
            Step Library
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Project Metrics */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
            <ProjectMetricsCards />
          </div>

          {/* Empty State or Dashboard Content */}
          {!hasData ? (
            <EmptyStateOverview />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Activity Trends & My Work */}
              <div className="lg:col-span-2 space-y-6">
                <ActivityTrendChart />
                <MyWorkSection />
              </div>

              {/* Right Column - Activity Feed */}
              <div className="lg:col-span-1">
                <ActivityFeed />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
