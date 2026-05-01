/**
 * Release Dashboard Page
 * Catalyst V5 Implementation - Main entry point
 * Route: /releases/:releaseId/dashboard
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  ChevronRight, 
  Search, 
  Download, 
  Settings, 
  Play,
  Command,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// Components
import { ReleaseHeader } from '@/components/releases/dashboard/ReleaseHeader';
import { ScorecardBar } from '@/components/releases/dashboard/ScorecardBar';
import { FilterBar } from '@/components/releases/dashboard/FilterBar';
import { TestExecutionTable } from '@/components/releases/dashboard/TestExecutionTable';
import { QualityGatesWidget } from '@/components/releases/dashboard/QualityGatesWidget';
import { CoverageMatrixWidget } from '@/components/releases/dashboard/CoverageMatrixWidget';
import { ActivityFeedWidget } from '@/components/releases/dashboard/ActivityFeedWidget';
import { EnvironmentComparisonWidget } from '@/components/releases/dashboard/EnvironmentComparisonWidget';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Data
import {
  mockRelease,
  mockScorecardMetrics,
  mockTestCases,
  mockQualityGates,
  mockCoverageMatrix,
  mockActivityFeed,
  mockEnvironmentMetrics,
  mockTraceabilityChain,
} from '@/data/mockReleaseDashboardData';

import type { TestCase, TestCaseStatus, DashboardFilters } from '@/types/release-dashboard';

export default function ReleaseDashboardPage() {
  const { releaseId } = useParams();
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    cycle: null,
    environment: null,
    assignee: null,
    status: null,
    priority: null,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Filter test cases
  const filteredTestCases = mockTestCases.filter(tc => {
    if (filters.status && tc.status !== filters.status) return false;
    if (filters.priority && tc.priority !== filters.priority) return false;
    if (filters.assignee && tc.assigneeId !== filters.assignee) return false;
    if (searchQuery && !tc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleTestCaseClick = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setIsDrawerOpen(true);
  };

  const handleScorecardClick = (status: TestCaseStatus | null) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? null : value }));
  };

  const handleClearFilters = () => {
    setFilters({ cycle: null, environment: null, assignee: null, status: null, priority: null });
  };

  const daysLeft = Math.ceil((new Date(mockRelease.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header - 48px */}
      <header 
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"
        style={{ height: '48px' }}
      >
        <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between px-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-700">
              <Home className="w-3.5 h-3.5" />
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/releases" className="hover:text-slate-700">Releases</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 dark:text-slate-100 font-medium">{mockRelease.version}</span>
          </nav>

          {/* Global Search */}
          <div className="relative w-[220px] focus-within:w-[280px] transition-all">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tests, defects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-8 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-700 border rounded text-slate-400">
              /
            </kbd>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500">
              <Command className="w-4 h-4 mr-1" />
              <span className="text-xs">⌘K</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="w-4 h-4" />
            </Button>
            <Button size="sm" className="h-8 bg-[var(--ds-text-brand,#2563eb)] hover:bg-[var(--ds-background-brand-bold-hovered,#1d4ed8)]">
              <Play className="w-4 h-4 mr-2" />
              Execute Tests
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-5 py-4">
        {/* Release Header */}
        <ReleaseHeader 
          release={{
            ...mockRelease,
            testCycles: [{ id: 'cycle-1', name: 'Cycle 1', testCount: mockScorecardMetrics.total, passedCount: mockScorecardMetrics.passed }],
            qualityGates: mockQualityGates,
          }}
        />

        {/* Scorecard Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4"
        >
          <ScorecardBar 
            metrics={mockScorecardMetrics}
            onFilterByStatus={handleScorecardClick}
            activeFilter={filters.status}
          />
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4"
        >
          <FilterBar 
            filters={{
              cycle: filters.cycle || 'all',
              environment: filters.environment || 'all',
              assignee: filters.assignee || 'all',
              status: filters.status || 'all',
              priority: filters.priority || 'all',
            }}
            onFiltersChange={(newFilters) => {
              setFilters({
                cycle: newFilters.cycle === 'all' ? null : newFilters.cycle,
                environment: newFilters.environment === 'all' ? null : newFilters.environment,
                assignee: newFilters.assignee === 'all' ? null : newFilters.assignee,
                status: newFilters.status === 'all' ? null : newFilters.status as any,
                priority: newFilters.priority === 'all' ? null : newFilters.priority as any,
              });
            }}
            cycles={[{ id: 'cycle-1', name: 'Cycle 1 - Smoke' }, { id: 'cycle-2', name: 'Cycle 2 - Regression' }]}
            environments={['Staging', 'UAT', 'Production']}
            assignees={[{ id: 'user-001', name: 'Sarah Chen' }, { id: 'user-002', name: 'Mike Johnson' }]}
          />
        </motion.div>

        {/* Main Grid: 8 + 4 columns */}
        <div className="mt-6 grid grid-cols-12 gap-4">
          {/* Left Column - Test Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-8"
          >
            <TestExecutionTable 
              tests={filteredTestCases}
              onTestClick={handleTestCaseClick}
            />
          </motion.div>

          {/* Right Column - Widgets Stack */}
          <div className="col-span-4 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <QualityGatesWidget gates={mockQualityGates} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CoverageMatrixWidget coverage={mockCoverageMatrix.map(r => ({
                requirementId: r.id,
                requirementName: r.name,
                testStatuses: r.testCases.map(tc => tc.status),
              }))} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <EnvironmentComparisonWidget environments={mockEnvironmentMetrics} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ActivityFeedWidget activities={mockActivityFeed} />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Test Detail Drawer - Simple inline version for dashboard */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>{selectedTestCase?.title || 'Test Case'}</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium">{selectedTestCase?.status}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Priority: <span className="font-medium">{selectedTestCase?.priority}</span>
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
