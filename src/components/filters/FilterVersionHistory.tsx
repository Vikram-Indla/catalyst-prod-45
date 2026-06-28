/**
 * FilterVersionHistory (O9) — version history panel for a saved filter.
 *
 * Shows up to 30 historical JQL snapshots (changed_by, changed_at, jql_query,
 * result_count). Rendered inside a modal or slide-over by the kebab menu.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import ModalDialog, { ModalBody, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { useFilterVersions, type FilterVersion } from '@/hooks/workhub/useSavedFilters';

interface Props {
  filterId: string;
  filterName: string;
  onClose: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'just now';
}

function VersionRow({ v }: { v: FilterVersion }) {
  const name = v.changer?.full_name ?? 'Unknown';
  const avatar = resolveAvatarUrl(name);

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: '12px 0',
      borderBottom: `1px solid ${token('color.border')}`,
      alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, marginTop: 4 }}>
        <Avatar src={avatar} name={name} size="small" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: token('font.weight.medium'), color: token('color.text') }}>
            {name}
          </span>
          <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest'), whiteSpace: 'nowrap' }}>
            {relativeTime(v.changed_at)}
          </span>
        </div>

        {v.jql_query ? (
          <div style={{
            fontSize: 'var(--ds-font-size-200)',
            fontFamily: 'var(--ds-font-family-monospace, monospace)',
            color: token('color.text.subtle'),
            background: `var(--ds-surface-sunken, #F7F8F9)`,
            borderRadius: 3,
            padding: '4px 8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {v.jql_query}
          </div>
        ) : (
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>No JQL recorded</span>
        )}

        {v.result_count !== null && (
          <span style={{ marginTop: 4, display: 'block', fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest') }}>
            {v.result_count} result{v.result_count !== 1 ? 's' : ''} at time of save
          </span>
        )}
      </div>
    </div>
  );
}

export function FilterVersionHistory({ filterId, filterName, onClose }: Props) {
  const { data: versions = [], isLoading } = useFilterVersions(filterId);

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Version history — {filterName}</ModalTitle>
      </ModalHeader>

      <ModalBody>
        {isLoading ? (
          <p style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>Loading history…</p>
        ) : versions.length === 0 ? (
          <p style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
            No version history yet. History is recorded each time the filter is saved.
          </p>
        ) : (
          <div>
            {versions.map(v => <VersionRow key={v.id} v={v} />)}
          </div>
        )}
      </ModalBody>
    </ModalDialog>
  );
}
