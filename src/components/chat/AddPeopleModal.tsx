/**
 * AddPeopleModal — add people to an existing conversation.
 *
 * Reuses the NewMessageModal people-picker UX: the same useChatPeople roster,
 * presence grouping, search, selected-chip "To:" field and multi-select rows.
 * Already-existing members (existingMemberIds) are filtered out so you can only
 * add new people. On confirm it calls useAddMembers().addMembers then closes.
 *
 * ADS: @atlaskit/modal-dialog shell, @atlaskit/textfield search, @atlaskit/button
 * actions. Colors via var(--ds-*) tokens; avatars are colored-initials circles.
 */
import React, { useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useAddMembers } from '@/hooks/chat/useAddMembers';
import type { ChatPerson, ChatPresence } from '@/types/chat';

interface AddPeopleModalProps {
  isOpen: boolean;
  conversationId: string;
  onClose: () => void;
  /** Members already in the conversation — excluded from the picker. */
  existingMemberIds?: string[];
}

const PRESENCE_DOT: Record<ChatPresence, string> = {
  available: 'var(--ds-icon-success)',
  busy: 'var(--ds-icon-danger)',
  away: 'var(--ds-icon-warning)',
  offline: 'var(--ds-icon-disabled)',
  on_leave: 'var(--ds-icon-disabled)',
};

const PRESENCE_LABEL: Record<ChatPresence, string> = {
  available: 'Available',
  busy: 'Busy',
  away: 'Away',
  offline: 'Offline',
  on_leave: 'On leave',
};

const GROUP_ORDER: ChatPresence[] = ['available', 'busy', 'away', 'offline', 'on_leave'];

const AVATAR_PALETTE = [
  'var(--ds-background-accent-blue-bolder)',
  'var(--ds-background-accent-green-bolder)',
  'var(--ds-background-accent-purple-bolder)',
  'var(--ds-background-accent-red-bolder)',
  'var(--ds-background-accent-magenta-bolder)',
  'var(--ds-background-accent-teal-bolder)',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Avatar({ person, size = 32 }: { person: ChatPerson; size?: number }) {
  return (
    <span style={{ position: 'relative', flex: `0 0 ${size}px`, width: size, height: size }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-text-inverse)',
          fontSize: size <= 24 ? 9 : 12,
          fontWeight: 600,
          background: avatarColor(person.id),
        }}
      >
        {initials(person.name)}
      </span>
      <span
        style={{
          position: 'absolute',
          right: -1,
          bottom: -1,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: PRESENCE_DOT[person.presence],
          border: '2px solid var(--ds-surface)',
        }}
      />
    </span>
  );
}

export function AddPeopleModal({
  isOpen,
  conversationId,
  onClose,
  existingMemberIds = [],
}: AddPeopleModalProps) {
  const { groups, isLoading } = useChatPeople();
  const { addMembers } = useAddMembers();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const existing = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);

  const allPeople = useMemo<ChatPerson[]>(
    () => (groups ?? []).flatMap((g) => g.people),
    [groups],
  );
  const peopleById = useMemo(() => {
    const map = new Map<string, ChatPerson>();
    allPeople.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPeople]);

  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    const ordered = GROUP_ORDER
      .map((presence) => (groups ?? []).find((g) => g.presence === presence))
      .filter((g): g is NonNullable<typeof g> => Boolean(g) && g!.people.length > 0)
      .map((g) => ({ ...g, people: g.people.filter((p) => !existing.has(p.id)) }))
      .filter((g) => g.people.length > 0);
    if (!q) return ordered;
    return ordered
      .map((g) => ({
        ...g,
        people: g.people.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.role ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.people.length > 0);
  }, [groups, q, existing]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const reset = () => {
    setSelectedIds([]);
    setQuery('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await addMembers(conversationId, selectedIds);
    } catch {
      // defensive: chat pattern surfaces nothing on failure
    } finally {
      setIsSaving(false);
      reset();
      onClose();
    }
  };

  const hasResults = filteredGroups.length > 0;
  const subtleText = 'var(--ds-text-subtle)';
  const subtlestText = 'var(--ds-text-subtlest)';

  return (
    <ModalDialog onClose={handleClose} width="medium" shouldScrollInViewport>
      <ModalHeader hasCloseButton>
        <ModalTitle>Add people</ModalTitle>
      </ModalHeader>

      <ModalBody>
        {/* To: field with chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            padding: '8px 12px',
            border: '2px solid var(--ds-border-focused)',
            borderRadius: 3,
            minHeight: 40,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: subtleText, fontWeight: 500 }}>To:</span>
          {selectedIds.map((id) => {
            const person = peopleById.get(id);
            if (!person) return null;
            return (
              <span
                key={id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--ds-background-selected)',
                  color: 'var(--ds-text-selected)',
                  borderRadius: 12,
                  padding: '4px 8px 4px 4px',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: 500,
                }}
              >
                <Avatar person={person} size={20} />
                {person.name}
                <button
                  type="button"
                  aria-label={`Remove ${person.name}`}
                  onClick={() => toggle(id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-400)',
                    lineHeight: '14px',
                    opacity: 0.7,
                    color: 'inherit',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: subtlestText }}>
            {selectedIds.length === 0 ? 'Add people, or type a name' : ''}
          </span>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <Textfield
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search people"
            isCompact
            aria-label="Search people"
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto', margin: '0 -8px' }}>
          {isLoading && (
            <div style={{ padding: '24px 8px', fontSize: 'var(--ds-font-size-400)', color: subtlestText }}>
              Loading people…
            </div>
          )}

          {!isLoading && !hasResults && (
            <div style={{ padding: '24px 8px', fontSize: 'var(--ds-font-size-400)', color: subtlestText }}>
              {q ? `No people match “${query}”.` : 'Everyone is already in this conversation.'}
            </div>
          )}

          {!isLoading &&
            filteredGroups.map((group) => (
              <React.Fragment key={group.presence}>
                <div
                  style={{
                    fontSize: 'var(--ds-font-size-200)',
                    lineHeight: '16px',
                    fontWeight: 700,
                    color: subtlestText,
                    padding: '12px 8px 4px',
                  }}
                >
                  {PRESENCE_LABEL[group.presence]} ({group.people.length})
                </div>
                {group.people.map((person) => {
                  const isSelected = selectedIds.includes(person.id);
                  return (
                    <div
                      key={person.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggle(person.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle(person.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 8,
                        borderRadius: 3,
                        cursor: 'pointer',
                        background: isSelected ? 'var(--ds-background-selected)' : 'transparent',
                      }}
                    >
                      <Avatar person={person} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text)', lineHeight: '18px' }}>
                          {person.name}
                        </div>
                        <div style={{ fontSize: 'var(--ds-font-size-200)', lineHeight: '16px', color: subtlestText }}>
                          {person.role}
                          {person.presenceNote ? ` · ${person.presenceNote}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 'var(--ds-font-size-200)', color: subtleText, flex: '0 0 auto' }}>
                        {PRESENCE_LABEL[person.presence]}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
        </div>
      </ModalBody>

      <ModalFooter>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: subtlestText, marginRight: 'auto' }}>
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : ''}
        </span>
        <Button appearance="subtle" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          isDisabled={selectedIds.length === 0 || isSaving}
          onClick={handleAdd}
        >
          {isSaving ? 'Adding…' : 'Add'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

export default AddPeopleModal;
