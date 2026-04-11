/**
 * Defects List Page — Rewired to tm_defects via useDefects hook
 * Route: /testhub/defects
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Bug, Plus, Download, List, LayoutGrid, Settings2 } from 'lucide-react';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDefects, useDeleteDefect } from '@/hooks/test-management/useDefects';
import { DefectFilters } from '@/components/defects/g25/DefectFilters';
import { DefectTable } from '@/components/defects/g25/DefectTable';
import { CreateDefectModalG25 } from '@/components/defects/g25/CreateDefectModal';
import { DefectFilters as TMDefectFilters } from '@/types/test-management';
import { Defect } from '@/types/defects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

type ColumnKey = 'SEVERITY' | 'PRIORITY' | 'STATUS' | 'ASSIGNEE' | 'AGE';

const ALL_COLUMNS: { key: ColumnKey; label: string; locked?: boolean }[] = [
  { key: 'SEVERITY', label: 'Severity' },
  { key: 'PRIORITY', label: 'Priority' },
  { key: 'STATUS', label: 'Status' },
  { key: 'ASSIGNEE', label: 'Assignee' },
  { key: 'AGE', label: 'Age' },
];

export default function DefectsPage() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    const searchParam = searchParams.get('search');
    return searchParam ? { search: searchParam } : {};
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(['SEVERITY', 'PRIORITY', 'STATUS', 'ASSIGNEE', 'AGE'])
  );
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

  const deleteDefect = useDeleteDefect();

  const { data: projects } = useQuery({
    queryKey: ['projects-list-for-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name, key').order('name');
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');
      return data || [];
    },
  });

  // Map TMDefect → Defect shape for the existing DefectTable component
  const defects: Defect[] = tmDefects.map(d => {
    const isJira = !!(d as any).jira_source;
    const jiraKey = (d as any).jira_key as string | null;
    const jiraAssigneeName = (d as any).jira_assignee_name as string | null;

    return {
      id: d.id,
      defect_key: d.key,
      title: d.title,
      description: d.description || null,
      severity: (d.severity?.toLowerCase() || 'medium') as Defect['severity'],
      priority: (((d as any).priority as string)?.toLowerCase() || null) as Defect['priority'],
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
      jira_key: jiraKey,
      jira_source: isJira,
      jira_project_key: (d as any).jira_project_key || null,
      jira_status: (d as any).jira_status || null,
      jira_status_category: null,
      jira_assignee_name: jiraAssigneeName,
      jira_reporter_name: d.reporter?.full_name || null,
      assignee: d.assignee ? { id: d.assignee.id, full_name: d.assignee.full_name, avatar_url: d.assignee.avatar_url || null } : null,
      reporter: d.reporter ? { id: d.reporter.id, full_name: d.reporter.full_name, avatar_url: d.reporter.avatar_url || null } : null,
      source_test_case_id: (d as any).source_test_case_id || null,
      source_test_run_id: (d as any).source_test_run_id || null,
      source_test_plan_id: (d as any).source_test_plan_id || null,
      parent_key: (d as any).jira_parent_key || (d as any).epic_link || null,
      // Source-aware display fields
      displayKey: isJira && jiraKey ? jiraKey : d.key,
      isJiraSource: isJira,
      assigneeName: isJira
        ? (jiraAssigneeName ?? 'Unassigned')
        : (d.assignee?.full_name ?? 'Unassigned'),
    };
  });

  const handleDelete = async (defect: Defect) => {
    if (confirm(`Delete "${defect.defect_key}"? This cannot be undone.`)) {
      await deleteDefect.mutateAsync({ id: defect.id, project_id: DEFAULT_PROJECT_ID });
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setVisibleColumns(next);
  };

  const totalPages = Math.ceil(totalCount / pageSize);



  return (
    <div className={cn("flex flex-col h-full", isDark && "bg-[#0A0A0A]")}>
      {/* Row 1 — Page header */}
      <TestHubPageHeader title="Defects" subtitle="Track and manage bugs discovered during testing">
        {/* View toggle */}
        <div className="flex gap-0.5 border border-slate-200 rounded-md p-0.5 bg-white">
          <button
            className={cn(
              'h-7 w-7 rounded flex items-center justify-center transition-colors',
              viewMode === 'list' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:bg-slate-900/[0.06]'
            )}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            className={cn(
              'h-7 w-7 rounded flex items-center justify-center transition-colors',
              viewMode === 'board' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:bg-slate-900/[0.06]'
            )}
            onClick={() => {
              toast({ title: 'Board view coming soon', description: 'This feature is under development.' });
            }}
            title="Board view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />Create Defect
        </Button>
      </TestHubPageHeader>

      <div className={cn("p-6 space-y-4 flex-1 overflow-auto", isDark && "bg-[#0A0A0A]")}>
        {/* Filters + results count + column configurator */}
        <div className="flex items-center justify-between gap-4">
          <DefectFilters filters={filters as any} onChange={setFilters as any} users={users || []} projects={projects || []} />
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[13px] text-slate-500">
              Showing {tmDefects.length} of {totalCount.toLocaleString()}
            </span>
            {/* Column configurator */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-900/[0.06] transition-colors"
                  title="Configure columns"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[200px] p-0 bg-white">
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  Columns
                </div>
                {/* Locked columns */}
                <div className="px-3 py-1.5 flex items-center gap-2 opacity-50">
                  <Checkbox checked disabled className="h-3.5 w-3.5" />
                  <span className="text-[13px] text-slate-500">Key</span>
                </div>
                <div className="px-3 py-1.5 flex items-center gap-2 opacity-50">
                  <Checkbox checked disabled className="h-3.5 w-3.5" />
                  <span className="text-[13px] text-slate-500">Title</span>
                </div>
                {/* Toggleable columns */}
                {ALL_COLUMNS.map(col => (
                  <div
                    key={col.key}
                    className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleColumn(col.key)}
                  >
                    <Checkbox checked={visibleColumns.has(col.key)} className="h-3.5 w-3.5" />
                    <span className="text-[13px] text-slate-900">{col.label}</span>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

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
          <div className={cn("border rounded-lg overflow-hidden", isDark && "border-[#2E2E2E]")}>
            <DefectTable
              defects={defects}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onDelete={handleDelete}
              visibleColumns={visibleColumns}
            />
          </div>
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-[13px] text-slate-500">
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
