import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DefectListHeader } from './DefectListHeader';
import { DefectFilterBar } from './DefectFilterBar';
import { DefectTable } from './DefectTable';
import { DefectBulkActionBar } from './DefectBulkActionBar';
import { useDefectFilters } from '@/hooks/useDefectFilters';
import { useDefectSelection } from '@/hooks/useDefectSelection';
import { useDefectKeyboard } from '@/hooks/useDefectKeyboard';
import { useDefectViews } from '@/hooks/useDefectViews';
import { supabase } from '@/integrations/supabase/client';
import type { DefectSummary, DefectStatus } from '@/types/defect.types';

interface DefectListViewProps {
  projectId: string;
}

export function DefectListView({ projectId }: DefectListViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, setShowCreateView] = useState(false);

  const {
    filters,
    addFilter,
    setFilters,
    clearFilters,
    setSearch,
  } = useDefectFilters();

  const selection = useDefectSelection();
  const { views, activeViewId, selectView } = useDefectViews(projectId);

  // Fetch defects
  const { data, isLoading } = useQuery({
    queryKey: ['defects', projectId, filters],
    queryFn: async () => {
      let query = supabase
        .from('defects')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId);

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,defect_id.ilike.%${filters.search}%`);
      }
      if (filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }
      if (filters.severities.length > 0) {
        query = query.in('severity', filters.severities);
      }

      query = query.range((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { data: data || [], pagination: { total: count || 0 } };
    },
  });

  // Transform API response to DefectSummary format
  const defects: DefectSummary[] = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((d: any) => ({
      id: d.id,
      defect_id: d.defect_id || `DEF-${d.id.slice(0, 4).toUpperCase()}`,
      title: d.title,
      severity: d.severity || 'medium',
      priority: d.priority || 'medium',
      status: d.status || 'new',
      component: d.component,
      is_blocker: d.is_blocker || false,
      is_regression: d.is_regression || false,
      tags: d.tags || [],
      created_at: d.created_at,
      updated_at: d.updated_at,
      due_date: d.due_date || null,
      reporter: d.reporter || null,
      assignee: d.assignee || null,
      release: d.release || null,
      comments_count: d.comments_count || 0,
      attachments_count: d.attachments_count || 0,
    }));
  }, [data]);

  const totalCount = data?.pagination?.total || defects.length;

  // Keyboard navigation
  const { focusIndex } = useDefectKeyboard({
    defects,
    selection,
    onOpen: (id) => navigate(`/defects/${id}`),
    onCreate: () => navigate('/defects/new'),
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DefectStatus }) => {
      const { error } = await supabase
        .from('defects')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['defects', projectId] });
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Handlers
  const handleRowClick = useCallback((id: string) => {
    navigate(`/defects/${id}`);
  }, [navigate]);

  const handleStatusChange = useCallback((id: string, status: DefectStatus) => {
    statusMutation.mutate({ id, status });
  }, [statusMutation]);

  const handleViewChange = useCallback((viewId: string) => {
    selectView(viewId);
    const view = views.find(v => v.id === viewId);
    if (view) {
      clearFilters();
      if (view.filters.statuses) {
        view.filters.statuses.forEach(s => addFilter('status', s));
      }
      if (view.filters.severities) {
        view.filters.severities.forEach(s => addFilter('severity', s));
      }
    }
  }, [selectView, views, clearFilters, addFilter]);

  const handleExport = useCallback(() => {
    toast.info('Export functionality coming soon');
  }, []);

  const defectCounts = useMemo(() => ({
    all: totalCount,
    open: defects.filter(d => ['new', 'triaged', 'in_progress', 'reopened'].includes(d.status)).length,
    critical: defects.filter(d => d.severity === 'critical').length,
  }), [defects, totalCount]);

  return (
    <div className="h-full flex flex-col bg-background">
      <DefectListHeader
        views={views}
        activeViewId={activeViewId}
        onViewChange={handleViewChange}
        onCreateView={() => setShowCreateView(true)}
        onCreateDefect={() => navigate('/defects/new')}
        onExport={handleExport}
        filters={filters}
        defectCounts={defectCounts}
      />

      <DefectFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onFilterAdd={setFilters}
        onFilterRemove={(type) => setFilters(type, [])}
        onClearAll={clearFilters}
      />

      <div className="flex-1 overflow-auto p-4">
        <DefectTable
          defects={defects}
          isLoading={isLoading}
          selectedIds={selection.selectedIds}
          focusIndex={focusIndex}
          onToggleSelect={selection.toggle}
          onSelectAll={selection.selectAll}
          onRowClick={handleRowClick}
          onStatusChange={handleStatusChange}
        />

        {!isLoading && defects.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {defects.length} of {totalCount} defects
          </div>
        )}
      </div>

      <DefectBulkActionBar
        selectedCount={selection.count}
        onChangeStatus={() => toast.info('Bulk status change coming soon')}
        onAssign={() => toast.info('Bulk assign coming soon')}
        onClose={() => selection.clear()}
      />

      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex items-center gap-4 bg-muted/30">
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">J</kbd>/<kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">K</kbd> Navigate</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">X</kbd> Select</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> Open</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd> Search</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">C</kbd> Create</span>
      </div>
    </div>
  );
}
