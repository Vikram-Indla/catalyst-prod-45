/**
 * PROJECT TESTS LAYOUT
 * Layout wrapper with Link-driven tab navigation
 */

import React from 'react';
import { Outlet, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { 
  FlaskConical, 
  LayoutDashboard, 
  ListChecks, 
  RefreshCcw, 
  Play,
  FileText,
  BarChart3,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useProjectTestSummary } from '@/hooks/useProjectTestMetrics';
import { Skeleton } from '@/components/ui/skeleton';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, path: 'overview' },
  { id: 'cases', label: 'Test Cases', icon: <ListChecks className="h-4 w-4" />, path: 'cases' },
  { id: 'cycles', label: 'Test Cycles', icon: <RefreshCcw className="h-4 w-4" />, path: 'cycles' },
  { id: 'executions', label: 'Executions', icon: <Play className="h-4 w-4" />, path: 'executions' },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, path: 'reports' },
];

export function ProjectTestsLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { projectName, isLoading: contextLoading } = useProjectContext();
  const { data: summary, isLoading: summaryLoading, refetch } = useProjectTestSummary(projectId || null);

  // Preserve query params for navigation
  const queryString = searchParams.toString();
  const suffix = queryString ? `?${queryString}` : '';

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <div className="border-b border-border-default bg-surface-1 px-6 py-4">
        {/* Breadcrumb */}
        <nav className="text-sm text-text-tertiary mb-2 flex items-center gap-1.5">
          <NavLink to="/projects" className="hover:text-text-primary transition-colors">
            Projects
          </NavLink>
          <span className="text-text-quaternary">/</span>
          {contextLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <span className="text-text-secondary font-medium">{projectName}</span>
          )}
          <span className="text-text-quaternary">/</span>
          <span className="text-text-primary font-medium">Tests</span>
        </nav>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-subtle rounded-lg">
              <FlaskConical className="h-6 w-6 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Test Management</h1>
              <p className="text-sm text-text-tertiary">
                {summaryLoading ? (
                  <Skeleton className="h-4 w-40 inline-block" />
                ) : (
                  <>{summary?.totalCases || 0} test cases • {summary?.passRate || 0}% pass rate</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" className="bg-accent-primary text-white hover:bg-accent-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Test Case
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 mt-4 -mb-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.id}
              to={`/projects/${projectId}/tests/${tab.path}${suffix}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md transition-colors',
                  'border-b-2',
                  isActive
                    ? 'text-accent-primary border-accent-primary bg-accent-subtle/30'
                    : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-hover'
                )
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
