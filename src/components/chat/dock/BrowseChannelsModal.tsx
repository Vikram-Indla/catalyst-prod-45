/**
 * BrowseChannelsModal — directory of every channel the caller can see.
 *
 * Source: chat_conversations WHERE kind='channel'. RLS gates visibility to
 * member-only via chat_is_member, so the query returns the same set the
 * caller is allowed to read. Search box is client-side ILIKE over title +
 * project_key — DB hit is one query, no RPC needed.
 *
 * Clicking a row routes through chat_get_or_create_project_channel so the
 * caller is added as a member if not already (idempotent).
 */
import React, { useMemo, useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStartProjectChannel } from '@/hooks/chat/useStartProjectChannel';
import ProjectIcon from '@/components/shared/ProjectIcon';

export interface BrowseChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChannel: (conversationId: string) => void;
}

interface ChannelRow {
  id: string;
  title: string;
  project_key: string | null;
  last_message_at: string | null;
  is_archived: boolean;
}

const db = supabase as unknown as { from: (table: string) => any };

export function BrowseChannelsModal({ isOpen, onClose, onOpenChannel }: BrowseChannelsModalProps) {
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const startChannel = useStartProjectChannel();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['chat', 'browse-channels'],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await db
        .from('chat_conversations')
        .select('id, title, project_key, last_message_at, is_archived')
        .eq('kind', 'channel')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error || !data) return [] as ChannelRow[];
      return data as ChannelRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.is_archived) return false;
      if (!q) return true;
      return (
        (r.title ?? '').toLowerCase().includes(q) ||
        (r.project_key ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const openRow = async (r: ChannelRow) => {
    if (!r.project_key) {
      // Ad-hoc channel (no project anchor) — just select it.
      onOpenChannel(r.id);
      onClose();
      return;
    }
    setBusyKey(r.project_key);
    try {
      const convId = await startChannel.mutateAsync(r.project_key);
      onOpenChannel(convId);
      onClose();
    } catch (e) {
      console.error('Open channel failed:', e);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Browse channels</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or project key"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 'var(--ds-font-size-400)',
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                marginBottom: 12,
              }}
            />
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {isLoading && (
                <div style={{ padding: 16, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
                  Loading…
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div style={{ padding: 16, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>
                  No channels match.
                </div>
              )}
              {filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRow(r)}
                  disabled={busyKey === r.project_key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '8px 8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <ProjectIcon projectKey={r.project_key ?? ''} size="medium" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>
                      #{(r.title ?? r.project_key ?? '').replace(/^#\s*/, '')}
                    </div>
                    {r.project_key && (
                      <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
                        {r.project_key}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default BrowseChannelsModal;
