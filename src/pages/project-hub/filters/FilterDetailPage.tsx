import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import AkAvatar from '@atlaskit/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilterVersionHistory } from '@/components/filters/FilterVersionHistory';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { useLinkedEntities } from '@/hooks/workhub/useLinkedEntities';
import { FilterUsageSparkline } from '@/components/filters/FilterUsageSparkline';
import { FilterResultsPanel } from '@/components/filters/FilterResultsPanel';
import { type SavedFilterFull } from '@/hooks/workhub/useSavedFilters';
import { ArrowLeft, Edit, Clock } from '@/lib/atlaskit-icons';
import { resolveAvatarUrl } from '@/lib/avatars';

interface BoardInfo { id: string; name: string; }

interface FilterDetailPageProps {
  /** 2026-06-15: mode switch. project (default) = /project-hub/:key/filters/...
   *  links go to ph_issues-backed work + backlog surfaces. product builds the
   *  same chrome with /product-hub/:key/... links + product hub_scope when
   *  saving. 2026-06-16: 'incident' added — same chrome, /incident-hub/...
   *  links, no :key in URL. 2026-06-17: 'tasks' added — /tasks/... links,
   *  no :key in URL, 'TASKS' sentinel projectKey. Per CLAUDE.md "ADOPT
   *  CANONICAL COMPONENTS". */
  mode?: 'project' | 'product' | 'incident' | 'tasks' | 'release' | 'test';
}

export default function FilterDetailPage({ mode = 'project' }: FilterDetailPageProps = {}) {
  const isProduct = mode === 'product';
  const isIncident = mode === 'incident';
  const isTasks = mode === 'tasks';
  const isRelease = mode === 'release';
  const isTest = mode === 'test';
  const hubBase =
    isProduct ? 'product-hub'
    : isIncident ? 'incident-hub'
    : isTasks ? 'tasks'
    : isRelease ? 'release-hub'
    : isTest ? 'testhub'
    : 'project-hub';
  const { key: routeKey, filterId } = useParams<{ key: string; filterId: string }>();
  const projectKey =
    isIncident ? 'INCIDENTS'
    : isTasks ? 'TASKS'
    : isRelease ? 'RELEASES'
    : isTest ? 'TESTHUB'
    : routeKey;
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) =>
      setCurrentUserId(session?.user?.id ?? null));
  }, []);
  const linkedEntities = useLinkedEntities(filterId ?? null);

  const { data: filter, isLoading } = useQuery({
    queryKey: ['filter-detail', filterId],
    queryFn: async () => {
      if (!filterId) return null;
      const { data, error } = await supabase
        .from('ph_saved_filters')
        .select('*, owner:profiles!ph_saved_filters_owner_id_fkey(id, full_name, avatar_url)')
        .eq('id', filterId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as SavedFilterFull;
    },
    enabled: !!filterId,
    staleTime: 30_000,
  });

  // Fetch board names for any linked boards
  const { data: linkedBoards = [] } = useQuery<BoardInfo[]>({
    queryKey: ['filter-boards', filter?.used_by_board_ids],
    queryFn: async () => {
      if (!filter?.used_by_board_ids?.length) return [];
      const { data, error } = await supabase
        .from('boards' as any)
        .select('id, name')
        .in('id', filter.used_by_board_ids);
      if (error) throw new Error(error.message);
      return data as BoardInfo[];
    },
    enabled: !!filter && filter.used_by_board_ids.length > 0,
    staleTime: 60_000,
  });

  const backHref =
    isIncident ? '/incident-hub/filters'
    : isTasks ? '/tasks/filters'
    : isRelease ? '/release-hub/filters'
    : projectKey
      ? `/${hubBase}/${projectKey}/filters`
      : '/product-hub/filters';

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: token('color.text.subtlest'),
        fontSize: 'var(--ds-font-size-400)',
      }}>
        Loading…
      </div>
    );
  }

  if (!filter) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        color: token('color.text.subtle'),
      }}>
        <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: token('font.weight.medium') }}>
          Filter not found
        </span>
        <Button appearance="subtle" onClick={() => navigate(backHref)}>
          Back to filters
        </Button>
      </div>
    );
  }

  const editorsLabel = (() => {
    const ec = filter.editors_config;
    if (!ec || ec.type === 'private' || !ec.type) return 'Owner only';
    if (ec.type === 'everyone' || ec.type === 'org') return 'Everyone';
    if (ec.type === 'specific') return `${ec.user_ids?.length ?? 0} people`;
    return 'Owner only';
  })();

  const subscriberCount = filter.subscriber_ids?.length ?? 0;

  const viewersLabel = (() => {
    switch (filter.viewers_config?.type) {
      case 'private': return 'Private';
      case 'project': return 'Project members';
      case 'product': return 'Product members';
      case 'everyone':
      case 'org': return 'Everyone';
      case 'specific': return `${filter.viewers_config?.user_ids?.length ?? 0} people`;
      default: return 'Private';
    }
  })();

  // Explicit Edit opens the full builder (FilterPreviewPage) for this filter.
  // The detail page itself stays read-only. G1, 2026-06-19.
  const editHref =
    isIncident ? `/incident-hub/filters/create?filterId=${filter.id}`
    : isTasks ? `/tasks/filters/create?filterId=${filter.id}`
    : isRelease ? `/release-hub/filters/create?filterId=${filter.id}`
    : projectKey ? `/${hubBase}/${projectKey}/filters/create?filterId=${filter.id}`
    : `/product-hub/filters/create?filterId=${filter.id}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: token('elevation.surface'),
      color: token('color.text'),
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '16px 24px',
        borderBottom: `1px solid ${token('color.border')}`,
        flexShrink: 0,
      }}>
        <Button
          appearance="subtle"
          spacing="compact"
          iconBefore={ArrowLeft}
          onClick={() => navigate(backHref)}
        >
          Filters
        </Button>
        <span style={{ color: token('color.text.subtlest'), fontSize: 'var(--ds-font-size-300)' }}>/</span>
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>{filter.name}</span>
      </div>

      {/* Page content — 24px horizontal padding matches the project backlog */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 'var(--ds-font-size-800)',
              fontWeight: 653,
              color: token('color.text'),
              lineHeight: '28px',
            }}>
              {filter.name}
            </h1>
            {filter.description && (
              <p style={{
                margin: '8px 0 0',
                fontSize: 'var(--ds-font-size-400)',
                color: token('color.text.subtle'),
                maxWidth: 640,
              }}>
                {filter.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button
              appearance="subtle"
              iconBefore={() => <Clock size="small" />}
              onClick={() => setHistoryOpen(true)}
            >
              Version history
            </Button>
            {/* Canonical per-filter actions (star / subscribe / copy / share /
                transfer / WhatsApp / derive / delete) — reuses the same menu as
                the directory row. Detail page is the source of truth (G10). */}
            <FilterKebabMenu
              filter={filter}
              currentUserId={currentUserId}
              hubType={isProduct ? 'product' : 'project'}
            />
            <Button
              appearance="subtle"
              iconBefore={() => <Edit size="small" />}
              onClick={() => navigate(editHref)}
            >
              Edit filter
            </Button>
            {filter.jql_query && isIncident && (
              <>
                <Button
                  appearance="subtle"
                  onClick={() => navigate(`/incident-hub/work?filterId=${filter.id}`)}
                >
                  Open in work
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => navigate(`/incident-hub/board?filterId=${filter.id}`)}
                >
                  Apply to board
                </Button>
              </>
            )}
            {filter.jql_query && isTasks && (
              <>
                <Button
                  appearance="subtle"
                  onClick={() => navigate(`/tasks/work?filterId=${filter.id}`)}
                >
                  Open in work
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => navigate(`/tasks/board?filterId=${filter.id}`)}
                >
                  Apply to board
                </Button>
              </>
            )}
            {filter.jql_query && projectKey && !isIncident && !isTasks && !isRelease && (
              <>
                <Button
                  appearance="subtle"
                  onClick={() => navigate(`/${hubBase}/${projectKey}/allwork?filterId=${filter.id}`)}
                >
                  Open in all work
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => navigate(`/${hubBase}/${projectKey}/backlog?filterId=${filter.id}`)}
                >
                  Apply to backlog
                </Button>
              </>
            )}
            {/* Release hub has no filterId-aware work/board surface yet, so no
                apply button is shown — avoids a misleading no-op. Add when
                ReleasesWorkCanonical consumes ?filterId. */}
            {filter.jql_query && !projectKey && !isIncident && !isTasks && (
              <Button
                appearance="primary"
                onClick={() => navigate(backHref)}
              >
                Apply filter
              </Button>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          padding: '16px',
          background: token('elevation.surface.sunken'),
          borderRadius: 4,
          marginBottom: 24,
        }}>
          <MetaField label="Visibility">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: 3,
              background: token('color.background.neutral'),
              color: token('color.text.subtle'),
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: token('font.weight.medium'),
            }}>
              {viewersLabel}
            </span>
          </MetaField>

          <MetaField label="Owner">
            {filter.owner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AkAvatar
                  src={resolveAvatarUrl(filter.owner.full_name)}
                  name={filter.owner.full_name ?? 'Unknown'}
                  size="xsmall"
                />
                <span style={{ fontSize: 'var(--ds-font-size-300)' }}>{filter.owner.full_name ?? 'Unknown'}</span>
              </div>
            ) : (
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest') }}>—</span>
            )}
          </MetaField>

          <MetaField label="Editors">
            <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
              {editorsLabel}
            </span>
          </MetaField>

          <MetaField label="Subscribers">
            <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
              {subscriberCount === 0 ? '—' : `${subscriberCount} watching`}
            </span>
          </MetaField>

          <MetaField label="Starred by">
            <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
              {filter.starred_by_user_ids.length}
            </span>
          </MetaField>

          <MetaField label="Boards">
            {filter.used_by_board_ids.length === 0 ? (
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtlest') }}>—</span>
            ) : linkedBoards.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {linkedBoards.map(board => (
                  <a
                    key={board.id}
                    href={
                      isTasks ? '/tasks/board'
                      : isIncident ? '/incident-hub/board'
                      : isRelease ? '/release-hub/release-kanban'
                      : projectKey ? `/${hubBase}/${projectKey}/board`
                      : '#'
                    }
                    style={{
                      fontSize: 'var(--ds-font-size-300)',
                      color: token('color.link'),
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {board.name}
                  </a>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
                {filter.used_by_board_ids.length}
              </span>
            )}
          </MetaField>

          <MetaField label="Use count">
            <FilterUsageSparkline data={[]} totalCount={filter.use_count} />
          </MetaField>
        </div>

        {/* Derived views — Kanban boards, roadmaps, and dashboards that depend
            on this filter (real data via useLinkedEntities, G3/G10). */}
        {linkedEntities.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: token('font.weight.semibold'),
              color: token('color.text.subtle'),
            }}>
              Derived views
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {linkedEntities.map((e, i) => (
                <span
                  key={`${e.type}-${e.name}-${i}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 3,
                    background: token('color.background.neutral'),
                    color: token('color.text.subtle'),
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: token('font.weight.medium'),
                  }}
                >
                  <span style={{ color: token('color.text.subtlest') }}>{e.type}:</span> {e.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* JQL block */}
        {filter.jql_query ? (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: token('font.weight.semibold'),
              color: token('color.text.subtle'),
            }}>
              JQL query
            </h2>
            <pre style={{
              margin: 0,
              padding: '12px 16px',
              background: token('elevation.surface.sunken'),
              borderRadius: 4,
              border: `1px solid ${token('color.border')}`,
              fontFamily: 'var(--ds-font-family-monospace, monospace)',
              fontSize: 'var(--ds-font-size-300)',
              color: token('color.text'),
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {filter.jql_query}
            </pre>
          </div>
        ) : (
          <div style={{
            padding: '24px',
            background: token('elevation.surface.sunken'),
            borderRadius: 4,
            border: `1px dashed ${token('color.border')}`,
            textAlign: 'center',
            color: token('color.text.subtlest'),
            fontSize: 'var(--ds-font-size-400)',
            marginBottom: 24,
          }}>
            No JQL query saved — <Button
              appearance="link"
              spacing="none"
              onClick={() => navigate(editHref)}
            >
              add one now
            </Button>
          </div>
        )}

        {/* Live results — the filter in use, rendered with the canonical backlog table.
            2026-06-17: tasks mode swaps the data source to the `tasks` table; the
            FilterResultsPanel component branches internally so chrome stays identical. */}
        {filter.jql_query && (
          <FilterResultsPanel
            jql={filter.jql_query}
            dataSource={isTasks ? 'tasks' : 'ph_issues'}
            emptyHint="This filter has no JQL yet — edit it to see matching work items."
          />
        )}

      </div>

      {/* Modals */}
      {historyOpen && (
        <FilterVersionHistory
          filterId={filter.id}
          filterName={filter.name}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: token('font.weight.semibold'),
        color: token('color.text.subtlest'),
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}
