/**
 * RoadmapsListPage — /project-hub/:key/roadmaps
 *
 * Lists all filter-derived roadmap views for a project.
 * Layout mirrors FiltersListPage using the canonical CatalystListPageLayout.
 * Data from `filter_derived_views` where type='roadmap', scoped to project key
 * via the source filter's project ownership.
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import Button from '@atlaskit/button/new';
import AkAvatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import {
  CatalystListPageLayout,
  type QuickTab,
  type ToolbarFilter,
  type BulkAction,
} from '@/components/shared/CatalystListPage';
import { relativeFromIso } from '@/components/shared/RelativeTime';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Map as MapIcon, Plus } from '@/lib/atlaskit-icons';

// ── Row type ────────────────────────────────────────────────────────────────

interface RoadmapRow {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  visibility: 'private' | 'org';
  updated_at: string;
  source_filter_id: string;
  filter_name: string | null;
}

// ── Data hook ────────────────────────────────────────────────────────────────

function useRoadmapsForProject(projectKey: string | undefined) {
  return useQuery<RoadmapRow[]>({
    queryKey: ['roadmaps-list', projectKey],
    queryFn: async () => {
      if (!projectKey) return [];
      // Fetch roadmap views for filters belonging to this project key.
      // filter_derived_views.type = 'roadmap', joined to ph_saved_filters for project scoping.
      const { data, error } = await (supabase as any)
        .from('filter_derived_views')
        .select(`
          id,
          title,
          owner_id,
          visibility,
          updated_at,
          source_filter_id,
          profiles:owner_id (full_name, avatar_url),
          ph_saved_filters!source_filter_id (project_key, name, jql_query)
        `)
        .eq('type', 'roadmap')
        .eq('ph_saved_filters.project_key', projectKey)
        .not('ph_saved_filters', 'is', null)
        .order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      // Filter client-side too — PostgREST inner-join semantics aren't enforced by .not('…', 'is', null) on embeds
      const scoped = (data ?? []).filter((r: any) => r.ph_saved_filters?.project_key === projectKey);
      return scoped.map((r: any) => ({
        id: r.id,
        title: r.title,
        owner_id: r.owner_id,
        owner_name: r.profiles?.full_name ?? null,
        owner_avatar: r.profiles?.avatar_url ?? null,
        visibility: r.visibility ?? 'private',
        updated_at: r.updated_at,
        source_filter_id: r.source_filter_id,
        filter_name: r.ph_saved_filters?.name ?? null,
      }));
    },
    enabled: !!projectKey,
    staleTime: 60_000,
  });
}

// ── Tab ids ──────────────────────────────────────────────────────────────────

type TabId = 'all' | 'mine' | 'starred';

const QUICK_TABS: QuickTab[] = [
  { id: 'all',     label: 'All roadmaps' },
  { id: 'mine',    label: 'My roadmaps' },
  { id: 'starred', label: 'Starred' },
];

// ── Visibility label ─────────────────────────────────────────────────────────

function VisibilityLabel({ visibility }: { visibility: 'private' | 'org' }) {
  const label = visibility === 'org' ? 'My organization' : 'Private';
  return (
    <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
      {label}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapsListPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<{ label: string; value: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const { data: allRoadmaps = [], isLoading } = useRoadmapsForProject(projectKey);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // ── Filtering ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allRoadmaps;
    if (activeTab === 'mine' && currentUserId) {
      rows = rows.filter(r => r.owner_id === currentUserId);
    }
    // 'starred' tab: no star data yet — show all until starring is wired
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter(r => r.title.toLowerCase().includes(q));
    if (visibilityFilter) rows = rows.filter(r => r.visibility === visibilityFilter.value);
    // Sort
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey as keyof RoadmapRow] ?? '';
      const bv = b[sortKey as keyof RoadmapRow] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortOrder === 'ASC' ? cmp : -cmp;
    });
    return rows;
  }, [allRoadmaps, activeTab, currentUserId, search, visibilityFilter, sortKey, sortOrder]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo((): Column<RoadmapRow>[] => [
    {
      id: 'title',
      title: 'Name',
      defaultVisible: true,
      sortable: true,
      width: 320,
      renderCell: (row) => (
        <Link
          to={`/project-hub/${projectKey}/roadmaps/${row.id}`}
          style={{
            color: token('color.link'),
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
        >
          {row.title}
        </Link>
      ),
    },
    {
      id: 'owner',
      title: 'Owner',
      defaultVisible: true,
      sortable: false,
      width: 200,
      renderCell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AkAvatar
            size="xsmall"
            src={row.owner_avatar ?? undefined}
            name={row.owner_name ?? undefined}
          />
          <span style={{ fontSize: 13, color: token('color.text') }}>
            {row.owner_name ?? '—'}
          </span>
        </div>
      ),
    },
    {
      id: 'filter_name',
      title: 'Source filter',
      defaultVisible: true,
      sortable: false,
      width: 200,
      renderCell: (row) => (
        <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
          {row.filter_name ?? '—'}
        </span>
      ),
    },
    {
      id: 'visibility',
      title: 'Visibility',
      defaultVisible: true,
      sortable: true,
      width: 160,
      renderCell: (row) => <VisibilityLabel visibility={row.visibility} />,
    },
    {
      id: 'updated_at',
      title: 'Last modified',
      defaultVisible: true,
      sortable: true,
      width: 160,
      renderCell: (row) => (
        <Tooltip content={row.updated_at ? new Date(row.updated_at).toLocaleString() : ''}>
          <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
            {row.updated_at ? relativeFromIso(row.updated_at) : '—'}
          </span>
        </Tooltip>
      ),
    },
  ], [projectKey]);

  // ── Toolbar filters ──────────────────────────────────────────────────────
  const toolbarFilters: ToolbarFilter[] = [
    {
      id: 'visibility',
      placeholder: 'Visibility',
      options: [
        { label: 'Private', value: 'private' },
        { label: 'My organization', value: 'org' },
      ],
      value: visibilityFilter,
      onChange: setVisibilityFilter,
    },
  ];

  const hasActiveFilters = !!visibilityFilter;

  // ── Bulk actions ─────────────────────────────────────────────────────────
  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      isDanger: true,
      onClick: () => {
        // deletion not yet wired — placeholder
        setSelectedIds(new Set());
      },
    },
  ];

  // ── Chrome band ──────────────────────────────────────────────────────────
  const chromeBand = projectKey ? (
    <ProjectHeaderChip projectKey={projectKey} />
  ) : null;

  // ── Create CTA ───────────────────────────────────────────────────────────
  const createCta = (
    <Button
      appearance="primary"
      iconBefore={Plus}
      onClick={() => navigate(`/project-hub/${projectKey}/filters`)}
    >
      Create roadmap
    </Button>
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  const emptyView = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: 16,
        color: token('color.text.subtle'),
      }}
    >
      <MapIcon label="" size="xlarge" />
      <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: token('color.text') }}>
        No roadmaps yet
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        Create a roadmap from any saved filter.
      </p>
      <Button
        appearance="primary"
        onClick={() => navigate(`/project-hub/${projectKey}/filters`)}
      >
        Go to filters
      </Button>
    </div>
  );

  return (
    <CatalystListPageLayout
      chromeBand={chromeBand}
      tabs={QUICK_TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)}
      tabBarActions={createCta}
      search={search}
      searchPlaceholder="Search roadmaps"
      onSearchChange={setSearch}
      toolbarFilters={toolbarFilters}
      hasActiveFilters={hasActiveFilters}
      onClearAllFilters={() => setVisibilityFilter(null)}
      selectedCount={selectedIds.size}
      bulkActions={bulkActions}
      onDeselect={() => setSelectedIds(new Set())}
      footer={`${filtered.length} roadmap${filtered.length === 1 ? '' : 's'}`}
    >
      <JiraTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(key, order) => { setSortKey(key); setSortOrder(order); }}
        emptyView={emptyView}
        enableVirtualization={false}
        enableColumnReorder={true}
        density="comfortable"
        rowsPerPage={0}
        page={1}
      />
    </CatalystListPageLayout>
  );
}
