import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import AkAvatar from '@atlaskit/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { FilterVersionHistory } from '@/components/filters/FilterVersionHistory';
import { FilterUsageSparkline } from '@/components/filters/FilterUsageSparkline';
import { FilterResultsPanel } from '@/components/filters/FilterResultsPanel';
import { type SavedFilterFull } from '@/hooks/workhub/useSavedFilters';
import { ArrowLeft, Edit, Clock } from '@/lib/atlaskit-icons';
import { resolveAvatarUrl } from '@/lib/avatars';

interface BoardInfo { id: string; name: string; }

export default function FilterDetailPage() {
  const { key: projectKey, filterId } = useParams<{ key: string; filterId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const backHref = projectKey
    ? `/project-hub/${projectKey}/filters`
    : '/product-hub/filters';

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: token('color.text.subtlest'),
        fontSize: 14,
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
        <span style={{ fontSize: 16, fontWeight: token('font.weight.medium') }}>
          Filter not found
        </span>
        <Button appearance="subtle" onClick={() => navigate(backHref)}>
          Back to filters
        </Button>
      </div>
    );
  }

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
        <span style={{ color: token('color.text.subtlest'), fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: token('color.text.subtle') }}>{filter.name}</span>
      </div>

      {/* Page content — 24px horizontal padding matches the project backlog */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 653,
              color: token('color.text'),
              lineHeight: '28px',
            }}>
              {filter.name}
            </h1>
            {filter.description && (
              <p style={{
                margin: '8px 0 0',
                fontSize: 14,
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
            <Button
              appearance="subtle"
              iconBefore={() => <Edit size="small" />}
              onClick={() => setEditOpen(true)}
            >
              Edit filter
            </Button>
            {filter.jql_query && projectKey && (
              <>
                <Button
                  appearance="subtle"
                  onClick={() => navigate(`/project-hub/${projectKey}/allwork?filterId=${filter.id}`)}
                >
                  Open in all work
                </Button>
                <Button
                  appearance="primary"
                  onClick={() => navigate(`/project-hub/${projectKey}/backlog?filterId=${filter.id}`)}
                >
                  Apply to backlog
                </Button>
              </>
            )}
            {filter.jql_query && !projectKey && (
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
              fontSize: 12,
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
                <span style={{ fontSize: 13 }}>{filter.owner.full_name ?? 'Unknown'}</span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: token('color.text.subtlest') }}>—</span>
            )}
          </MetaField>

          <MetaField label="Starred by">
            <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
              {filter.starred_by_user_ids.length}
            </span>
          </MetaField>

          <MetaField label="Boards">
            {filter.used_by_board_ids.length === 0 ? (
              <span style={{ fontSize: 13, color: token('color.text.subtlest') }}>—</span>
            ) : linkedBoards.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {linkedBoards.map(board => (
                  <a
                    key={board.id}
                    href={projectKey ? `/project-hub/${projectKey}/board` : '#'}
                    style={{
                      fontSize: 13,
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
              <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
                {filter.used_by_board_ids.length}
              </span>
            )}
          </MetaField>

          <MetaField label="Use count">
            <FilterUsageSparkline data={[]} totalCount={filter.use_count} />
          </MetaField>
        </div>

        {/* JQL block */}
        {filter.jql_query ? (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              margin: '0 0 8px',
              fontSize: 14,
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
              fontSize: 13,
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
            fontSize: 14,
            marginBottom: 24,
          }}>
            No JQL query saved — <Button
              appearance="link"
              spacing="none"
              onClick={() => setEditOpen(true)}
            >
              add one now
            </Button>
          </div>
        )}

        {/* Live results — the filter in use, rendered with the canonical backlog table */}
        {filter.jql_query && (
          <FilterResultsPanel
            jql={filter.jql_query}
            emptyHint="This filter has no JQL yet — edit it to see matching work items."
          />
        )}

      </div>

      {/* Modals */}
      {editOpen && (
        <FilterSaveModal
          filter={filter}
          onClose={() => setEditOpen(false)}
          onSaved={() => setEditOpen(false)}
        />
      )}

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
        fontSize: 11,
        fontWeight: token('font.weight.semibold'),
        color: token('color.text.subtlest'),
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}
