import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard, ReleaseCard, CycleCard, ActivityFeed } from '@/components/dashboard';
import { Download, Plus, ArrowRight, Package } from 'lucide-react';
import { 
  mockMetrics, 
  mockReleases, 
  mockCycles, 
  mockActivity 
} from '@/data/mockCommandCenterData';

// Section Header Component
function SectionHeader({ 
  title, 
  viewAllLink,
  viewAllLabel = 'View All'
}: { 
  title: string; 
  viewAllLink?: string;
  viewAllLabel?: string;
}) {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {viewAllLink && (
        <button
          onClick={() => navigate(viewAllLink)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Loading Skeleton Components
function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-[130px]" />
      ))}
    </div>
  );
}

function ReleasesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-[220px]" />
      ))}
    </div>
  );
}

function CyclesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-[130px]" />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyReleases({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
      <div className="p-3 rounded-full bg-primary/10 mb-4">
        <Package className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No Active Releases</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Create your first release to start managing your test cycles and quality metrics.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Create Release
      </Button>
    </div>
  );
}

export function CommandCenter() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateRelease = () => {
    // TODO: Open create release modal
    console.log('Create Release clicked');
  };

  const handleExport = () => {
    console.log('Export clicked');
  };

  const handleReleaseClick = (id: string) => {
    navigate(`/releases/${id}/dashboard`);
  };

  const handleCycleClick = (releaseId: string, cycleId: string) => {
    navigate(`/releases/${releaseId}/cycles/${cycleId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ministry of Industry — Investment Portal Program
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="primary" onClick={handleCreateRelease}>
              <Plus className="h-4 w-4 mr-2" />
              Create Release
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-8">
        
        {/* Section 1: Metrics Grid */}
        <section>
          <SectionHeader title="Key Metrics" />
          {isLoading ? (
            <MetricsSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {mockMetrics.map((metric, index) => (
                <MetricCard
                  key={metric.id}
                  label={metric.label}
                  value={metric.value}
                  suffix={metric.suffix}
                  trend={metric.trend}
                  progress={metric.progress}
                  icon={metric.icon}
                  iconVariant={metric.iconVariant}
                  animationDelay={index * 50}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Section 2: Active Releases */}
        <section>
          <SectionHeader 
            title="Active Releases" 
            viewAllLink="/releases"
            viewAllLabel="View All Releases"
          />
          {isLoading ? (
            <ReleasesSkeleton />
          ) : mockReleases.length === 0 ? (
            <EmptyReleases onCreateClick={handleCreateRelease} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockReleases.map((release, index) => (
                <ReleaseCard
                  key={release.id}
                  id={release.id}
                  releaseKey={release.key}
                  name={release.name}
                  dateRange={release.dateRange}
                  health={release.health}
                  healthStatus={release.healthStatus}
                  stats={release.stats}
                  status={release.status}
                  team={release.team}
                  onClick={() => handleReleaseClick(release.id)}
                  animationDelay={index * 75}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Section 3: Two-Column Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Active Test Cycles (2/3) */}
          <div className="lg:col-span-2">
            <SectionHeader 
              title="Active Test Cycles" 
              viewAllLink="/test-management/cycles"
              viewAllLabel="View All Cycles"
            />
            {isLoading ? (
              <CyclesSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockCycles.map((cycle, index) => (
                  <CycleCard
                    key={cycle.id}
                    id={cycle.id}
                    cycleKey={cycle.key}
                    name={cycle.name}
                    environment={cycle.environment}
                    progress={cycle.progress}
                    assignee={cycle.assignee}
                    testsCompleted={cycle.testsCompleted}
                    testsTotal={cycle.testsTotal}
                    onClick={() => handleCycleClick(cycle.releaseId, cycle.id)}
                    animationDelay={index * 50}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Recent Activity (1/3) */}
          <div>
            <SectionHeader 
              title="Recent Activity" 
              viewAllLink="/activity"
              viewAllLabel="View All"
            />
            <div className="bg-card border rounded-lg p-4">
              {isLoading ? (
                <ActivitySkeleton />
              ) : (
                <ActivityFeed items={mockActivity} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CommandCenter;
