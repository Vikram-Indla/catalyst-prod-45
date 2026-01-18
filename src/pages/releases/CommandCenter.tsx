import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { MetricCard, ReleaseCard, CycleCard, ActivityFeed } from '@/components/dashboard';
import { Download, Plus, ArrowRight, Package, RefreshCw, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReleaseDialog } from '@/components/forms/ReleaseDialog';
import { 
  mockMetrics, 
  mockReleases, 
  mockCycles, 
  mockActivity 
} from '@/data/mockCommandCenterData';

// Section Header Component - Smaller text as per FIX 4
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
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateRelease = () => {
    setIsCreateDialogOpen(true);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (format === 'pdf') {
        // Generate PDF report
        const content = `
Release Management Dashboard Report
Generated: ${new Date().toLocaleString()}

Key Metrics:
- Active Releases: ${mockReleases.length}
- Test Cycles: ${mockCycles.length}
- Overall Health: 85%

Active Releases:
${mockReleases.map(r => `- ${r.name} (${r.status}): ${r.health}% health`).join('\n')}
        `.trim();
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Dashboard exported as PDF report');
      } else {
        // Generate Excel/CSV
        const headers = ['Release Name', 'Status', 'Health %', 'Start Date'];
        const rows = mockReleases.map(r => [
          r.name,
          r.status,
          String(r.health),
          r.startDate || '-'
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-metrics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Metrics exported as Excel/CSV');
      }
    } catch (error) {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReleaseClick = (id: string) => {
    toast.success(`Opening release ${id}...`);
    navigate(`/releases/${id}/dashboard`);
  };

  const handleCycleClick = (releaseId: string, cycleId: string) => {
    navigate(`/releases/${releaseId}/cycles/${cycleId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Context Bar with Breadcrumb Format */}
      <div 
        className="flex items-center justify-between px-6 bg-muted/30 border-b"
        style={{ height: '44px' }}
      >
        {/* Breadcrumb: RELEASES / Command Center */}
        <div className="flex items-center">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            RELEASES
          </span>
          <span className="text-muted-foreground mx-2">/</span>
          <span className="text-sm font-semibold text-foreground">
            Command Center
          </span>
        </div>
        
        {/* Right side: Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Last updated: 2 min ago</span>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export Dashboard as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Metrics as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="primary" size="sm" onClick={handleCreateRelease}>
            <Plus className="h-4 w-4 mr-2" />
            Create Release
          </Button>
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
          
          {/* Right: Recent Activity (1/3) - FIX 10: Wrap in Card */}
          <div>
            <SectionHeader 
              title="Recent Activity" 
              viewAllLink="/activity"
              viewAllLabel="View All"
            />
            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <ActivitySkeleton />
                ) : (
                  <ActivityFeed items={mockActivity} />
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      
      {/* Create Release Dialog */}
      <ReleaseDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}

export default CommandCenter;
