/**
 * TestHub Dashboard Page — Database Wired
 * Route: /testhub/dashboard
 */

import { LayoutDashboard, FolderTree, Play, Bug, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestCases, useFoldersWithCounts, useTestCycles } from '@/hooks/test-management';
import { Link } from 'react-router-dom';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function TestHubDashboardPage() {
  const projectId = DEFAULT_PROJECT_ID;
  const { data: casesData, isLoading: casesLoading } = useTestCases(projectId, { per_page: 1000 });
  const { data: folders = [], isLoading: foldersLoading } = useFoldersWithCounts(projectId);
  const { data: cycles = [], isLoading: cyclesLoading } = useTestCycles(projectId);

  const totalCases = casesData?.total || 0;
  const totalDefects = 0;
  const activeCycles = cycles.length;
  const isLoading = casesLoading || foldersLoading || cyclesLoading;

  return (
    <div className="flex-1 p-6 overflow-auto bg-surface-1">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">TestHub Dashboard</h1>
          <p className="text-sm text-text-secondary">Overview of test management activities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/testhub/repository">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Test Cases</p>
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-primary">{totalCases}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{folders.length} folders</p>
                </div>
                <FolderTree className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/testhub/cycles">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Cycles</p>
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-primary">{activeCycles}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{cycles.length} total</p>
                </div>
                <Play className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/testhub/defects">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Defects</p>
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-warning">{totalDefects}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Total tracked</p>
                </div>
                <Bug className="h-8 w-8 text-warning opacity-20" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/testhub/reports">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reports</p>
                  <p className="text-3xl font-bold text-success">-</p>
                  <p className="text-xs text-muted-foreground mt-1">View analytics</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success opacity-20" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
