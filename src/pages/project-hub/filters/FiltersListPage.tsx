import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import AkDynamicTable from '@atlaskit/dynamic-table';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Tabs, { Tab, TabList } from '@atlaskit/tabs';
import AkAvatar from '@atlaskit/avatar';
import { useFiltersForProject, useStarFilter, type SavedFilterFull } from '@/hooks/workhub/useSavedFilters';
import { FilterHealthBadge } from '@/components/filters/FilterHealthBadge';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { Star, StarOff, Plus, Search } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import type { HubType } from './FiltersListPage';

export { type HubType };

interface FiltersListPageProps {
  hubType?: HubType;
}

type TabId = 'my' | 'starred' | 'recent';

const TABLE_HEAD = {
  cells: [
    { key: 'star',      content: '',                   width: 4,  isSortable: false },
    { key: 'name',      content: 'Name',               width: 36, isSortable: true  },
    { key: 'owner',     content: 'Owner',              width: 18, isSortable: false },
    { key: 'viewers',   content: 'Viewers',            width: 12, isSortable: false },
    { key: 'starred',   content: 'Starred by',         width: 8,  isSortable: true  },
    { key: 'boards',    content: 'Boards',             width: 8,  isSortable: true  },
    { key: 'health',    content: 'Health',             width: 10, isSortable: false },
    { key: 'actions',   content: '',                   width: 4,  isSortable: false },
  ],
};

function ViewersChip({ config }: { config: SavedFilterFull['viewers_config'] }) {
  const label =
    config.type === 'private' ? 'Private' :
    config.type === 'org'     ? 'Organisation' :
    `${config.user_ids?.length ?? 0} people`;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: 3,
      background: token('color.background.neutral'),
      color: token('color.text.subtle'),
      fontSize: 12,
      fontWeight: token('font.weight.medium'),
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function BoardsBadge({ count }: { count: number }) {
  if (count === 0) return <span style={{ color: token('color.text.subtlest'), fontSize: 13 }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: 3,
      background: token('color.background.information'),
      color: token('color.text.information'),
      fontSize: 12,
      fontWeight: token('font.weight.medium'),
    }}>
      {count}
    </span>
  );
}

export default function FiltersListPage({ hubType = 'project' }: FiltersListPageProps) {
  const { key: projectKey } = useParams<{ key: string }>();

  const [activeTab, setActiveTab] = useState<TabId>('my');
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Resolve current user id once on mount
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const hubScope = hubType === 'product' ? 'product' as const : 'project' as const;
  const { data: filters = [], isLoading } = useFiltersForProject(projectKey, hubScope);

  const starFilter = useStarFilter();
  const deleteFilter = useDeleteSavedFilter();

  const visibleFilters = useMemo(() => {
    let list = filters;

    if (activeTab === 'my') {
      list = list.filter(f => f.user_id === currentUserId || f.owner_id === currentUserId);
    } else if (activeTab === 'starred') {
      list = list.filter(f => currentUserId && f.starred_by_user_ids.includes(currentUserId));
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
              <button
                aria-label={isStarred ? 'Unstar filter' : 'Star filter'}
                onClick={() => {
                  if (!currentUserId) return;
                  starFilter.mutate({
                    filterId: f.id,
                    currentStarredIds: f.starred_by_user_ids,
                    userId: currentUserId,
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: isStarred
                    ? token('color.icon.warning')
                    : token('color.icon.subtle'),
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isStarred ? <Star size="small" /> : <StarOff size="small" />}
              </button>
            ),
          },
          {
            key: 'name',
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <a
                  href={projectKey
                    ? `/project-hub/${projectKey}/filters/${f.id}`
                    : `/product-hub/filters/${f.id}`}
                  style={{
                    color: token('color.link'),
                    fontWeight: token('font.weight.medium'),
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                  onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {f.name}
                </a>
                {f.jql_query && (
                  <span style={{
                    fontSize: 11,
                    color: token('color.text.subtlest'),
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 360,
                  }}>
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
                  src={f.owner.avatar_url ?? undefined}
                  name={f.owner.full_name ?? 'Unknown'}
                  size="xsmall"
                />
                <span style={{ fontSize: 13, color: token('color.text') }}>
                  {f.owner.full_name ?? 'Unknown'}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: token('color.text.subtlest') }}>—</span>
            ),
          },
          {
            key: 'viewers',
            content: <ViewersChip config={f.viewers_config} />,
          },
          {
            key: 'starred',
            content: (
              <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
                {f.starred_by_user_ids.length}
              </span>
            ),
          },
          {
            key: 'boards',
            content: <BoardsBadge count={f.used_by_board_ids.length} />,
          },
          {
            key: 'health',
            content: <FilterHealthBadge health={f.health_status} />,
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
            fontWeight: token('font.weight.bold'),
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
          iconBefore={<Plus size="small" label="" />}
          onClick={() => setCreateModalOpen(true)}
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
          onChange={idx => setActiveTab((['my', 'starred', 'recent'] as TabId[])[idx])}
        >
          <TabList>
            <Tab>My filters</Tab>
            <Tab>Starred</Tab>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
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
                <Button appearance="primary" onClick={() => setCreateModalOpen(true)}>
                  Create your first filter
                </Button>
              )}
            </div>
          }
          defaultSortKey="name"
          defaultSortOrder="ASC"
        />
      </div>

      {/* Create filter modal */}
      {createModalOpen && (
        <FilterSaveModal
          hubScope={hubType === 'product' ? 'product' : 'project'}
          onClose={() => setCreateModalOpen(false)}
          onSaved={() => setCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
