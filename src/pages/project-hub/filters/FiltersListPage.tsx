/**
 * FiltersListPage — /project-hub/:key/filters · /product-hub/:key/filters
 *
 * Jira-parity Filters directory. Lists every filter visible to the user in
 * the canonical JiraTable (the same table primitive as the project backlog),
 * with star / owner / viewers / editors / starred-by / last-used columns and
 * the kebab actions menu (subscribe, copy, change owner, delete).
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import AkAvatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import { useFiltersForProject, useStarFilter, type SavedFilterFull } from '@/hooks/workhub/useSavedFilters';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { Star, StarOff, Plus, Search } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';

export type HubType = 'project' | 'product';

interface FiltersListPageProps {
  hubType?: HubType;
}

type TabId = 'my' | 'starred' | 'shared' | 'recent';

function ViewersChip({ config }: { config: SavedFilterFull['viewers_config'] }) {
  if (config.type === 'private') {
    return <span data-cp-lozenge-jira-parity><Lozenge>Private</Lozenge></span>;
  }
  if (config.type === 'org') {
    return <span data-cp-lozenge-jira-parity><Lozenge appearance="inprogress">Organisation</Lozenge></span>;
  }
  return <span data-cp-lozenge-jira-parity><Lozenge>{config.user_ids?.length ?? 0} people</Lozenge></span>;
}

function EditorsChip({ config }: { config: SavedFilterFull['editors_config'] }) {
  const label = config?.type === 'owner_only' ? 'Owner only' : `${config?.user_ids?.length ?? 0} people`;
  return <span data-cp-lozenge-jira-parity><Lozenge>{label}</Lozenge></span>;
}

function relativeDay(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day',
  );
}

export default function FiltersListPage({ hubType = 'project' }: FiltersListPageProps) {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('my');
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const createHref = projectKey
    ? `/project-hub/${projectKey}/filters/create`
    : `/project-hub/filters/create`;

  // H7 P2 — keyboard shortcut: press N to open Create filter (Jira pattern)
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === 'n' &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !(e.target as HTMLElement).matches('input, textarea, [contenteditable]')
      ) {
        navigate(createHref);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [navigate, createHref]);

  const hubScope = hubType === 'product' ? 'product' as const : 'project' as const;
  const { data: filters = [], isLoading, error } = useFiltersForProject(projectKey, hubScope);

  const starFilter = useStarFilter();

  const visibleFilters = useMemo(() => {
    let list = filters;

    if (activeTab === 'my') {
      list = list.filter(f => f.user_id === currentUserId || f.owner_id === currentUserId);
    } else if (activeTab === 'starred') {
      list = list.filter(f => currentUserId && f.starred_by_user_ids.includes(currentUserId));
    } else if (activeTab === 'shared') {
      list = list.filter(f =>
        f.viewers_config?.type !== 'private' &&
        f.user_id !== currentUserId &&
        f.owner_id !== currentUserId
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.jql_query ?? '').toLowerCase().includes(q)
      );
    }

    // Sort — "recent" tab forces last-used desc; other tabs follow the header sort
    const dir = sortOrder === 'ASC' ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (activeTab === 'recent') {
        const ta = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const tb = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return tb - ta;
      }
      if (sortKey === 'starred') {
        return (a.starred_by_user_ids.length - b.starred_by_user_ids.length) * dir;
      }
      if (sortKey === 'lastUsed') {
        const ta = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const tb = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return (ta - tb) * dir;
      }
      if (sortKey === 'owner') {
        return ((a.owner?.full_name ?? '').localeCompare(b.owner?.full_name ?? '')) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });

    return sorted;
  }, [filters, activeTab, search, currentUserId, sortKey, sortOrder]);

  const detailHref = (f: SavedFilterFull) => projectKey
    ? `/project-hub/${projectKey}/filters/${f.id}`
    : `/product-hub/filters/${f.id}`;

  const columns = useMemo<Column<SavedFilterFull>[]>(() => [
    {
      id: 'star',
      label: '',
      width: 4,
      align: 'center',
      alwaysVisible: true,
      cell: ({ row: f }) => {
        const isStarred = currentUserId ? f.starred_by_user_ids.includes(currentUserId) : false;
        return (
          <span onClick={e => e.stopPropagation()}>
            <IconButton
              icon={isStarred ? Star : StarOff}
              label={isStarred ? 'Unstar filter' : 'Star filter'}
              appearance="subtle"
              spacing="compact"
              onClick={() => {
                if (!currentUserId) return;
                starFilter.mutate({
                  filterId: f.id,
                  currentStarredIds: f.starred_by_user_ids,
                  userId: currentUserId,
                });
              }}
            />
          </span>
        );
      },
    },
    {
      id: 'name',
      label: 'Name',
      flex: true,
      sortable: true,
      alwaysVisible: true,
      accessor: f => f.name,
      cell: ({ row: f }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <Link
            to={detailHref(f)}
            onClick={e => e.stopPropagation()}
            style={{
              color: token('color.link'),
              fontWeight: token('font.weight.medium'),
              fontSize: 14,
              textDecoration: 'none',
            }}
            onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            {f.name}
          </Link>
          {f.jql_query && (
            <span
              title={f.jql_query}
              style={{
                fontSize: 11,
                color: token('color.text.subtlest'),
                fontFamily: 'var(--ds-font-family-monospace, monospace)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 420,
              }}
            >
              {f.jql_query}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'owner',
      label: 'Owner',
      width: 14,
      sortable: true,
      accessor: f => f.owner?.full_name ?? '',
      cell: ({ row: f }) => f.owner ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AkAvatar
            src={resolveAvatarUrl(f.owner.full_name)}
            name={f.owner.full_name ?? 'Unknown'}
            size="xsmall"
          />
          <span style={{ fontSize: 14, color: token('color.text') }}>
            {f.owner.full_name ?? 'Unknown'}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 14, color: token('color.text.subtlest') }}>—</span>
      ),
    },
    {
      id: 'viewers',
      label: 'Viewers',
      width: 10,
      cell: ({ row: f }) => (
        <span title={
          f.viewers_config.type === 'private' ? 'Only the owner can view' :
          f.viewers_config.type === 'org'     ? 'Everyone in the organisation can view' :
          `${f.viewers_config.user_ids?.length ?? 0} specific people can view`
        }>
          <ViewersChip config={f.viewers_config} />
        </span>
      ),
    },
    {
      id: 'editors',
      label: 'Editors',
      width: 10,
      cell: ({ row: f }) => (
        <span title={
          f.editors_config?.type === 'owner_only'
            ? 'Only the owner can edit'
            : `${f.editors_config?.user_ids?.length ?? 0} specific people can edit`
        }>
          <EditorsChip config={f.editors_config} />
        </span>
      ),
    },
    {
      id: 'starred',
      label: 'Starred by',
      width: 8,
      sortable: true,
      accessor: f => f.starred_by_user_ids.length,
      cell: ({ row: f }) => {
        const n = f.starred_by_user_ids.length;
        return (
          <span style={{ fontSize: 14, color: token('color.text.subtle') }}>
            {n === 0 ? '—' : `${n} ${n === 1 ? 'person' : 'people'}`}
          </span>
        );
      },
    },
    {
      id: 'lastUsed',
      label: 'Last used',
      width: 10,
      sortable: true,
      accessor: f => f.last_used_at,
      cell: ({ row: f }) => (
        <span style={{ fontSize: 14, color: token('color.text.subtle') }}>
          {relativeDay(f.last_used_at)}
        </span>
      ),
    },
    {
      id: '__actions',
      label: '',
      width: 4,
      align: 'center',
      alwaysVisible: true,
      cell: ({ row: f }) => (
        <span onClick={e => e.stopPropagation()}>
          <FilterKebabMenu filter={f} currentUserId={currentUserId} />
        </span>
      ),
    },
  ], [currentUserId, projectKey, starFilter]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: token('elevation.surface'),
      color: token('color.text'),
    }}>
      {/* Page header — 24px horizontal padding matches the project backlog */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px 16px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 653,
            color: token('color.text'),
            lineHeight: '28px',
          }}>
            Filters
          </h1>
          <p style={{
            margin: '4px 0 0',
            fontSize: 14,
            color: token('color.text.subtle'),
          }}>
            Saved filters for {hubType === 'product' ? 'product' : 'project'} views
          </p>
        </div>
        <Button
          appearance="primary"
          iconBefore={() => <Plus size="small" />}
          onClick={() => navigate(createHref)}
        >
          Create filter
        </Button>
      </div>

      {/* Sub-tabs + search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}>
        <Tabs
          id="filters-tabs"
          onChange={idx => setActiveTab((['my', 'starred', 'shared', 'recent'] as TabId[])[idx])}
        >
          <TabList>
            <Tab>My filters</Tab>
            <Tab>Starred</Tab>
            <Tab>Shared</Tab>
            <Tab>Recent</Tab>
          </TabList>
        </Tabs>

        <div style={{ width: 240, paddingBottom: 8 }}>
          <Textfield
            placeholder="Search filters"
            value={search}
            onChange={e => setSearch((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span style={{ paddingLeft: 8, color: token('color.icon.subtle'), display: 'flex', alignItems: 'center' }}>
                <Search size="small" />
              </span>
            }
          />
        </div>
      </div>

      {/* Canonical JiraTable — same table primitive as the project backlog */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 32px' }}>
        {error && (
          <div style={{ padding: '16px 0' }}>
            <SectionMessage appearance="error" title="Couldn't load filters">
              Check your connection and refresh the page.
            </SectionMessage>
          </div>
        )}
        <JiraTable<SavedFilterFull>
          columns={columns}
          data={visibleFilters}
          getRowId={f => f.id}
          onRowClick={f => navigate(detailHref(f))}
          sortKey={activeTab === 'recent' ? undefined : sortKey}
          sortOrder={activeTab === 'recent' ? undefined : sortOrder}
          onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
          isLoading={isLoading}
          density="comfortable"
          ariaLabel="Saved filters"
          showRowCount
          totalRowCount={filters.length}
          emptyView={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px',
              gap: 8,
              color: token('color.text.subtle'),
            }}>
              <span style={{ fontSize: 16, fontWeight: token('font.weight.medium') }}>
                {search ? 'No filters match your search' : 'No filters yet'}
              </span>
              {!search && (
                <span style={{ fontSize: 13, color: token('color.text.subtlest') }}>
                  Use the button above, or press N, to build your first filter.
                </span>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
