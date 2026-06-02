import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import AkDynamicTable from '@atlaskit/dynamic-table';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import AkAvatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import { useFiltersForProject, useStarFilter, useDeleteSavedFilter, type SavedFilterFull } from '@/hooks/workhub/useSavedFilters';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { Star, StarOff, Plus, Search } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';

export type HubType = 'project' | 'product';

interface FiltersListPageProps {
  hubType?: HubType;
}

type TabId = 'my' | 'starred' | 'shared' | 'recent';

const TABLE_HEAD = {
  cells: [
    { key: 'star',      content: '',                   width: 4,  isSortable: false },
    { key: 'name',      content: 'Name',               width: 32, isSortable: true  },
    { key: 'owner',     content: 'Owner',              width: 16, isSortable: false },
    { key: 'viewers',   content: 'Viewers',            width: 10, isSortable: false },
    { key: 'editors',   content: 'Editors',            width: 10, isSortable: false },
    { key: 'starred',   content: 'Starred by',         width: 10, isSortable: true  },
    { key: 'lastUsed',  content: 'Last used',          width: 14, isSortable: true  },
    { key: 'actions',   content: '',                   width: 4,  isSortable: false },
  ],
};

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

export default function FiltersListPage({ hubType = 'project' }: FiltersListPageProps) {
  const { key: projectKey } = useParams<{ key: string }>();

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('my');
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Resolve current user id once on mount
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // H7 P2 — keyboard shortcut: press N to open Create filter (Jira pattern)
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === 'n' &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !(e.target as HTMLElement).matches('input, textarea, [contenteditable]')
      ) {
        navigate(projectKey
          ? `/project-hub/${projectKey}/filters/create`
          : `/project-hub/filters/create`);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [navigate, projectKey]);

  const hubScope = hubType === 'product' ? 'product' as const : 'project' as const;
  const { data: filters = [], isLoading, error } = useFiltersForProject(projectKey, hubScope);

  const starFilter = useStarFilter();
  const deleteFilter = useDeleteSavedFilter();

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
    } else {
      // recent — show all, sorted by last_used_at desc
      list = [...list].sort((a, b) => {
        const ta = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const tb = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return tb - ta;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.jql_query ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [filters, activeTab, search, currentUserId]);

  function buildRows() {
    return visibleFilters.map(f => {
      const isStarred = currentUserId ? f.starred_by_user_ids.includes(currentUserId) : false;

      return {
        key: f.id,
        cells: [
          {
            key: 'star',
            content: (
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
            ),
          },
          {
            key: 'name',
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link
                  to={projectKey
                    ? `/project-hub/${projectKey}/filters/${f.id}`
                    : `/product-hub/filters/${f.id}`}
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
                      maxWidth: 360,
                    }}
                  >
                    {f.jql_query}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'owner',
            content: f.owner ? (
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
            key: 'viewers',
            content: (
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
            key: 'editors',
            content: (
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
            key: 'starred',
            content: (() => {
              const n = f.starred_by_user_ids.length;
              return (
                <span style={{ fontSize: 14, color: token('color.text.subtle') }}>
                  {n === 0 ? '—' : `${n} ${n === 1 ? 'person' : 'people'}`}
                </span>
              );
            })(),
          },
          {
            key: 'lastUsed',
            content: (
              <span style={{ fontSize: 14, color: token('color.text.subtle') }}>
                {f.last_used_at
                  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                      Math.round((new Date(f.last_used_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                      'day'
                    )
                  : '—'}
              </span>
            ),
          },
          {
            key: 'actions',
            content: (
              <FilterKebabMenu filter={f} currentUserId={currentUserId} />
            ),
          },
        ],
      };
    });
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: token('elevation.surface'),
      color: token('color.text'),
    }}>
      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 32px 16px',
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
          onClick={() => navigate(projectKey
            ? `/project-hub/${projectKey}/filters/create`
            : `/project-hub/filters/create`)}
        >
          Create filter
        </Button>
      </div>

      {/* Sub-tabs + search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
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

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px', fontSize: 14 }}>
        {error && (
          <div style={{ padding: '16px 0' }}>
            <SectionMessage appearance="error" title="Couldn't load filters">
              Check your connection and refresh the page.
            </SectionMessage>
          </div>
        )}
        {!isLoading && !error && (
          <div style={{ padding: '12px 0 4px', fontSize: 12, color: token('color.text.subtlest') }}>
            {visibleFilters.length} {visibleFilters.length === 1 ? 'filter' : 'filters'}
          </div>
        )}
        <AkDynamicTable
          head={TABLE_HEAD}
          rows={buildRows()}
          isLoading={isLoading}
          emptyView={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px',
              gap: 16,
              color: token('color.text.subtle'),
            }}>
              <span style={{ fontSize: 16, fontWeight: token('font.weight.medium') }}>
                {search ? 'No filters match your search' : 'No filters yet'}
              </span>
              {!search && (
                <Button
                  appearance="primary"
                  onClick={() => navigate(projectKey
                    ? `/project-hub/${projectKey}/filters/create`
                    : `/project-hub/filters/create`)}
                >
                  Create your first filter
                </Button>
              )}
            </div>
          }
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, sortOrder: order }: { key: string; sortOrder: 'ASC' | 'DESC' }) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />
      </div>

    </div>
  );
}
