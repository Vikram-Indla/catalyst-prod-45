/**
 * Defects List Page — Rewired to tm_defects via useDefects hook
 * Route: /testhub/defects
 */
import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Bug, Plus, Download } from 'lucide-react';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDefects, useDefectStats, useDeleteDefect } from '@/hooks/test-management/useDefects';
import { DefectFilters } from '@/components/defects/g25/DefectFilters';
import { DefectTable } from '@/components/defects/g25/DefectTable';
import { CreateDefectModalG25 } from '@/components/defects/g25/CreateDefectModal';
import { DefectFilters as TMDefectFilters } from '@/types/test-management';
import { Defect } from '@/types/defects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function DefectsPage() {
  const { isDark } = useTheme();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Build tm_* typed filters from the UI filter state
  const tmFilters: TMDefectFilters = {
    search: filters.search,
    assigned_to: filters.assignedTo,
  };
  if (filters.status?.length) {
    tmFilters.status = filters.status.map((s: string) => s.toUpperCase()) as any;
  }
  if (filters.severity?.length) {
    tmFilters.severity = filters.severity.map((s: string) => s.toUpperCase()) as any;
  }

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filters]);

  const { data: defectsResult, isLoading } = useDefects(DEFAULT_PROJECT_ID, tmFilters, page, pageSize);
  const tmDefects = defectsResult?.data || [];
  const totalCount = defectsResult?.total || 0;

  const { data: stats, isLoading: loadingStats } = useDefectStats(DEFAULT_PROJECT_ID);
  const deleteDefect = useDeleteDefect();

  const { data: users } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    },
  });

  // Map TMDefect → Defect shape for the existing DefectTable component
  const defects: Defect[] = tmDefects.map(d => ({
    id: d.id,
    defect_key: d.key,
    title: d.title,
    description: d.description || null,
    severity: (d.severity?.toLowerCase() || 'medium') as Defect['severity'],
    priority: 'medium' as Defect['priority'],
    status: (d.status?.toLowerCase() === 'fixed' ? 'resolved' :
             d.status?.toLowerCase() === 'wont_fix' ? 'closed' :
             d.status?.toLowerCase() === 'duplicate' ? 'closed' :
             d.status?.toLowerCase() === 'verified' ? 'verified' :
             d.status?.toLowerCase() || 'new') as Defect['status'],
    resolution: null,
    assigned_to: d.assigned_to,
    reported_by: d.reported_by || null,
    component: null,
    environment: null,
    affected_version: null,
    fixed_version: null,
    folder_id: null,
    due_date: null,
    steps_to_reproduce: null,
    expected_result: null,
    actual_result: null,
    external_id: d.external_id || null,
    external_url: d.external_url || null,
    resolved_at: null,
    verified_at: null,
    closed_at: null,
    created_at: d.created_at,
    updated_at: d.updated_at,
    jira_key: d.jira_key || null,
    jira_source: !!d.jira_source,
    jira_project_key: d.jira_project_key || null,
    jira_status: d.jira_status || null,
    jira_status_category: null,
    jira_assignee_name: d.assignee?.full_name || null,
    jira_reporter_name: d.reporter?.full_name || null,
    assignee: d.assignee ? { id: d.assignee.id, full_name: d.assignee.full_name, avatar_url: d.assignee.avatar_url || null } : null,
    reporter: d.reporter ? { id: d.reporter.id, full_name: d.reporter.full_name, avatar_url: d.reporter.avatar_url || null } : null,
  }));

  const handleDelete = async (defect: Defect) => {
    if (confirm(`Delete "${defect.defect_key}"? This cannot be undone.`)) {
      await deleteDefect.mutateAsync({ id: defect.id, project_id: DEFAULT_PROJECT_ID });
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Stats bar data
  const statsBar = stats ? {
    total: totalCount,
    open: stats.by_status.OPEN || 0,
    in_progress: stats.by_status.IN_PROGRESS || 0,
    resolved: stats.by_status.FIXED || 0,
    verified: stats.by_status.VERIFIED || 0,
    closed: stats.by_status.CLOSED || 0,
    deferred: 0,
    critical: stats.by_severity.CRITICAL || 0,
    high: stats.by_severity.MAJOR || 0,
    medium: stats.by_severity.MINOR || 0,
    low: stats.by_severity.TRIVIAL || 0,
    unassigned: 0,
    overdue: 0,
  } : null;

  return (
    <div className={cn("flex flex-col h-full", isDark && "bg-[#0A0A0A]")}>
      <TestHubPageHeader title="Defects" subtitle="Track and manage bugs discovered during testing">
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button onClick={() => setShowCreate(true)} className="bg-[#2563EB] text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />Create Defect
        </Button>
      </TestHubPageHeader>
      <div className={cn("p-6 space-y-6 flex-1 overflow-auto", isDark && "bg-[#0A0A0A]")}>

        {/* Stats Bar */}
        {loadingStats ? <Skeleton className="h-12 w-full" /> : statsBar && (
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold">{statsBar.total} Total</span>
            <span>Open: {statsBar.open}</span>
            <span>In Progress: {statsBar.in_progress}</span>
            <span>Resolved: {statsBar.resolved}</span>
            <span>Closed: {statsBar.closed}</span>
          </div>
        )}

        {/* Filters */}
        <DefectFilters filters={filters as any} onChange={setFilters as any} users={users || []} />

        {/* Results Count */}
        <p className="text-sm text-muted-foreground">
          Showing {tmDefects.length} of {totalCount} defects
        </p>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : defects.length === 0 ? (
          <div className={cn("border rounded-lg p-12 text-center", isDark && "border-[#2E2E2E] bg-[#1A1A1A]")}>
            <Bug className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-medium text-foreground mb-1">No defects recorded</p>
            <p className="text-muted-foreground text-sm mb-4">
              {Object.keys(filters).length > 0
                ? 'No defects match your filters'
                : 'Defects will appear here once created or linked to failed test executions.'}
            </p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Defect
            </Button>
          </div>
        ) : (
          <div className={cn("border rounded-lg", isDark && "border-[#2E2E2E]")}>
            <DefectTable defects={defects} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onDelete={handleDelete} />
          </div>
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= totalCount}>Next</Button>
            </div>
          </div>
        )}

        <CreateDefectModalG25 open={showCreate} onClose={() => setShowCreate(false)} />
      </div>
    </div>
  );
}
