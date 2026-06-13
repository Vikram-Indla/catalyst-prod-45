/**
 * FiltersListPage — /project-hub/:key/filters · /product-hub/:key/filters
 *
 * Jira-exact Filters directory (probed live via /rest/api/3/filter/search on
 * 2026-06-10 — 144 filters, sharePermissions types: loggedin 70 · project 55 ·
 * group 1 · none/Private 17; editPermissions: none 120 · user 15 · group 9 ·
 * project 3).
 *
 * Layout mirrors Jira's directory: Search filters + Owner / Project / Group
 * dropdowns on the left, table = ★ · Name · Owner · Viewers · Editors ·
 * Starred by · ⋯, rendered with the canonical JiraTable. Viewers/Editors are
 * icon + text (lock Private, building My organization, project "Name, All
 * roles", group name, stacked users) — never lozenges.
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import Button, { IconButton } from '@atlaskit/button/new';
import AkAvatar from '@atlaskit/avatar';
import SectionMessage from '@atlaskit/section-message';
import Tooltip from '@atlaskit/tooltip';
import LockIcon from '@atlaskit/icon/core/lock-locked';
import OfficeBuildingIcon from '@atlaskit/icon/core/office-building';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import {
  CatalystListPageLayout,
  type QuickTab,
  type ToolbarFilter,
  type BulkAction,
  PermissionList,
  type PermissionEntry,
} from '@/components/shared/CatalystListPage';
import {
  useFiltersForProject,
  useStarFilter,
  type SavedFilterFull,
  type JiraSharePermission,
} from '@/hooks/workhub/useSavedFilters';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { Star, StarOff, Plus } from '@/lib/atlaskit-icons';
import { relativeFromIso } from '@/components/shared/RelativeTime';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';

export type HubType = 'project' | 'product';

interface FiltersListPageProps {
  hubType?: HubType;
}


const ICON_COLOR = 'var(--ds-icon, #44546F)';

// ── Permission entry builders ───────────────────────────────────────────────
// Build PermissionEntry[] from Jira share/edit permissions or Catalyst-native
// viewers/editors config — then pass to the shared <PermissionList> component.

const GROUP_NAME_MAP: Record<string, string> = {
  'org-admins':          'Organisation admins',
  'administrators':      'Administrators',
  'jira-admins':         'Jira admins',
  'jira-software-users': 'Software users',
  'site-admins':         'Site admins',
  'trusted-users':       'Trusted users',
};
function humanizeGroupName(raw: string | undefined): string {
  if (!raw) return 'Group';
  return GROUP_NAME_MAP[raw.toLowerCase()] ?? raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Jira sharePermissions → icon + text rows (exact Jira directory rendering) */
function sharePermissionEntries(perms: JiraSharePermission[] | undefined): PermissionEntry[] {
  if (!perms || perms.length === 0) {
    return [{ icon: <LockIcon label="" color={ICON_COLOR} />, label: 'Private' }];
  }
  return perms.map(p => {
    if (p.type === 'loggedin' || p.type === 'organization' || p.type === 'authenticated' || p.type === 'global') {
      return { icon: <OfficeBuildingIcon label="" color={ICON_COLOR} />, label: 'My organization' };
    }
    if (p.type === 'project' || p.type === 'project-unknown') {
      const name = p.project?.name ?? p.project?.key ?? 'Project';
      return {
        icon: <AkAvatar appearance="square" size="xsmall" name={name} src={(p.project as any)?.avatarUrls?.['16x16'] ?? undefined} />,
        label: `${name}, ${p.role?.name ?? 'All roles'}`,
      };
    }
    if (p.type === 'group') {
      return { icon: <PeopleGroupIcon label="" color={ICON_COLOR} />, label: humanizeGroupName(p.group?.name) };
    }
    const userName = p.user?.displayName ?? 'User';
    return {
      icon: <AkAvatar size="xsmall" name={userName} src={resolveAvatarUrl(userName)} />,
      label: userName,
    };
  });
}

/** Catalyst-native viewers_config → the same icon + text vocabulary.
 *  Scopes align with the RLS enforcement (migration 20260612130000). 'org' is a
 *  legacy value that collapses to 'Everyone'. */
function viewersConfigEntries(config: SavedFilterFull['viewers_config']): PermissionEntry[] {
  const type = config?.type;
  if (type === 'everyone' || type === 'org') {
    return [{ icon: <OfficeBuildingIcon label="" color={ICON_COLOR} />, label: 'Everyone' }];
  }
  if (type === 'project') {
    return [{ icon: <PeopleGroupIcon label="" color={ICON_COLOR} />, label: 'Project members' }];
  }
  if (type === 'product') {
    return [{ icon: <PeopleGroupIcon label="" color={ICON_COLOR} />, label: 'Product members' }];
  }
  if (type === 'specific') {
    const n = config.user_ids?.length ?? 0;
    return [{ icon: <PeopleGroupIcon label="" color={ICON_COLOR} />, label: `${n} ${n === 1 ? 'person' : 'people'}` }];
  }
  return [{ icon: <LockIcon label="" color={ICON_COLOR} />, label: 'Private' }];
}

function editorsConfigEntries(config: SavedFilterFull['editors_config']): PermissionEntry[] {
  if (config?.type === 'specific') {
    const n = config.user_ids?.length ?? 0;
    return [{ icon: <PeopleGroupIcon label="" color={ICON_COLOR} />, label: `${n} ${n === 1 ? 'specific user' : `${n} specific users`}` }];
  }
  return [{ icon: <LockIcon label="" color={ICON_COLOR} />, label: 'Owner only' }];
}

function ownerName(f: SavedFilterFull): string {
  return f.owner?.full_name ?? f.jira_owner_name ?? '';
}

type QuickTabId = 'all' | 'mine' | 'starred';

interface SelectOption { label: string; value: string }

export default function FiltersListPage({ hubType = 'project' }: FiltersListPageProps) {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<SelectOption | null>(null);
  const [projectFilter, setProjectFilter] = useState<SelectOption | null>(null);
  const [groupFilter, setGroupFilter] = useState<SelectOption | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [quickTab, setQuickTab] = useState<QuickTabId>('all');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<Set<string>>(
    () => new Set(['name', 'owner', 'viewers', 'editors', 'starred', 'updated'])
  );

  // getSession() reads from local storage (no network) — resolves before first
  // render completes, avoiding the race where the kebab opened before the user
  // id arrived and hid all owner-only items (F024).
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
  }, []);

  const createHref = hubType === 'product'
    ? `/product-hub/${projectKey}/filters/create`
    : `/project-hub/${projectKey}/filters/create`;

  // Keyboard shortcut: N opens the create flow (Jira pattern)
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

  // Dropdown option pools — derived from the live rows (Jira derives them the same way)
  const ownerOptions = useMemo<SelectOption[]>(() => {
    const names = [...new Set(filters.map(ownerName).filter(Boolean))].sort();
    return names.map(n => ({ label: n, value: n }));
  }, [filters]);

  const projectOptions = useMemo<SelectOption[]>(() => {
    const names = new Set<string>();
    filters.forEach(f => (f.share_permissions ?? []).forEach(p => {
      if ((p.type === 'project' || p.type === 'project-unknown') && p.project?.name) names.add(p.project.name);
    }));
    return [...names].sort().map(n => ({ label: n, value: n }));
  }, [filters]);

  const groupOptions = useMemo<SelectOption[]>(() => {
    const names = new Set<string>();
    filters.forEach(f => {
      [...(f.share_permissions ?? []), ...(f.edit_permissions ?? [])].forEach(p => {
        if (p.type === 'group' && p.group?.name) names.add(p.group.name);
      });
    });
    return [...names].sort().map(n => ({ label: humanizeGroupName(n), value: n }));
  }, [filters]);

  const visibleFilters = useMemo(() => {
    let list = filters;

    // Quick-tab pre-filter
    if (quickTab === 'mine' && currentUserId) {
      list = list.filter(f => f.user_id === currentUserId || f.owner_id === currentUserId);
    } else if (quickTab === 'starred' && currentUserId) {
      list = list.filter(f => f.starred_by_user_ids.includes(currentUserId));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.jql_query ?? '').toLowerCase().includes(q)
      );
    }
    if (ownerFilter) {
      list = list.filter(f => ownerName(f) === ownerFilter.value);
    }
    if (projectFilter) {
      list = list.filter(f => (f.share_permissions ?? []).some(p =>
        (p.type === 'project' || p.type === 'project-unknown') && p.project?.name === projectFilter.value));
    }
    if (groupFilter) {
      list = list.filter(f =>
        [...(f.share_permissions ?? []), ...(f.edit_permissions ?? [])].some(p =>
          p.type === 'group' && p.group?.name === groupFilter.value));
    }

    const dir = sortOrder === 'ASC' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === 'starred') {
        return (a.starred_by_user_ids.length - b.starred_by_user_ids.length) * dir;
      }
      if (sortKey === 'owner') {
        return ownerName(a).localeCompare(ownerName(b)) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });
  }, [filters, quickTab, currentUserId, search, ownerFilter, projectFilter, groupFilter, sortKey, sortOrder]);

  const detailHref = (f: SavedFilterFull) => hubType === 'product'
    ? `/product-hub/${projectKey}/filters/create?filterId=${f.id}`
    : `/project-hub/${projectKey}/filters/create?filterId=${f.id}`;

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
      width: 30,
      sortable: true,
      alwaysVisible: true,
      defaultVisible: true,
      accessor: f => f.name,
      cell: ({ row: f }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <Link
            to={detailHref(f)}
            onClick={e => e.stopPropagation()}
            style={{
              color: token('color.link'),
              fontWeight: token('font.weight.medium'),
              fontSize: 14,
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            {f.name}
          </Link>
          {f.jql_query && (
            <span style={{
              fontSize: 12,
              color: token('color.text.subtlest'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {f.jql_query}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'owner',
      label: 'Owner',
      width: 13,
      sortable: true,
      defaultVisible: true,
      accessor: f => ownerName(f),
      cell: ({ row: f }) => {
        const name = ownerName(f);
        return name ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AkAvatar src={resolveAvatarUrl(name)} name={name} size="xsmall" />
            {/* aria-hidden avoids double screen-reader announcement (AkAvatar also labels with name) */}
            <span aria-hidden="true" style={{ fontSize: 14, color: token('color.text') }}>{name}</span>
          </div>
        ) : (
          <span style={{ fontSize: 14, color: token('color.text.subtlest') }}>—</span>
        );
      },
    },
    {
      id: 'viewers',
      label: 'Viewers',
      width: 15,
      sortable: true,
      defaultVisible: true,
      accessor: (f: SavedFilterFull) => {
        const entries = f.jira_filter_id || (f.share_permissions?.length ?? 0) > 0
          ? sharePermissionEntries(f.share_permissions)
          : viewersConfigEntries(f.viewers_config);
        return entries[0]?.label ?? '';
      },
      cell: ({ row: f }) => (
        <PermissionList entries={
          f.jira_filter_id || (f.share_permissions?.length ?? 0) > 0
            ? sharePermissionEntries(f.share_permissions)
            : viewersConfigEntries(f.viewers_config)
        } />
      ),
    },
    {
      id: 'editors',
      label: 'Editors',
      width: 13,
      sortable: true,
      defaultVisible: true,
      accessor: (f: SavedFilterFull) => {
        const entries = f.jira_filter_id || (f.edit_permissions?.length ?? 0) > 0
          ? sharePermissionEntries(f.edit_permissions)
          : editorsConfigEntries(f.editors_config);
        return entries[0]?.label ?? '';
      },
      cell: ({ row: f }) => (
        <PermissionList entries={
          f.jira_filter_id || (f.edit_permissions?.length ?? 0) > 0
            ? sharePermissionEntries(f.edit_permissions)
            : editorsConfigEntries(f.editors_config)
        } />
      ),
    },
    {
      id: 'starred',
      label: 'Starred by',
      width: 7,
      sortable: true,
      defaultVisible: true,
      accessor: f => f.starred_by_user_ids.length,
      cell: ({ row: f }) => {
        const n = f.starred_by_user_ids.length;
        const tip = n === 0 ? 'No stars yet' : n === 1 ? '1 person starred this filter' : `${n} people starred this filter`;
        return (
          <Tooltip content={tip}>
            {(tipProps) => (
              <span
                {...tipProps}
                style={{ fontSize: 14, color: n > 0 ? token('color.text') : token('color.text.subtlest'), cursor: 'default' }}
              >
                ★ {n}
              </span>
            )}
          </Tooltip>
        );
      },
    },
    {
      id: 'updated',
      label: 'Last modified',
      width: 10,
      sortable: true,
      defaultVisible: true,
      accessor: (f: SavedFilterFull) => f.updated_at ?? '',
      cell: ({ row: f }) => (
        <span
          style={{ fontSize: 14, color: token('color.text.subtle') }}
          title={f.updated_at ? new Date(f.updated_at).toLocaleString() : undefined}
        >
          {relativeFromIso(f.updated_at)}
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

  const QUICK_TABS: QuickTab[] = [
    { id: 'all', label: 'All filters' },
    { id: 'mine', label: 'My filters' },
    { id: 'starred', label: 'Starred' },
  ];

  const toolbarFilters: ToolbarFilter[] = [
    { id: 'owner', placeholder: 'Owner', options: ownerOptions, value: ownerFilter, onChange: v => setOwnerFilter(v) },
    { id: 'project', placeholder: 'Project', options: projectOptions, value: projectFilter, onChange: v => setProjectFilter(v) },
    { id: 'group', placeholder: 'Group', options: groupOptions, value: groupFilter, onChange: v => setGroupFilter(v) },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      isDanger: true,
      onClick: () => {
        if (!window.confirm(`Delete ${selectedIds.size} filter${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
        setSelectedIds(new Set());
      },
    },
  ];

  const exportCsvAction = (
    <button
      onClick={() => {
        const rows = visibleFilters.map(f => [
          `"${(f.name ?? '').replace(/"/g, '""')}"`,
          `"${(f.description ?? '').replace(/"/g, '""')}"`,
          `"${(f.jql ?? '').replace(/"/g, '""')}"`,
          `"${(f.is_shared ? 'Shared' : 'Private')}"`,
          `"${(f.updated_at ? new Date(f.updated_at).toLocaleDateString() : '')}"`,
        ].join(','));
        const csv = ['Name,Description,JQL,Visibility,Updated', ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'filters.csv'; a.click();
        URL.revokeObjectURL(url);
      }}
      style={{
        background: 'none',
        border: 'none',
        padding: '0 4px',
        fontSize: 14,
        color: token('color.text.subtle'),
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      Export CSV
    </button>
  );

  const createCta = (
    <Tooltip content="Create filter (N)">
      {(tooltipProps) => (
        <Button
          {...tooltipProps}
          appearance="primary"
          iconBefore={() => <Plus size="small" />}
          onClick={() => navigate(createHref)}
        >
          Create filter
        </Button>
      )}
    </Tooltip>
  );

  const footerText = !isLoading && visibleFilters.length > 0
    ? (visibleFilters.length === filters.length
        ? `${filters.length} filter${filters.length !== 1 ? 's' : ''}`
        : `${visibleFilters.length} of ${filters.length} filter${filters.length !== 1 ? 's' : ''}`)
    : undefined;

  return (
    <CatalystListPageLayout
      chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : undefined}
      tabs={QUICK_TABS}
      activeTab={quickTab}
      onTabChange={id => setQuickTab(id as QuickTabId)}
      tabBarActions={createCta}
      search={search}
      searchPlaceholder="Search filters"
      onSearchChange={setSearch}
      toolbarFilters={toolbarFilters}
      hasActiveFilters={!!(search || ownerFilter || projectFilter || groupFilter)}
      onClearAllFilters={() => { setSearch(''); setOwnerFilter(null); setProjectFilter(null); setGroupFilter(null); }}
      toolbarActions={exportCsvAction}
      selectedCount={selectedIds.size}
      bulkActions={bulkActions}
      onDeselect={() => setSelectedIds(new Set())}
      footer={footerText}
    >
      {error && (
        <div style={{ padding: '16px 0' }}>
          <SectionMessage
            appearance="error"
            title={String(error).includes('403') || String(error).toLowerCase().includes('permission') ? 'Permission denied' : 'Couldn\'t load filters'}
          >
            {String(error).includes('403') || String(error).toLowerCase().includes('permission')
              ? 'You don\'t have permission to view these filters. Contact your project admin.'
              : 'Check your connection and refresh the page.'}
          </SectionMessage>
        </div>
      )}
      <JiraTable<SavedFilterFull>
        columns={columns}
        data={visibleFilters}
        getRowId={f => f.id}
        onRowClick={f => navigate(detailHref(f))}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
        isLoading={isLoading}
        selectable
        onSelectionChange={setSelectedIds}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        density="comfortable"
        ariaLabel="Filters directory"
        showRowCount
        totalRowCount={filters.length}
        emptyView={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 32px',
            gap: 12,
            color: token('color.text.subtle'),
          }}>
            <span style={{ fontSize: 16, fontWeight: token('font.weight.medium') }}>
              {search || ownerFilter || projectFilter || groupFilter
                ? 'No filters match your search'
                : 'No filters yet'}
            </span>
            {!search && !ownerFilter && !projectFilter && !groupFilter && (
              <>
                <span style={{ fontSize: 14, color: token('color.text.subtlest') }}>
                  Save a JQL query as a filter to find and reuse it later.
                </span>
                <Button appearance="primary" onClick={() => navigate(createHref)}>
                  Create filter
                </Button>
              </>
            )}
          </div>
        }
      />
    </CatalystListPageLayout>
  );
}
