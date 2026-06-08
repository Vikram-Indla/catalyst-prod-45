/**
 * NewGroupDmModal — multi-select picker for starting a group DM (3–8 members
 * including caller). Reuses useChatPeople for the roster + useChatSearch
 * (scope=people) when a query is present. On submit calls
 * chat_get_or_create_group_dm and selects the resulting conversation.
 *
 * Server-side rules enforced by the RPC:
 *  - Caller auto-included (no need to add yourself)
 *  - Min 3 distinct (caller + 2 others)
 *  - Max 8 total
 *  - Idempotent: same exact set → same conversation id (dm_pair_hash)
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
import { useAuth } from '@/hooks/useAuth';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useChatSearch } from '@/hooks/chat/useChatSearch';
import { useStartGroupDm } from '@/hooks/chat/useStartGroupDm';
import { Avatar } from '@/components/chat/main/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface NewGroupDmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

const MAX_OTHERS = 7;

export function NewGroupDmModal({ isOpen, onClose, onCreated }: NewGroupDmModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { groups } = useChatPeople();
  const { hits } = useChatSearch(query, 'people', 25);
  const startGroupDm = useStartGroupDm();

  // resource id → profile id (chat-people surface returns resource_inventory ids)
  const { data: idMap } = useQuery({
    queryKey: ['chat', 'resource-to-profile'],
    enabled: isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name')
        .eq('is_active', true)
        .not('profile_id', 'is', null);
      const map = new Map<string, { profileId: string; name: string | null }>();
      (data ?? []).forEach((r: any) => {
        if (r.profile_id) map.set(r.id, { profileId: r.profile_id, name: r.name });
      });
      return map;
    },
  });

  // Candidates: profile-id keyed. From search hits when query active, else from
  // the roster, mapped through resource→profile. Excludes the caller.
  const candidates = useMemo(() => {
    if (query.trim().length >= 2) {
      return hits
        .filter((h) => h.resultType === 'person' && (!user || h.id !== user.id))
        .map((h) => ({ profileId: h.id, name: h.title, sub: h.subtitle ?? '' }));
    }
    if (!idMap) return [];
    return groups.flatMap((g) => g.people).flatMap((p) => {
      const m = idMap.get(p.id);
      if (!m || !user || m.profileId === user.id) return [];
      return [{ profileId: m.profileId, name: p.name, sub: p.role ?? '' }];
    }).slice(0, 50);
  }, [query, hits, groups, idMap, user]);

  const toggle = (id: string) => {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= MAX_OTHERS) {
        setError(`Up to ${MAX_OTHERS} people (you make ${MAX_OTHERS + 1}).`);
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submit = async () => {
    if (selected.size < 2) {
      setError('Pick at least 2 people to start a group DM.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const convId = await startGroupDm.mutateAsync(Array.from(selected));
      onCreated(convId);
      onClose();
      setSelected(new Set());
      setQuery('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not start group DM');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>New group message</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 8 }}>
              Pick 2–{MAX_OTHERS} teammates. You're added automatically.
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                marginBottom: 12,
              }}
            />
            {error && (
              <div style={{
                fontSize: 12,
                color: 'var(--ds-text-danger, #AE2A19)',
                marginBottom: 8,
              }}>{error}</div>
            )}
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {candidates.length === 0 && (
                <div style={{ padding: 16, color: 'var(--ds-text-subtle, #44546F)', fontSize: 13 }}>
                  No matches.
                </div>
              )}
              {candidates.map((c) => {
                const checked = selected.has(c.profileId);
                return (
                  <button
                    key={c.profileId}
                    type="button"
                    onClick={() => toggle(c.profileId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '8px 8px',
                      background: checked
                        ? 'var(--ds-background-selected, #E9F2FE)'
                        : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      style={{ accentColor: 'var(--ds-icon-brand, #0C66E4)' }}
                    />
                    <Avatar name={c.name} seed={c.profileId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{c.name}</div>
                      {c.sub && (
                        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>{c.sub}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              isDisabled={selected.size < 2 || submitting}
              onClick={submit}
            >
              {submitting
                ? 'Starting…'
                : selected.size < 2
                ? 'Start group'
                : `Start group with ${selected.size}`}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default NewGroupDmModal;
