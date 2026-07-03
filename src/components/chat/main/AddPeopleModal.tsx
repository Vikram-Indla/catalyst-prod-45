/**
 * AddPeopleModal — picker for adding profiles to a conversation
 * (ticket thread, channel, or group DM). Calls chat_add_member RPC
 * per selected profile.
 *
 * Candidate identity contract — ALL rows in this picker carry
 * `profileId` (profiles.id uuid). The chat_add_member RPC expects
 * a profiles.id. Resource_inventory ids are mapped → profile_id via
 * the same idMap pattern used in DockDirectory. (2026-06-08 fix —
 * previously the roster fallback used resource_inventory.id which
 * triggered a silent FK violation when inserting into
 * chat_conversation_members.)
 *
 * Already-added members are NOT hidden — they render with an "Added"
 * badge and a disabled checkbox so the user can see who's already in.
 */
import React, { useMemo, useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { DockPanel } from '@/components/chat/dock/DockPanel';
import Button from '@atlaskit/button/new';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useChatSearch } from '@/hooks/chat/useChatSearch';
import { useChatAddMember } from '@/hooks/chat/useChatActions';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar } from './avatar';

export interface AddPeopleModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Candidate {
  profileId: string;
  name: string;
  subtitle: string;
}

export function AddPeopleModal({
  conversationId,
  isOpen,
  onClose,
}: AddPeopleModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { groups } = useChatPeople();
  const { hits } = useChatSearch(query, 'people', 25);
  const { data: members = [] } = useConversationMembers(isOpen ? conversationId : null);
  const addMember = useChatAddMember();

  // resource_inventory.id → profile_id mapping. The roster from useChatPeople
  // returns resource_inventory rows; the chat_add_member RPC wants a profile id.
  const { data: idMap } = useQuery({
    queryKey: ['chat', 'resource-to-profile'],
    enabled: isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_inventory')
        .select('id, profile_id')
        .eq('is_active', true)
        .not('profile_id', 'is', null);
      const map = new Map<string, string>();
      (data ?? []).forEach((r: any) => {
        if (r.profile_id) map.set(r.id, r.profile_id);
      });
      return map;
    },
  });

  // Set of profile ids already in the conversation — used to render the
  // "Added" badge and disable the checkbox.
  const addedProfileIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  const candidates: Candidate[] = useMemo(() => {
    if (query.trim().length >= 2) {
      return hits
        .filter((h) => h.resultType === 'person')
        .map((h) => ({
          profileId: h.id,
          name: h.title,
          subtitle: h.subtitle ?? '',
        }));
    }
    const all = groups.flatMap((g) => g.people);
    if (!idMap) return [];
    return all
      .flatMap((p) => {
        const profileId = idMap.get(p.id);
        if (!profileId) return [];
        return [{ profileId, name: p.name, subtitle: p.role ?? '' } as Candidate];
      })
      .slice(0, 80);
  }, [query, hits, groups, idMap]);

  const toggle = (profileId: string) => {
    if (addedProfileIds.has(profileId)) return; // already added — no-op
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const errors: string[] = [];
      for (const profileId of Array.from(selected)) {
        try {
          await addMember.mutateAsync({ convId: conversationId, userId: profileId });
        } catch (e: any) {
          const msg = e?.message ?? 'Unknown error';
          errors.push(`${profileId.slice(0, 8)}: ${msg}`);
        }
      }
      if (errors.length > 0) {
        setError(`Could not add ${errors.length} of ${selected.size}: ${errors[0]}`);
        return; // stay open so user sees the error
      }
      onClose();
      setSelected(new Set());
      setQuery('');
    } finally {
      setSubmitting(false);
    }
  };

  const inDock =
    typeof document !== 'undefined' && !!document.querySelector('.cc-dock');

  const body = (
    <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 'var(--ds-font-size-100)',
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                marginBottom: 12,
              }}
            />
            {error && (
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-danger)',
                  background: 'var(--ds-background-danger)',
                  padding: '4px 10px',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
                role="alert"
              >
                {error}
              </div>
            )}
            <div style={inDock ? undefined : { maxHeight: 360, overflowY: 'auto' }}>
              {candidates.length === 0 && (
                <div style={{ padding: 16, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-100)' }}>
                  No matches.
                </div>
              )}
              {candidates.map((c) => {
                const isAdded = addedProfileIds.has(c.profileId);
                const checked = selected.has(c.profileId);
                return (
                  <button
                    key={c.profileId}
                    type="button"
                    onClick={() => toggle(c.profileId)}
                    disabled={isAdded}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '8px 8px',
                      background: checked
                        ? 'var(--ds-background-selected)'
                        : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      cursor: isAdded ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      opacity: isAdded ? 0.55 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked || isAdded}
                      readOnly
                      disabled={isAdded}
                      style={{ accentColor: 'var(--ds-icon-brand)' }}
                    />
                    <Avatar name={c.name} seed={c.profileId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </span>
                        {isAdded && (
                          <span
                            style={{
                              fontSize: 'var(--ds-font-size-50)',
                              fontWeight: 600,
                              padding: '0px 6px',
                              borderRadius: 3,
                              background: 'var(--ds-background-success)',
                              color: 'var(--ds-text-success)',
                            }}
                          >
                            Added
                          </span>
                        )}
                      </div>
                      {c.subtitle && (
                        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{c.subtitle}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
    </>
  );

  const footer = (
    <>
      <Button appearance="subtle" onClick={onClose}>
        Cancel
      </Button>
      <Button
        appearance="primary"
        isDisabled={selected.size === 0 || submitting}
        onClick={submit}
      >
        {submitting
          ? 'Adding…'
          : selected.size === 0
          ? 'Add people'
          : `Add ${selected.size}`}
      </Button>
    </>
  );

  if (inDock) {
    return isOpen ? (
      <DockPanel title="Add people" onClose={onClose} footer={footer}>
        {body}
      </DockPanel>
    ) : null;
  }

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Add people</ModalTitle>
          </ModalHeader>
          <ModalBody>{body}</ModalBody>
          <ModalFooter>{footer}</ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default AddPeopleModal;
