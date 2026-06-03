/**
 * QuickSwitcher — ⌘K command palette ("Jump to…").
 *
 * Reproduces the quick switcher in /tmp/catalyst-chat-mockups/chat-dock.html:
 *  - Search row with ⌘K chip + magnifier + caret
 *  - Grouped results: People / Channels / Tickets
 *  - One selected row at a time with a 3px brand left rail
 *  - Footer hint: ↑↓ navigate · ↵ open · esc close
 *
 * Filters people (useChatPeople) and conversations (useConversations) as the user types.
 * Keyboard: up/down move selection, enter picks, esc closes.
 *
 * ADS: @atlaskit/modal-dialog shell, @atlaskit/textfield search. Colors via var(--ds-*).
 * Avatars are colored-initials circles (never <img>).
 */
import React from 'react';
import ModalDialog from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useConversations } from '@/hooks/chat/useConversations';
import type { ChatConversation, ChatPerson, ChatPresence } from '@/types/chat';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onPick: (kind: 'person' | 'channel' | 'ticket', id: string) => void;
}

type Result =
  | { kind: 'person'; id: string; primary: string; person: ChatPerson }
  | { kind: 'channel'; id: string; primary: string; conv: ChatConversation }
  | { kind: 'ticket'; id: string; primary: string; conv: ChatConversation };

const PRESENCE_DOT: Record<ChatPresence, string> = {
  available: 'var(--ds-icon-success, #22A06B)',
  busy: 'var(--ds-icon-danger, #E34935)',
  away: 'var(--ds-icon-warning, #E2B203)',
  offline: 'var(--ds-icon-disabled, #8590A2)',
  on_leave: 'var(--ds-icon-disabled, #8590A2)',
};

const AVATAR_PALETTE = [
  'var(--ds-background-accent-blue-bolder, #0C66E4)',
  'var(--ds-background-accent-green-bolder, #22A06B)',
  'var(--ds-background-accent-purple-bolder, #6E5DC6)',
  'var(--ds-background-accent-red-bolder, #E34935)',
];

function hashIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % mod;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const subtlestText = 'var(--ds-text-subtlest, #6B778C)';

export function QuickSwitcher({ isOpen, onClose, onPick }: QuickSwitcherProps) {
  const { groups } = useChatPeople();
  const { conversations } = useConversations();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const people = React.useMemo<ChatPerson[]>(
    () => (groups ?? []).flatMap((g) => g.people),
    [groups],
  );

  const q = query.trim().toLowerCase();

  const results = React.useMemo<Result[]>(() => {
    const needle = q.replace(/^#/, '');
    const peopleResults: Result[] = people
      .filter((p) => !q || p.name.toLowerCase().includes(needle) || (p.role ?? '').toLowerCase().includes(needle))
      .map((p) => ({
        kind: 'person' as const,
        id: p.id,
        primary: p.role ? `${p.name} · ${p.role}` : p.name,
        person: p,
      }));

    const channelResults: Result[] = (conversations ?? [])
      .filter((c) => c.kind === 'channel')
      .filter((c) => !q || c.title.toLowerCase().includes(needle))
      .map((c) => ({ kind: 'channel' as const, id: c.id, primary: `# ${c.title}`, conv: c }));

    const ticketResults: Result[] = (conversations ?? [])
      .filter((c) => c.kind === 'ticket')
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(needle) ||
          (c.ticketKey ?? '').toLowerCase().includes(needle),
      )
      .map((c) => ({
        kind: 'ticket' as const,
        id: c.id,
        primary: c.ticketKey ? `${c.ticketKey} · ${c.title}` : c.title,
        conv: c,
      }));

    return [...peopleResults, ...channelResults, ...ticketResults];
  }, [people, conversations, q]);

  React.useEffect(() => {
    setActiveIndex((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
  }, [results.length]);

  if (!isOpen) return null;

  const pick = (r: Result) => {
    onPick(r.kind, r.id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) pick(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Render results with section headings injected at group boundaries.
  let renderedKind: Result['kind'] | null = null;
  const headingLabel: Record<Result['kind'], string> = {
    person: 'People',
    channel: 'Channels',
    ticket: 'Tickets',
  };
  const metaLabel: Record<Result['kind'], string> = {
    person: 'Person',
    channel: 'Channel',
    ticket: 'Ticket',
  };

  return (
    <ModalDialog onClose={onClose} width={560} autoFocus={false} shouldCloseOnOverlayClick>
      <div onKeyDown={handleKeyDown}>
        {/* Search row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          }}
        >
          <span
            style={{
              height: 24,
              padding: '0 8px',
              borderRadius: 3,
              background: 'var(--ds-background-neutral, #F1F2F4)',
              border: '1px solid var(--ds-border, #DFE1E6)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ds-text-subtle, #44546F)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ⌘K
          </span>
          <div style={{ flex: 1 }}>
            <Textfield
              autoFocus
              value={query}
              onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="Jump to…"
              aria-label="Jump to a person, channel, or ticket"
              elemBeforeInput={
                <span style={{ display: 'inline-flex', paddingLeft: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={subtlestText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
              }
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 0' }} role="listbox" aria-label="Quick switcher results">
          {results.length === 0 ? (
            <div style={{ padding: '24px 16px', fontSize: 14, color: subtlestText }}>
              {q ? `No matches for “${query}”.` : 'Start typing to jump to a person, channel, or ticket.'}
            </div>
          ) : (
            results.map((r, idx) => {
              const showHeading = r.kind !== renderedKind;
              renderedKind = r.kind;
              const isActive = idx === activeIndex;
              return (
                <React.Fragment key={`${r.kind}-${r.id}`}>
                  {showHeading && (
                    <div style={{ padding: '8px 16px 4px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: subtlestText }}>{headingLabel[r.kind]}</span>
                    </div>
                  )}
                  <div
                    role="option"
                    aria-selected={isActive}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => pick(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 16px',
                      position: 'relative',
                      cursor: 'pointer',
                      background: isActive ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                    }}
                  >
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: 'var(--ds-border-selected, #0C66E4)',
                        }}
                      />
                    )}
                    {r.kind === 'person' ? (
                      <span style={{ position: 'relative', flex: '0 0 28px', width: 28, height: 28 }}>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ds-text-inverse, #FFFFFF)',
                            fontSize: 11,
                            fontWeight: 600,
                            background: AVATAR_PALETTE[hashIndex(r.id, AVATAR_PALETTE.length)],
                          }}
                        >
                          {initials(r.person.name)}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: PRESENCE_DOT[r.person.presence],
                            border: '2px solid var(--ds-surface, #FFFFFF)',
                          }}
                        />
                      </span>
                    ) : (
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          flex: '0 0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ds-text-inverse, #FFFFFF)',
                          fontSize: r.kind === 'ticket' ? 8 : 12,
                          fontWeight: 700,
                          background:
                            r.kind === 'ticket'
                              ? 'var(--ds-background-brand-bold, #0C66E4)'
                              : 'var(--ds-background-accent-purple-bolder, #6E5DC6)',
                        }}
                      >
                        {r.kind === 'ticket'
                          ? ((r.conv.ticketKey ?? r.conv.title).split('-').pop() ?? '').slice(0, 4)
                          : '#'}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--ds-text, #172B4D)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.primary}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: subtlestText, flex: '0 0 auto' }}>{metaLabel[r.kind]}</span>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 16px',
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--ds-surface-sunken, #F7F8F9)',
            fontSize: 12,
            color: subtlestText,
          }}
        >
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </ModalDialog>
  );
}

export default QuickSwitcher;
