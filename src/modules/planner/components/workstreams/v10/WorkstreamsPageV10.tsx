// ============================================================
// WORKSTREAMS V10 MAIN PAGE
// Integrates all V10 components into unified view
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ViewMode, HealthFilter, LeadFilter, WorkstreamDataV10 } from './types';
import { SkeletonLoader } from './SkeletonLoader';
import { SummaryBar } from './SummaryBar';
import { Toolbar } from './Toolbar';
import { ListView } from './ListView';
import { GridCard } from './GridCard';
import { DetailDrawer } from './DetailDrawer';
import { CreateModal } from './CreateModal';
import { EditModal } from './EditModal';
import { EmptyState } from './EmptyState';
import {
  useWorkstreamsV10,
  useWorkstreamsSummaryV10,
  useWorkstreamActivities,
  useCreateWorkstreamV10,
  useUpdateWorkstreamV10,
  useArchiveWorkstreamV10,
  useDeleteWorkstreamV10,
  useAvailableMembersV10,
} from './useWorkstreamsV10';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface WorkstreamsPageV10Props {
  className?: string;
}

export function WorkstreamsPageV10({ className }: WorkstreamsPageV10Props) {
  // =========================
  // STATE
  // =========================
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [leadFilter, setLeadFilter] = useState<LeadFilter>('all');
  const [showMyWorkstreams, setShowMyWorkstreams] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailWorkstream, setDetailWorkstream] = useState<WorkstreamDataV10 | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editWorkstream, setEditWorkstream] = useState<WorkstreamDataV10 | null>(null);

  // =========================
  // DATA
  // =========================
  const { data: workstreams, isLoading, error } = useWorkstreamsV10();
  const summary = useWorkstreamsSummaryV10(workstreams);
  const { data: activities = [] } = useWorkstreamActivities(detailWorkstream?.id || null);
  const { data: availableMembers = [] } = useAvailableMembersV10();

  // =========================
  // MUTATIONS
  // =========================
  const createMutation = useCreateWorkstreamV10();
  const updateMutation = useUpdateWorkstreamV10();
  const archiveMutation = useArchiveWorkstreamV10();
  const deleteMutation = useDeleteWorkstreamV10();

  // =========================
  // FILTERING
  // =========================
  const filteredWorkstreams = (workstreams || []).filter((ws) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!ws.name.toLowerCase().includes(q) && !ws.code.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Health filter
    if (healthFilter !== 'all' && ws.health !== healthFilter) {
      return false;
    }
    // Lead filter
    if (leadFilter !== 'all') {
      if (leadFilter === 'unassigned' && ws.lead !== null) return false;
      if (leadFilter !== 'unassigned' && ws.lead?.user_id !== leadFilter) return false;
    }
    return true;
  });

  // Get unique leads for filter dropdown
  const leads = (workstreams || [])
    .filter((ws) => ws.lead)
    .map((ws) => ({ id: ws.lead!.user_id, name: ws.lead!.full_name || 'Unknown' }))
    .filter((lead, i, arr) => arr.findIndex((l) => l.id === lead.id) === i);

  // =========================
  // HANDLERS
  // =========================
  const handleSummaryFilter = useCallback((filter: HealthFilter) => {
    setHealthFilter(filter === healthFilter ? 'all' : filter);
  }, [healthFilter]);

  const handleRowClick = useCallback((ws: WorkstreamDataV10) => {
    setDetailWorkstream(ws);
  }, []);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  const handleCreate = useCallback(
    (data: { name: string; description: string; color: string; members: { user_id: string; role: 'lead' | 'member' }[] }) => {
      createMutation.mutate(data, {
        onSuccess: () => setShowCreateModal(false),
      });
    },
    [createMutation]
  );

  const handleUpdate = useCallback(
    (data: { name: string; description: string; color: string; members: { user_id: string; role: 'lead' | 'member' }[] }) => {
      if (!editWorkstream) return;
      updateMutation.mutate(
        { id: editWorkstream.id, data },
        {
          onSuccess: () => {
            setEditWorkstream(null);
            if (detailWorkstream?.id === editWorkstream.id) {
              setDetailWorkstream(null);
            }
          },
        }
      );
    },
    [editWorkstream, updateMutation, detailWorkstream]
  );

  const handleArchive = useCallback(() => {
    if (!editWorkstream) return;
    archiveMutation.mutate(editWorkstream.id, {
      onSuccess: () => {
        setEditWorkstream(null);
        setDetailWorkstream(null);
      },
    });
  }, [editWorkstream, archiveMutation]);

  const handleDelete = useCallback(() => {
    if (!editWorkstream) return;
    deleteMutation.mutate(editWorkstream.id, {
      onSuccess: () => {
        setEditWorkstream(null);
        setDetailWorkstream(null);
      },
    });
  }, [editWorkstream, deleteMutation]);

  // =========================
  // KEYBOARD SHORTCUTS
  // =========================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key === 'Escape') {
        if (editWorkstream) setEditWorkstream(null);
        else if (showCreateModal) setShowCreateModal(false);
        else if (detailWorkstream) setDetailWorkstream(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editWorkstream, showCreateModal, detailWorkstream]);

  // =========================
  // RENDER
  // =========================
  if (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[Workstreams V10] Error loading workstreams:', error);
    return (
      <div className={cn('p-6', className)}>
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load workstreams</p>
          <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Summary Bar */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <SkeletonLoader variant="summary" />
        ) : (
          <SummaryBar
            summary={summary}
            activeFilter={healthFilter}
            onFilterChange={handleSummaryFilter}
          />
        )}

        {/* Toolbar */}
        <Toolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          healthFilter={healthFilter}
          onHealthFilterChange={setHealthFilter}
          leadFilter={leadFilter}
          onLeadFilterChange={setLeadFilter}
          availableLeads={leads}
          showMyWorkstreams={showMyWorkstreams}
          onMyWorkstreamsToggle={() => setShowMyWorkstreams(!showMyWorkstreams)}
          totalCount={filteredWorkstreams.length}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          viewMode === 'list' ? (
            <SkeletonLoader variant="list" count={5} />
          ) : (
            <SkeletonLoader variant="grid" count={6} />
          )
        ) : filteredWorkstreams.length === 0 ? (
          <EmptyState
            type={searchQuery || healthFilter !== 'all' ? 'no-results' : 'no-workstreams'}
            searchQuery={searchQuery}
            hasFilters={healthFilter !== 'all' || leadFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setHealthFilter('all');
              setLeadFilter('all');
            }}
            onCreateWorkstream={() => setShowCreateModal(true)}
          />
        ) : viewMode === 'list' ? (
          <ListView
            workstreams={filteredWorkstreams}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onWorkstreamClick={handleRowClick}
            onEdit={(id) => {
              const ws = workstreams?.find(w => w.id === id);
              if (ws) setEditWorkstream(ws);
            }}
            onViewTasks={(id) => {
              // Navigate to task list with workstream filter
              window.location.href = `/planner/task-list?workstream=${id}`;
            }}
            onArchive={(id) => {
              archiveMutation.mutate(id);
            }}
            onRequestAccess={() => {}}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkstreams.map((ws) => (
              <GridCard
                key={ws.id}
                workstream={ws}
                isSelected={selectedIds.has(ws.id)}
                onClick={() => handleRowClick(ws)}
                onDoubleClick={() => setEditWorkstream(ws)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create button (floating) */}
      <Button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 h-12 px-5 rounded-full shadow-lg gap-2"
      >
        <Plus className="w-5 h-5" />
        New Workstream
      </Button>

      {/* Detail Drawer */}
      <DetailDrawer
        workstream={detailWorkstream}
        activities={activities}
        isOpen={!!detailWorkstream}
        onClose={() => setDetailWorkstream(null)}
        onEdit={() => {
          setEditWorkstream(detailWorkstream);
          setDetailWorkstream(null);
        }}
        onAddMember={() => {
          setEditWorkstream(detailWorkstream);
          setDetailWorkstream(null);
        }}
      />

      {/* Create Modal */}
      <CreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        availableMembers={availableMembers}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Modal */}
      <EditModal
        workstream={editWorkstream}
        isOpen={!!editWorkstream}
        onClose={() => setEditWorkstream(null)}
        onSave={handleUpdate}
        onArchive={handleArchive}
        onDelete={handleDelete}
        availableMembers={availableMembers}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}

export default WorkstreamsPageV10;
