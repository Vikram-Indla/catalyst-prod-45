/**
 * NewMessageModal — "New message" people directory.
 *
 * Reproduces /tmp/catalyst-chat-mockups/chat-directory.html:
 *  - Recipient "To:" field with selected chips
 *  - Search input (people, #channels, tickets)
 *  - Roster grouped by presence (Available / Busy / Away / Offline) with role + Message affordance
 *  - A Channels group
 *  - Footer with keyboard hint + Cancel / Start conversation
 *
 * ADS: @atlaskit/modal-dialog shell, @atlaskit/textfield search, @atlaskit/button actions.
 * Colors via var(--ds-*) tokens; avatars are colored-initials circles (never <img>).
 */
import React, { useMemo, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useConversations } from '@/hooks/chat/useConversations';
import type { ChatPerson, ChatPresence } from '@/types/chat';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (personIds: string[]) => void;
  /** Selecting a person creates/opens a 1:1 DM with that user. */
  onStartDM?: (userId: string) => void;
  /** Selecting a channel opens that channel conversation. */
  onOpenChannel?: (conversationId: string) => void;
}

const PRESENCE_DOT: Record<ChatPresence, string> = {
  available: 'var(--ds-icon-success, #22A06B)',
  busy: 'var(--ds-icon-danger, #E34935)',
  away: 'var(--ds-icon-warning, #E2B203)',
  offline: 'var(--ds-icon-disabled, #8590A2)',
  on_leave: 'var(--ds-icon-disabled, #8590A2)',
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
  'var(--ds-background-accent-blue-bolder, #0C66E4)',
  'var(--ds-background-accent-green-bolder, #22A06B)',
  'var(--ds-background-accent-purple-bolder, #6E5DC6)',
  'var(--ds-background-accent-red-bolder, #E34935)',
  'var(--ds-background-accent-magenta-bolder, #CD519D)',
  'var(--ds-background-accent-teal-bolder, #1D7F8C)',
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
          color: 'var(--ds-text-inverse, #FFFFFF)',
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
          border: '2px solid var(--ds-surface, #FFFFFF)',
        }}
      />
    </span>
  );
}

export function NewMessageModal({
  isOpen,
  onClose,
  onStart,
  onStartDM,
  onOpenChannel,
}: NewMessageModalProps) {
  const { groups, isLoading } = useChatPeople();
  const { conversations } = useConversations();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allPeople = useMemo<ChatPerson[]>(
    () => (groups ?? []).flatMap((g) => g.people),
    [groups],
  );
  const peopleById = useMemo(() => {
    const map = new Map<string, ChatPerson>();
    allPeople.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPeople]);

  const channels = useMemo(
    () => (conversations ?? []).filter((c) => c.kind === 'channel'),
    [conversations],
  );

  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    const ordered = GROUP_ORDER
      .map((presence) => (groups ?? []).find((g) => g.presence === presence))
      .filter((g): g is NonNullable<typeof g> => Boolean(g) && g!.people.length > 0);
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
  }, [groups, q]);

  const filteredChannels = useMemo(() => {
    if (!q) return channels;
    const needle = q.replace(/^#/, '');
    return channels.filter((c) => c.title.toLowerCase().includes(needle));
  }, [channels, q]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const startDM = (userId: string) => {
    if (onStartDM) onStartDM(userId);
    else onStart([userId]);
    setSelectedIds([]);
    setQuery('');
    onClose();
  };

  const openChannel = (conversationId: string) => {
    if (onOpenChannel) onOpenChannel(conversationId);
    else onStart([conversationId]);
    setSelectedIds([]);
    setQuery('');
    onClose();
  };

  const handleStart = () => {
    if (selectedIds.length === 0) return;
    startDM(selectedIds[0]);
  };

  const hasResults = filteredGroups.length > 0 || filteredChannels.length > 0;
  const subtleText = 'var(--ds-text-subtle, #44546F)';
  const subtlestText = 'var(--ds-text-subtlest, #6B778C)';

  return (
    <ModalDialog onClose={onClose} width="medium" shouldScrollInViewport>
      <ModalHeader hasCloseButton>
        <ModalTitle>New message</ModalTitle>
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
            border: '2px solid var(--ds-border-focused, #0C66E4)',
            borderRadius: 3,
            minHeight: 40,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 14, color: subtleText, fontWeight: 500 }}>To:</span>
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
                  background: 'var(--ds-background-selected, #E9F2FE)',
                  color: 'var(--ds-text-selected, #0C66E4)',
                  borderRadius: 12,
                  padding: '4px 8px 4px 4px',
                  fontSize: 13,
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
                    fontSize: 14,
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
          <span style={{ fontSize: 14, color: subtlestText }}>
            {selectedIds.length === 0 ? 'Add people, or type a name' : ''}
          </span>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <Textfield
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search people, #channels, or tickets"
            isCompact
            aria-label="Search people, channels, or tickets"
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto', margin: '0 -8px' }}>
          {isLoading && (
            <div style={{ padding: '24px 8px', fontSize: 14, color: subtlestText }}>
              Loading people…
            </div>
          )}

          {!isLoading && !hasResults && (
            <div style={{ padding: '24px 8px', fontSize: 14, color: subtlestText }}>
              No people, channels, or tickets match “{query}”.
            </div>
          )}

          {/* Channels group */}
          {!isLoading && filteredChannels.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: '16px',
                  fontWeight: 700,
                  color: subtlestText,
                  padding: '12px 8px 4px',
                }}
              >
                Channels ({filteredChannels.length})
              </div>
              {filteredChannels.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openChannel(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openChannel(c.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 3,
                      flex: '0 0 32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--ds-background-neutral, #F1F2F4)',
                      color: subtleText,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    #
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)', lineHeight: '18px' }}>
                      # {c.title}
                    </div>
                    {c.lastMessagePreview && (
                      <div style={{ fontSize: 12, lineHeight: '16px', color: subtlestText }}>
                        {c.lastMessagePreview}
                      </div>
                    )}
                  </div>
                  <Button
                    appearance="default"
                    spacing="compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      openChannel(c.id);
                    }}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </>
          )}

          {/* Presence-grouped people */}
          {!isLoading &&
            filteredGroups.map((group) => (
              <React.Fragment key={group.presence}>
                <div
                  style={{
                    fontSize: 12,
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
                        background: isSelected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                      }}
                    >
                      <Avatar person={person} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)', lineHeight: '18px' }}>
                          {person.name}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: '16px', color: subtlestText }}>
                          {person.role}
                          {person.presenceNote ? ` · ${person.presenceNote}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
                        <Button
                          appearance="default"
                          spacing="compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            startDM(person.id);
                          }}
                        >
                          Message
                        </Button>
                        <span style={{ fontSize: 12, color: subtleText }}>
                          {PRESENCE_LABEL[person.presence]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
        </div>
      </ModalBody>

      <ModalFooter>
        <span style={{ fontSize: 12, color: subtlestText, marginRight: 'auto' }}>
          ↑↓ to navigate · ↵ to select
        </span>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" isDisabled={selectedIds.length === 0} onClick={handleStart}>
          Start conversation
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

export default NewMessageModal;
