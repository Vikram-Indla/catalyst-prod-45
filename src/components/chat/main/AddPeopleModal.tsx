/**
 * AddPeopleModal — picker for adding profiles to a conversation
 * (ticket thread, channel, or group DM). Calls chat_add_member RPC
 * per selected profile. Uses chat_search (scope=people) to find
 * candidates; falls back to the chat-people roster if the query is empty.
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
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useChatSearch } from '@/hooks/chat/useChatSearch';
import { useChatAddMember } from '@/hooks/chat/useChatActions';
import { Avatar } from './avatar';

export interface AddPeopleModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Profile IDs already in the conversation — hidden from the picker. */
  excludeProfileIds?: string[];
}

export function AddPeopleModal({
  conversationId,
  isOpen,
  onClose,
  excludeProfileIds = [],
}: AddPeopleModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { groups } = useChatPeople();
  const { hits } = useChatSearch(query, 'people', 25);
  const addMember = useChatAddMember();

  const exclude = useMemo(() => new Set(excludeProfileIds), [excludeProfileIds]);

  const candidates = useMemo(() => {
    if (query.trim().length >= 2) {
      return hits
        .filter((h) => h.resultType === 'person' && !exclude.has(h.id))
        .map((h) => ({ id: h.id, name: h.title, email: h.subtitle ?? '' }));
    }
    // No query: show roster.
    const all = groups.flatMap((g) => g.people);
    return all
      .filter((p) => !exclude.has(p.id))
      .slice(0, 50)
      .map((p) => ({ id: p.id, name: p.name, email: p.role ?? '' }));
  }, [query, hits, groups, exclude]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      for (const userId of Array.from(selected)) {
        await addMember.mutateAsync({ convId: conversationId, userId });
      }
      onClose();
      setSelected(new Set());
      setQuery('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Add people</ModalTitle>
          </ModalHeader>
          <ModalBody>
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
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {candidates.length === 0 && (
                <div style={{ padding: 16, color: 'var(--ds-text-subtle, #44546F)', fontSize: 13 }}>
                  No matches.
                </div>
              )}
              {candidates.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
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
                    <Avatar name={c.name} seed={c.id} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{c.name}</div>
                      {c.email && (
                        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>{c.email}</div>
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
              isDisabled={selected.size === 0 || submitting}
              onClick={submit}
            >
              {submitting
                ? 'Adding…'
                : selected.size === 0
                ? 'Add people'
                : `Add ${selected.size}`}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

export default AddPeopleModal;
