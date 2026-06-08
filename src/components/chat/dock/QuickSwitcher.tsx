/**
 * QuickSwitcher — command palette ("Jump to…").
 *
 *  - Search row with magnifier + textfield
 *  - Real grouped results from chat_search RPC: People / Conversations /
 *    Messages / Projects
 *  - One selected row at a time with a 3px brand left rail
 *  - Footer hint: ↑↓ navigate · ↵ open · esc close
 *
 * On pick the parent resolves the conversation id:
 *   person   → chat_get_or_create_dm(target_user_id)
 *   project  → chat_get_or_create_project_channel(p_project_key)
 *   conversation / message → conversation_id
 *
 * ADS: @atlaskit/modal-dialog shell, @atlaskit/textfield search. Colors via var(--ds-*).
 * Avatars are colored-initials circles (never <img>).
 */
import React from 'react';
import ModalDialog from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useChatSearch } from '@/hooks/chat/useChatSearch';
import type { ChatSearchRow, ChatSearchType } from '@/hooks/chat/useChatSearch';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called when the user picks a result. The parent resolves person/project
   * picks into a conversation id via the chat RPCs.
   */
  onPick: (row: ChatSearchRow) => void;
}

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
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const subtlestText = 'var(--ds-text-subtlest, #6B778C)';

// Render order for grouped sections.
const SECTION_ORDER: ChatSearchType[] = ['person', 'conversation', 'message', 'project'];

const headingLabel: Record<ChatSearchType, string> = {
  person: 'People',
  conversation: 'Conversations',
  message: 'Messages',
  project: 'Projects',
};

const metaLabel: Record<ChatSearchType, string> = {
  person: 'Person',
  conversation: 'Conversation',
  message: 'Message',
  project: 'Project',
};

export function QuickSwitcher({ isOpen, onClose, onPick }: QuickSwitcherProps) {
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const { results, isLoading } = useChatSearch(query);

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Flatten grouped results into the keyboard-navigable order.
  const flat = React.useMemo<ChatSearchRow[]>(
    () => SECTION_ORDER.flatMap((t) => results[t]),
    [results],
  );

  React.useEffect(() => {
    setActiveIndex((i) => (flat.length === 0 ? 0 : Math.min(i, flat.length - 1)));
  }, [flat.length]);

  if (!isOpen) return null;

  const q = query.trim();

  const pick = (r: ChatSearchRow) => {
    onPick(r);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flat[activeIndex];
      if (r) pick(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
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
          <div style={{ flex: 1 }}>
            <Textfield
              autoFocus
              value={query}
              onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="Jump to…"
              aria-label="Jump to a person, conversation, message, or project"
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
          {flat.length === 0 ? (
            <div style={{ padding: '24px 16px', fontSize: 14, color: subtlestText }}>
              {isLoading
                ? 'Searching…'
                : q
                  ? `No matches for “${query}”.`
                  : 'Start typing to jump to a person, conversation, message, or project.'}
            </div>
          ) : (
            (() => {
              let renderedType: ChatSearchType | null = null;
              return flat.map((r, idx) => {
                const showHeading = r.result_type !== renderedType;
                renderedType = r.result_type;
                const isActive = idx === activeIndex;
                const isPerson = r.result_type === 'person';
                return (
                  <React.Fragment key={`${r.result_type}-${r.ref_id}-${idx}`}>
                    {showHeading && (
                      <div style={{ padding: '8px 16px 4px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: subtlestText }}>
                          {headingLabel[r.result_type]}
                        </span>
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
                      {isPerson ? (
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ds-text-inverse, #FFFFFF)',
                            fontSize: 11,
                            fontWeight: 600,
                            background: AVATAR_PALETTE[hashIndex(r.ref_id, AVATAR_PALETTE.length)],
                          }}
                        >
                          {initials(r.title)}
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
                            fontSize: r.result_type === 'message' ? 12 : 11,
                            fontWeight: 700,
                            background:
                              r.result_type === 'project'
                                ? 'var(--ds-background-accent-green-bolder, #22A06B)'
                                : r.result_type === 'message'
                                  ? 'var(--ds-background-brand-bold, #0C66E4)'
                                  : 'var(--ds-background-accent-purple-bolder, #6E5DC6)',
                          }}
                        >
                          {r.result_type === 'project' ? r.title.slice(0, 2).toUpperCase() : '#'}
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
                          {r.title}
                        </div>
                        {r.subtitle && (
                          <div
                            style={{
                              fontSize: 12,
                              color: subtlestText,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.subtitle}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: subtlestText, flex: '0 0 auto' }}>
                        {metaLabel[r.result_type]}
                      </span>
                    </div>
                  </React.Fragment>
                );
              });
            })()
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
