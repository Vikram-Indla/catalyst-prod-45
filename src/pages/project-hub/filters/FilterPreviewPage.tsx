import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import AkFlag, { FlagGroup } from '@atlaskit/flag';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkWarningIcon from '@atlaskit/icon/core/warning';
import AkInfoIcon from '@atlaskit/icon/core/information';
import Spinner from '@atlaskit/spinner';
import { AtlaskitPageShell } from '@/components/ads';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryInlineEditCell,
  makeStatusEditCell,
  makeParentEditCell,
  makeAssigneeEditCell,
  makeDateCell,
  makeDateEditCell,
  makeRowMenuCell,
  makePriorityEditCell,
} from '@/components/shared/JiraTable';
import type { Column, SortOrder, LozengeAppearance } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { jiraIconType } from '@/components/universal-work-view/uwv.utils';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { resolveAvatarUrl } from '@/lib/avatars';
import { supabase } from '@/integrations/supabase/client';
import {
  FilterChip,
  FilterTriggerAndPopup,
  type FilterState,
  EMPTY_FILTERS,
  FACET_LABELS,
  MORE_FILTERS_FACETS,
  filterStateToJql,
  totalSelected,
  distinctOptions,
  type FacetOption,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory as JiraFilterCategory } from '@/components/shared/JiraBasicFilter';
import type { WorkItem } from '@/types/workItem.types';
import FilterIconCore from '@atlaskit/icon/core/filter';

const SUBTLE = token('color.text.subtle', '#505258');
const FilterIcon = () => <FilterIconCore label="" color={SUBTLE} />;

const ALL_FILTER_STATUSES = [
  'To Do', 'In Requirements', 'In Design', 'Ready for Development',
  'In Development', 'Ready for QA', 'In QA', 'Ready for UAT', 'In UAT',
  'In Production', 'Done', 'Blocked', 'On Hold', 'Closed', 'Cancelled',
  'Backlog', 'In Progress', 'In Review', 'Ready to Implement',
  'Beta Ready',
];

function filterStatusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'closed' || s === 'cancelled') return 'success';
  if (s.includes('progress') || s.includes('development') || s.includes('qa') || s.includes('uat') || s.includes('review') || s.includes('design') || s.includes('requirements')) return 'inprogress';
  if (s === 'blocked') return 'removed';
  if (s === 'on hold') return 'moved';
  return 'default';
}

// Mirrors AllWorkToolbar's TOOLBAR_FACET_TYPES exactly — same type filter drives
// the Work type chip options so FilterPreviewPage shows the same set as AllWork.
const TOOLBAR_FACET_TYPES = ['Story', 'Backend', 'Frontend', 'Sub-task', 'Epic', 'Feature'];

function useProjectFacetItems(projectKey: string | undefined): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-facet-items', projectKey],
    enabled: !!projectKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('ph_issues')
        .select(
          'issue_key, issue_type, status, status_category, assignee_account_id, assignee_display_name, reporter_account_id, reporter_display_name, priority, labels, sprint_release, sprint_name, resolution, severity, parent_key, parent_summary'
        )
        .eq('project_key', projectKey)
        .in('issue_type', TOOLBAR_FACET_TYPES)
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .is('deleted_at', null)
        .limit(5000);
      if (!rows) return [];
      return (rows as any[]).map(
        (r: any): WorkItem =>
          ({
            id: r.issue_key,
            projectId: projectKey!,
            parentId: null,
            parentKey: r.parent_key ?? null,
            parentSummary: r.parent_summary ?? null,
            jiraKey: r.issue_key,
            type: 'task' as any,
            rawType: r.issue_type ?? null,
            summary: '',
            status: 'todo' as any,
            statusName: r.status ?? '',
            statusCategory: (r.status_category ?? 'todo') as any,
            assigneeId: r.assignee_account_id ?? null,
            assignee: r.assignee_display_name
              ? { id: r.assignee_account_id ?? r.assignee_display_name, name: r.assignee_display_name, avatarUrl: null, initials: '', color: '' }
              : undefined,
            reporterId: null,
            reporter: r.reporter_display_name
              ? { id: r.reporter_account_id ?? '', name: r.reporter_display_name }
              : undefined,
            priority: (r.priority ?? 'medium') as any,
            fixVersion: null,
            sprintRelease: Array.isArray(r.sprint_release) && r.sprint_release.length > 0 ? r.sprint_release[0] : null,
            sprintName: r.sprint_name ?? null,
            labels: r.labels ?? [],
            resolution: r.resolution ?? null,
            severity: r.severity ?? null,
            commentsCount: 0,
            childCount: 0,
            createdAt: '',
            updatedAt: '',
            createdBy: null,
          } as any)
      );
    },
  });
  return data;
}

interface Member { id: string; name: string; src: string | null }

function useProjectMembers(projectKey: string | undefined): Member[] {
  const { data = [] } = useQuery<Member[]>({
    queryKey: ['filter-preview-members', projectKey],
    enabled: !!projectKey,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: project } = await (supabase as any)
        .from('projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      if (!project?.id) return [];
      const { data } = await (supabase as any)
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .limit(20);
      return ((data ?? []) as any[]).map((r) => ({
        id: r.profiles?.id ?? r.user_id,
        name: r.profiles?.full_name ?? 'Member',
        src: r.profiles?.avatar_url ?? null,
      }));
    },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Linked entities — scaffolded for future Kanban/board/widget wiring.
// When a saved filter gains dependents (Kanban board, Sprint board, gadget),
// this hook will return them and the impact Flag will show automatically.
// ---------------------------------------------------------------------------
export interface LinkedFilterEntity {
  type: string;   // e.g. "Kanban board", "Sprint board"
  name: string;
  href?: string;
}

function useLinkedEntities(_filterId: string | null): LinkedFilterEntity[] {
  // TODO: query ph_filter_dependents (or equivalent) when the schema exists.
  return [];
}

// ---------------------------------------------------------------------------

export function FilterPreviewPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFilterId = searchParams.get('filterId');

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // When opened from a saved filter, this holds the raw saved JQL and name.
  const [savedFilterJql, setSavedFilterJql] = useState<string | null>(null);
  const [savedFilterName, setSavedFilterName] = useState<string | null>(null);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column picker — mirrors BacklogPage's canonical column-visibility state.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['key', 'status', 'parent', 'assignee'])
  );

  // Column order + widths — localStorage keys scoped to avoid collision with BacklogPage
  const COL_WIDTHS_KEY = `ph-filter-col-widths-v1:${projectKey}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => { try { const r = localStorage.getItem(COL_WIDTHS_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
  );
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

  // Density state — mirrors BacklogPage (default 'compact')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  // Ask Caty inline bar — mirrors BacklogPage's setAskCatyOpen pattern
  const [askCatyOpen, setAskCatyOpen] = useState(false);

  // Save state — isDirty gates the Save button; savedFilterId drives override logic
  const [savedFilterId, setSavedFilterId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Atlaskit Flag notifications
  const [flags, setFlags] = useState<
    Array<{ id: string; type: 'override-warning' | 'impact-entities' }>
  >([]);
  const flagIdRef = useRef(0);
  const addFlag = useCallback((type: 'override-warning' | 'impact-entities') => {
    const id = `flag-${++flagIdRef.current}`;
    setFlags(prev => [...prev, { id, type }]);
    if (type !== 'override-warning') {
      setTimeout(() => setFlags(prev => prev.filter(f => f.id !== id)), 8000);
    }
  }, []);
  const dismissFlag = useCallback(
    (id: string) => setFlags(prev => prev.filter(f => f.id !== id)),
    []
  );

  const linkedEntities = useLinkedEntities(savedFilterId);
  const facetItems = useProjectFacetItems(projectKey);
  const members = useProjectMembers(projectKey);

  // Load saved filter when navigated from FiltersListPage with ?filterId=
  const { data: loadedFilter } = useQuery({
    queryKey: ['ph_saved_filter', urlFilterId],
    enabled: !!urlFilterId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_saved_filters')
        .select('id, name, jql_query, filter_config')
        .eq('id', urlFilterId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Seed savedFilterId, JQL, and name once the filter row arrives.
  useEffect(() => {
    if (!loadedFilter) return;
    setSavedFilterId(loadedFilter.id);
    setSavedFilterName(loadedFilter.name ?? null);
    setSavedFilterJql(loadedFilter.jql_query ?? null);
    // Restore chip state if filter_config has FilterState shape (workType/status/assignee).
    const cfg = loadedFilter.filter_config;
    if (cfg && typeof cfg === 'object' && ('workType' in cfg || 'status' in cfg || 'assignee' in cfg)) {
      setFilters({ ...EMPTY_FILTERS, ...(cfg as Partial<FilterState>) });
    }
  }, [loadedFilter]);

  const facetOptions = useMemo(() => {
    const ALL_FACETS = ['workType', 'status', 'assignee', ...MORE_FILTERS_FACETS] as const;
    const out: Record<string, FacetOption[]> = {};
    for (const f of ALL_FACETS) out[f] = distinctOptions(facetItems, f as any);
    return out;
  }, [facetItems]);

  // When a saved filter is loaded via ?filterId=, use its stored JQL directly.
  // Otherwise derive JQL from the chip state.
  const jql = useMemo(
    () => savedFilterJql ?? filterStateToJql(filters, projectKey),
    [savedFilterJql, filters, projectKey]
  );

  const { data, isLoading, isFetching } = useJqlResults(jql);

  const items = useMemo(() => {
    const rows = [...(data?.items ?? [])];
    const dir = sortOrder === 'ASC' ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      return rows.filter(r => r.summary.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
    }
    return rows;
  }, [data?.items, sortKey, sortOrder, search]);

  const totalCount = totalSelected(filters);
  const moreCount = MORE_FILTERS_FACETS.reduce((n, f) => n + filters[f].length, 0);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const updateFacet = (facet: string, next: string[]) => {
    setFilters(prev => ({ ...prev, [facet]: next }));
    setSavedFilterJql(null); // switch to chip-driven JQL once user modifies
    markDirty();
  };

  const toggleValue = (facet: string, value: string) => {
    const cur = filters[facet as keyof FilterState];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    updateFacet(facet, next);
  };

  const openDetail = (key: string) =>
    useGlobalSearchStore.getState().openDetail({ id: key });

  const avatarData = members.map((m) => ({ key: m.id, name: m.name, src: m.src ?? undefined }));

  // ── Save handlers ──────────────────────────────────────────────────────────

  const handleSaveClick = () => {
    if (savedFilterId) {
      // Filter was previously saved — show override warning first
      addFlag('override-warning');
    } else {
      setSaveOpen(true);
    }
  };

  const handleConfirmOverride = useCallback(() => {
    // User confirmed the override — dismiss the warning flag and open modal
    setFlags(prev => prev.filter(f => f.type !== 'override-warning'));
    setSaveOpen(true);
  }, []);

  const handleSaved = useCallback(
    (id: string) => {
      setSaveOpen(false);
      setSavedFilterId(id);
      setIsDirty(false);
      if (linkedEntities.length > 0) addFlag('impact-entities');
      navigate(`/project-hub/${projectKey}/filters`);
    },
    [linkedEntities, addFlag, navigate, projectKey]
  );

  // ── Column definitions — mirrors BacklogPage.atlaskit.tsx canonical structure
  // JqlResultRow is read-only (no mutation), so edit cells use canEdit:()=>false.

  const columns = useMemo<Column<JqlResultRow>[]>(() => {
    const keyCellRenderer = makeKeyCell(
      (r: JqlResultRow) => r.key,
      (r: JqlResultRow) => openDetail(r.key),
      undefined,
      (r: JqlResultRow) => <JiraIssueTypeIcon type={jiraIconType(r.issueType)} size={16} />,
    );
    const summaryCellRenderer = makeSummaryInlineEditCell<JqlResultRow>({
      getSummary: (r) => r.summary,
      canEdit: () => false,
      onChange: () => {},
    });

    return [
      {
        id: 'key',
        label: 'Work',
        flex: true,
        sortable: true,
        alwaysVisible: true,
        defaultVisible: true,
        accessor: (r) => r.key,
        cell: function WorkCell(props: any) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
              {keyCellRenderer(props)}
              <span style={{ flex: 1, minWidth: 0 }}>{summaryCellRenderer(props)}</span>
            </span>
          );
        },
      },
      {
        id: 'parent',
        label: 'Parent',
        width: 11,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.parentKey ?? '',
        cell: makeParentEditCell<JqlResultRow>({
          getParent: (r) => r.parentKey
            ? {
                id: r.parentKey,
                key: r.parentKey,
                label: r.parentSummary ?? r.parentKey,
                icon: <JiraIssueTypeIcon type="Story" size={16} />,
              }
            : null,
          options: [],
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'status',
        label: 'Status',
        width: 15,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.status,
        cell: makeStatusEditCell<JqlResultRow>({
          getStatus: (r) => r.status,
          options: ALL_FILTER_STATUSES,
          appearanceFor: (s) => filterStatusAppearance(s) as LozengeAppearance,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 11,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.assigneeName ?? '',
        cell: makeAssigneeEditCell<JqlResultRow>({
          getAssignee: (r) => r.assigneeName
            ? { id: r.assigneeName, name: r.assigneeName, avatarUrl: resolveAvatarUrl(r.assigneeName) }
            : null,
          options: [],
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 6,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.priority ?? '',
        cell: makePriorityEditCell<JqlResultRow>({
          getPriority: (r) => r.priority,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'due_date',
        label: 'Due date',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.dueDate ?? '',
        cell: makeDateEditCell<JqlResultRow>({
          getDate: (r) => r.dueDate,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'created',
        label: 'Created',
        width: 8,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.created ?? '',
        cell: makeDateCell((r: JqlResultRow) => r.created),
      },
      {
        id: 'updated',
        label: 'Updated',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.updated ?? '',
        cell: makeDateCell((r: JqlResultRow) => r.updated),
      },
      {
        id: '__actions',
        label: '',
        width: 5,
        sortable: false,
        alwaysVisible: true,
        cell: makeRowMenuCell({
          onOpen: (r: JqlResultRow) => openDetail(r.key),
        }),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AtlaskitPageShell
      flush
      chromeBand={
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 653,
            color: token('color.text', '#172B4D'),
            lineHeight: '24px',
          }}
        >
          {savedFilterName ?? 'Create filter'}
        </h1>
      }
    >
      {/* Ask Caty inline bar — replaces toolbar row when open (mirrors BacklogPage) */}
      {askCatyOpen && (
        <AskCatyInlineBar
          projectKey={projectKey ?? null}
          onClose={() => setAskCatyOpen(false)}
        />
      )}

      {/* Toolbar — hidden when Caty bar is open, same as BacklogPage pattern */}
      <div
        style={{
          display: askCatyOpen ? 'none' : 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '32px 24px',
          flexShrink: 0,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          flexWrap: 'nowrap',
          overflow: 'visible',
        }}
      >
        <AIIntelligenceButton
          label="Ask Caty"
          onClick={() => setAskCatyOpen(true)}
          tooltip="Ask Caty about these results"
        />

        <div style={{ flex: 1, minWidth: 240, maxWidth: 640 }}>
          <Textfield
            isCompact
            placeholder="Search list"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              markDirty();
            }}
            elemBeforeInput={
              <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                <AkSearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={
              search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#6B778C'), padding: '0 8px 0 4px' }}
                >
                  <AkCloseIcon label="" size="small" />
                </button>
              ) : undefined
            }
          />
        </div>

        <FilterChip
          label={FACET_LABELS.workType}
          facet="workType"
          options={facetOptions.workType ?? []}
          selected={filters.workType}
          onToggle={v => toggleValue('workType', v)}
          onClear={() => updateFacet('workType', [])}
          isOpen={openChipKey === 'workType'}
          onOpenChange={open => setOpenChipKey(open ? 'workType' : null)}
          headline="Type = (equals)"
        />
        <FilterChip
          label={FACET_LABELS.status}
          facet="status"
          options={facetOptions.status ?? []}
          selected={filters.status}
          onToggle={v => toggleValue('status', v)}
          onClear={() => updateFacet('status', [])}
          isOpen={openChipKey === 'status'}
          onOpenChange={open => setOpenChipKey(open ? 'status' : null)}
          headline="Status = (equals)"
        />
        <FilterChip
          label={FACET_LABELS.assignee}
          facet="assignee"
          options={facetOptions.assignee ?? []}
          selected={filters.assignee}
          onToggle={v => toggleValue('assignee', v)}
          onClear={() => updateFacet('assignee', [])}
          isOpen={openChipKey === 'assignee'}
          onOpenChange={open => setOpenChipKey(open ? 'assignee' : null)}
          headline="Assignee = (equals)"
        />
        <FilterTriggerAndPopup
          triggerLabel={`More filters${moreCount > 0 ? ` (${moreCount})` : ''}`}
          isOpen={openChipKey === 'more'}
          onOpenChange={open => setOpenChipKey(open ? 'more' : null)}
          FilterIcon={FilterIcon}
          renderContent={() => {
            const categories: JiraFilterCategory[] = MORE_FILTERS_FACETS.map(f => ({
              id: f,
              label: FACET_LABELS[f],
              options: (facetOptions[f] ?? []).map(o => ({ id: o.value, label: o.label })),
            }));
            const selected: Record<string, string[]> = {};
            for (const f of MORE_FILTERS_FACETS) selected[f] = filters[f];
            return (
              <JiraBasicFilter
                categories={categories}
                selected={selected}
                onSelectionChange={(categoryId, optionIds) => updateFacet(categoryId, optionIds)}
                onClearAll={() => {
                  const next = { ...filters };
                  for (const f of MORE_FILTERS_FACETS) next[f] = [];
                  setFilters(next);
                  markDirty();
                }}
                onClose={() => setOpenChipKey(null)}
              />
            );
          }}
        />

        {totalCount > 0 && (
          <Button
            appearance="subtle"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              markDirty();
            }}
          >
            Clear filters
          </Button>
        )}

        {avatarData.length > 0 && (
          <AvatarGroup
            appearance="stack"
            size="small"
            maxCount={4}
            label="Assignees"
            data={avatarData}
            onAvatarClick={(_, member) => {
              const id = (member as any).key as string;
              toggleValue('assignee', id);
            }}
          />
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 8px', color: token('color.text.subtlest', '#626F86'), fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {isFetching && <Spinner size="small" />}
          {!isFetching && data != null && `${data.totalCount} item${data.totalCount === 1 ? '' : 's'}`}
        </div>

        {/* Save button — disabled until user touches any filter or search */}
        <Button appearance="primary" isDisabled={!isDirty} onClick={handleSaveClick}>
          Save filter
        </Button>
      </div>

      {/* Table — same container pattern as BacklogPage (padding:24px on wrapper) */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px' }}>
          <JiraTable<JqlResultRow>
            columns={columns}
            data={items}
            getRowId={r => r.id}
            onRowClick={r => openDetail(r.key)}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
            isLoading={isLoading}
            density={density}
            ariaLabel="Filter preview"
            rowsPerPage={0}
            page={1}
            totalRowCount={data?.totalCount}
            enableVirtualization
            enableColumnReorder
            columnOrder={columnOrder ?? undefined}
            onColumnOrderChange={(next) => setColumnOrder(next)}
            initialColumnWidths={columnWidths}
            onColumnWidthsChange={(widths) => {
              setColumnWidths(widths);
              try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)); } catch { /* quota */ }
            }}
            stickyCreateFooter={{ onRefresh: () => {} }}
            columnVisibility={visibleColumns}
            onColumnVisibilityChange={setVisibleColumns}
            contextMenuActions={[]}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyView={
              <div style={{ padding: '32px 24px', textAlign: 'center', color: token('color.text.subtle'), fontSize: 14 }}>
                No work items match this filter. Adjust the criteria above.
              </div>
            }
          />
        </div>
      </div>

      {/* Save modal */}
      {saveOpen && (
        <FilterSaveModal
          filter={savedFilterId ? ({ id: savedFilterId } as any) : undefined}
          initialJql={jql}
          initialName={savedFilterId ? undefined : 'Untitled filter'}
          onClose={() => setSaveOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Atlaskit Flag notifications — override warning + impact alert */}
      <FlagGroup onDismissed={id => dismissFlag(id as string)}>
        {flags.map(flag => {
          if (flag.type === 'override-warning') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="warning"
                icon={<AkWarningIcon label="Warning" color={token('color.icon.warning', '#974F0C')} />}
                title="Override existing filter?"
                description="You are about to save changes over the existing saved filter. This cannot be undone."
                actions={[
                  { content: 'Yes, override', onClick: handleConfirmOverride },
                  { content: 'Cancel', onClick: () => dismissFlag(flag.id) },
                ]}
              />
            );
          }
          if (flag.type === 'impact-entities') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="info"
                icon={<AkInfoIcon label="Info" color={token('color.icon.information', '#1868DB')} />}
                title="Filter saved — linked views updated"
                description={
                  linkedEntities.length > 0
                    ? `This filter is used by: ${linkedEntities.map(e => `${e.type} "${e.name}"`).join(', ')}. Those views will reflect your changes.`
                    : 'Filter saved successfully.'
                }
                actions={[{ content: 'Dismiss', onClick: () => dismissFlag(flag.id) }]}
              />
            );
          }
          return null;
        })}
      </FlagGroup>
    </AtlaskitPageShell>
  );
}
