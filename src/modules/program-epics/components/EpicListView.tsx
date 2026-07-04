/**
 * Program Epic List View
 * Jira-style list view for epics in Program Room, replicating work-hub ListView structure.
 * Uses canonical EpicDetailsPanel drawer when clicking an epic.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, Settings2, Plus, MoreHorizontal, Square,
} from '@/lib/atlaskit-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { catalystToast } from '@/lib/catalystToast';
import CatalystDetailRouter from '@/components/catalyst-detail-views/CatalystDetailRouter';
import {
  JiraTable,
  makeStatusEditCellAkPopup,
  type StatusOption,
  type LozengeAppearance,
  type Column,
  type SortOrder,
} from '@/components/shared/JiraTable';

interface Epic {
  id: string;
  name: string;
  epic_key: string | null;
  description: string | null;
  state: string | null;
  status: string | null;
  health: string | null;
  owner_id: string | null;
  primary_program_id: string | null;
  theme_id: string | null;
  points_estimate: number | null;
  created_at: string | null;
  updated_at: string | null;
  start_date: string | null;
  end_date: string | null;
}

// State options wired into JiraTable's canonical status edit-popup cell.
// appearance follows Atlaskit Lozenge's vocabulary (LozengeAppearance).
const STATE_APPEARANCE: Record<string, LozengeAppearance> = {
  'not_started': 'default',
  'in_progress': 'inprogress',
  'done': 'success',
  'blocked': 'removed',
  'cancelled': 'default',
};

const STATE_LABELS: Record<string, string> = {
  'not_started': 'NOT STARTED',
  'in_progress': 'IN PROGRESS',
  'done': 'DONE',
  'blocked': 'BLOCKED',
  'cancelled': 'CANCELLED',
};

const STATE_OPTIONS: StatusOption[] = Object.keys(STATE_LABELS).map((value) => ({
  value,
  label: STATE_LABELS[value],
  appearance: STATE_APPEARANCE[value],
}));

// Health dot colors — ADS tokens only (no bare hex / Tailwind color utilities).
const HEALTH_DOT_TOKEN: Record<string, string> = {
  'green': token('color.icon.success', 'var(--ds-icon-success)'),
  'yellow': token('color.icon.warning', 'var(--ds-icon-warning)'),
  'red': token('color.icon.danger', 'var(--ds-icon-danger)'),
};

function HealthDot({ health }: { health: string | null }) {
  const dot = HEALTH_DOT_TOKEN[health || 'green'] || HEALTH_DOT_TOKEN['green'];
  return (
    <span
      style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: dot }}
      title={health || 'green'}
    />
  );
}

type SortField = string;
type SortDirection = 'asc' | 'desc';

interface EpicListViewProps {
  programId?: string;
}

export function EpicListView({ programId }: EpicListViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);
  const queryClient = useQueryClient();

  // Check URL for epicId param to auto-open drawer (used when navigating from Business Request links)
  const epicIdFromUrl = searchParams.get('epicId');

  // Fetch epics - show all if programId is actually a portfolio or doesn't exist in programs
  const { data: epics = [], refetch } = useQuery({
    queryKey: ['program-epics', programId],
    queryFn: async () => {
      // Check if programId is a valid program
      if (programId) {
        const { data: programCheck, error: programCheckError } = await supabase
          .from('programs')
          .select('id')
          .eq('id', programId)
          .maybeSingle();
        if (programCheckError) throw programCheckError;

        if (programCheck) {
          // Valid program - filter by primary_program_id
          const { data, error } = await supabase
            .from('epics')
            .select('*')
            .is('deleted_at', null)
            .is('parked_at', null)
            .eq('primary_program_id', programId)
            .order('global_rank');
          if (error) throw error;
          return (data || []) as Epic[];
        }
      }
      
      // No valid program filter - show all epics
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .is('deleted_at', null)
        .is('parked_at', null)
        .order('global_rank');
      if (error) throw error;
      return (data || []) as Epic[];
    },
  });

  // Update state mutation
  const updateStateMutation = useMutation({
    mutationFn: async ({ epicId, state }: { epicId: string; state: string }) => {
      const { error } = await supabase
        .from('epics')
        .update({ state: state as any, updated_at: new Date().toISOString() })
        .eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-epics'] });
      catalystToast.success('State updated');
    },
    onError: () => {
      catalystToast.error('Failed to update state');
    }
  });

  // Auto-open epic drawer if epicId is in URL (from Business Request Links navigation)
  useEffect(() => {
    if (epicIdFromUrl && epics.length > 0) {
      const epic = epics.find(e => e.id === epicIdFromUrl);
      if (epic) {
        setSelectedEpic(epic);
        // Clear the epicId from URL to avoid re-opening on navigation
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('epicId');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [epicIdFromUrl, epics, searchParams, setSearchParams]);

  const handleRowClick = (epic: Epic) => {
    setSelectedEpic(epic);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const filteredItems = epics.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.epic_key || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = sortField
    ? [...filteredItems].sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        if (aValue === null) return 1;
        if (bValue === null) return -1;
        if (typeof aValue === 'object' || typeof bValue === 'object') return 0;
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredItems;

  const columns: Column<Epic>[] = useMemo(() => [
    {
      id: 'epic_key',
      label: 'Epic Number',
      width: 12,
      sortable: true,
      alwaysVisible: true,
      accessor: (row) => row.epic_key,
      cell: ({ row }) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Square style={{ height: 16, width: 16, color: token('color.text.brand', 'var(--ds-text-brand)') }} />
          <span
            style={{
              color: token('color.text.brand', 'var(--ds-text-brand)'),
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: 13,
            }}
          >
            {row.epic_key || '—'}
          </span>
        </span>
      ),
    },
    {
      id: 'name',
      label: 'Name',
      flex: true,
      sortable: true,
      alwaysVisible: true,
      accessor: (row) => row.name,
      cell: ({ row }) => (
        <span style={{ color: token('color.text', 'var(--ds-text)') }}>{row.name}</span>
      ),
    },
    {
      id: 'state',
      label: 'State',
      width: 16,
      sortable: true,
      accessor: (row) => row.state,
      cell: makeStatusEditCellAkPopup<Epic>({
        getStatus: (row) => row.state,
        appearanceFor: (s) => STATE_APPEARANCE[s || 'not_started'] || 'default',
        labelFor: (s) => STATE_LABELS[s || 'not_started'] || (s ?? '—'),
        options: STATE_OPTIONS,
        lockWhenDone: false,
        onChange: (row, next) => updateStateMutation.mutate({ epicId: row.id, state: next }),
      }),
    },
    {
      id: 'health',
      label: 'Health',
      width: 8,
      accessor: (row) => row.health,
      cell: ({ row }) => <HealthDot health={row.health} />,
    },
    {
      id: 'points_estimate',
      label: 'Estimate',
      width: 10,
      sortable: true,
      accessor: (row) => row.points_estimate,
      cell: ({ row }) => (
        <span style={{ color: token('color.text', 'var(--ds-text)') }}>
          {row.points_estimate ? `${row.points_estimate} pts` : '—'}
        </span>
      ),
    },
    {
      id: 'start_date',
      label: 'Start Date',
      width: 12,
      sortable: true,
      accessor: (row) => row.start_date,
      cell: ({ row }) => (
        <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 13 }}>
          {formatDate(row.start_date)}
        </span>
      ),
    },
    {
      id: 'end_date',
      label: 'End Date',
      width: 12,
      sortable: true,
      accessor: (row) => row.end_date,
      cell: ({ row }) => (
        <span style={{ color: token('color.text.subtle', 'var(--ds-text-subtle)'), fontSize: 13 }}>
          {formatDate(row.end_date)}
        </span>
      ),
    },
  ], [updateStateMutation]);

  const sortOrder: SortOrder = sortDirection === 'asc' ? 'ASC' : 'DESC';

  return (
    <div className="h-full flex bg-background" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}>
      {/* Main content area */}
      <div className={cn("flex-1 flex flex-col min-w-0", selectedEpic && "border-r border-border")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search epics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-44 text-sm bg-muted/50 border-transparent rounded focus:border-ring focus:bg-background placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Card container wrapping the table */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
            {/* Table container with horizontal scroll */}
            <div className="flex-1 overflow-auto">
              <JiraTable<Epic>
                columns={columns}
                data={sortedItems}
                getRowId={(row) => row.id}
                onRowClick={handleRowClick}
                selectable
                selection={selectedItems}
                onSelectionChange={setSelectedItems}
                sortKey={sortField ?? undefined}
                sortOrder={sortOrder}
                onSortChange={(key, order) => {
                  setSortField(key);
                  setSortDirection(order === 'ASC' ? 'asc' : 'desc');
                }}
                showRowCount={false}
                density="compact"
                ariaLabel="Program epics"
              />
            </div>

            {/* Footer inside card */}
            <div className="border-t border-border flex items-center justify-between px-4 py-2 bg-card flex-shrink-0">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size > 0
                  ? `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`
                  : `Showing ${sortedItems.length} of ${epics.length} epics`
                }
              </span>
              <button className="inline-flex items-center gap-1 text-[14px] text-brand-primary hover:text-brand-primary-hover font-medium">
                <Plus className="h-4 w-4" />
                Create Epic
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Epic Detail Modal */}
      <CatalystDetailRouter
        itemId={selectedEpic?.id || ''}
        itemType="epic"
        isOpen={!!selectedEpic}
        onClose={() => setSelectedEpic(null)}
      />
    </div>
  );
}

export default EpicListView;
