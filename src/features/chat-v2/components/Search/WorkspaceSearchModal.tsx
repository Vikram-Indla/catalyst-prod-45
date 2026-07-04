/**
 * WorkspaceSearchModal — top-of-shell search overlay.
 *
 * Two states:
 *  • Empty query  → "Search in <current channel>" hint + Recent searches list.
 *  • With query   → People matches (up to 5) + "Show results for: <query>"
 *                   row + a Recent-messages preview (up to 3 matched messages).
 *
 * Pressing Enter (or clicking the "Show results for" row) commits the query
 * — the parent (ChatV2Shell) records it into recent searches and opens
 * `WorkspaceSearchResultsPanel` as a right rail.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AtIcon, ClockIcon, LockIcon, SearchIcon, XIcon } from '../shared/Icon';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { useWorkspacePeopleSearch, type PeopleHit } from '../../hooks/useWorkspacePeopleSearch';
import { useWorkspaceSearch, type WorkspaceSearchHit } from '../../hooks/useWorkspaceSearch';
import { formatActivityTime } from '../../lib/formatTimestamp';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface WorkspaceSearchModalProps {
  /** Placeholder text shown when the input is empty (also the workspace
   *  label used in the "Search in <workspace>" hint when no channel is
   *  active). */
  placeholder: string;
  /** Conversation name shown in the "Search in" hint chip — if undefined
   *  the workspace label is used instead. */
  currentConversationName?: string | null;
  /** Whether the current conversation is private (channel lock vs DM). */
  currentConversationPrivate?: boolean;
  recents: string[];
  onClose: () => void;
  /** Called when the user commits a query (Enter / clicks "Show results for"
   *  / picks a recent). */
  onSubmit: (query: string) => void;
  /** Called when the user picks a person row — opens/creates DM with them. */
  onSelectPerson?: (personId: string) => void;
  /** Called when the user picks a message row — jumps to that message. */
  onSelectMessage?: (hit: { id: string; conversationId: string; parentId: string | null }) => void;
}

export function WorkspaceSearchModal({
  placeholder,
  currentConversationName,
  currentConversationPrivate = false,
  recents,
  onClose,
  onSubmit,
  onSelectPerson,
  onSelectMessage,
}: WorkspaceSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>();
  const trimmed = query.trim();
  const showResults = trimmed.length > 0;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const commit = (q: string) => {
    const v = q.trim();
    if (!v) return;
    onSubmit(v);
  };

  return createPortal(
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Workspace search"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 48,
        zIndex: 'var(--cv2-modal-z, 1000)' as never,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(760px, 92vw)',
          maxHeight: '78vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-md)',
          boxShadow: 'var(--cv2-shadow-modal)',
          overflow: 'hidden',
          fontFamily: 'var(--cv2-font)',
        }}
      >
        <Input
          inputRef={inputRef}
          value={query}
          placeholder={placeholder}
          showClear={showResults}
          onChange={setQuery}
          onSubmit={() => commit(query)}
          onClose={onClose}
          onClear={() => setQuery('')}
        />

        <div style={{ overflowY: 'auto' }}>
          {!showResults ? (
            <EmptyState
              workspaceLabel={placeholder.replace(/^Search\s+/i, '')}
              currentConversationName={currentConversationName}
              currentConversationPrivate={currentConversationPrivate}
              recents={recents}
              onPickRecent={commit}
              onSubmitCurrent={() => commit(query)}
            />
          ) : (
            <TypingState
              query={trimmed}
              onCommit={() => commit(query)}
              onSelectPerson={onSelectPerson}
              onSelectMessage={onSelectMessage}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Input({
  inputRef,
  value,
  placeholder,
  showClear,
  onChange,
  onSubmit,
  onClose,
  onClear,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  placeholder: string;
  showClear: boolean;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--cv2-divider)',
      }}
    >
      <SearchIcon size={18} style={{ color: 'var(--cv2-text-subtle)' }} />
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          color: 'var(--cv2-text-strong)',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          font: 'var(--ds-font-body-large)',
          fontWeight: 500,
        }}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          style={pillBtnStyle()}
        >
          Clear
        </button>
      )}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        style={iconBtnStyle()}
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}

function EmptyState({
  workspaceLabel,
  currentConversationName,
  currentConversationPrivate,
  recents,
  onPickRecent,
  onSubmitCurrent,
}: {
  workspaceLabel: string;
  currentConversationName?: string | null;
  currentConversationPrivate: boolean;
  recents: string[];
  onPickRecent: (q: string) => void;
  onSubmitCurrent: () => void;
}) {
  const scopeName = currentConversationName ?? workspaceLabel;
  return (
    <>
      <ScopeRow
        scopeName={scopeName}
        scopePrivate={currentConversationPrivate}
        onSubmit={onSubmitCurrent}
      />
      <SectionLabel>Recent searches</SectionLabel>
      {recents.length === 0 ? (
        <div
          style={{
            padding: '12px 18px 20px',
            font: 'var(--ds-font-body-small)',
            color: 'var(--cv2-text-muted)',
          }}
        >
          No recent searches yet — try typing a name or word above.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: '4px 0 12px', listStyle: 'none' }}>
          {recents.map(q => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onPickRecent(q)}
                style={recentRowStyle()}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <ClockIcon size={16} style={{ color: 'var(--cv2-text-subtle)' }} />
                <span style={{ flex: 1, font: 'var(--ds-font-body)', color: 'var(--cv2-text)' }}>{q}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TypingState({
  query,
  onCommit,
  onSelectPerson,
  onSelectMessage,
}: {
  query: string;
  onCommit: () => void;
  onSelectPerson?: (personId: string) => void;
  onSelectMessage?: (hit: { id: string; conversationId: string; parentId: string | null }) => void;
}) {
  const { hits: people, isLoading: peopleLoading } = useWorkspacePeopleSearch(query);
  const { hits: messages, isLoading: messagesLoading } = useWorkspaceSearch(query);
  const topMessages = messages.slice(0, 3);

  return (
    <>
      {people.length > 0 && (
        <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
          {people.map((p, idx) => (
            <PeopleRow
              key={p.id}
              hit={p}
              query={query}
              primary={idx === 0}
              onSelect={onSelectPerson}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onCommit}
        style={{
          ...rowBtnStyle(),
          borderTop: people.length > 0 ? '1px solid var(--cv2-divider)' : 'none',
          paddingTop: people.length > 0 ? 14 : 12,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <SearchIcon size={16} style={{ color: 'var(--cv2-text-subtle)' }} />
        <span style={{ flex: 1, font: 'var(--ds-font-body)' }}>
          Show results for:{' '}
          <span style={{ color: 'var(--cv2-text-strong)', fontWeight: 700 }}>{query}</span>
        </span>
        <EnterChip />
      </button>

      <SectionLabel>Recent messages</SectionLabel>
      {messagesLoading ? (
        <div style={emptyHintStyle()}>Searching…</div>
      ) : topMessages.length === 0 ? (
        <div style={emptyHintStyle()}>
          {peopleLoading ? 'Searching…' : 'No recent messages match.'}
        </div>
      ) : (
        <ul style={{ margin: 0, padding: '4px 12px 14px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topMessages.map(m => (
            <MessageRow key={m.id} hit={m} query={query} onSelect={onSelectMessage} />
          ))}
        </ul>
      )}
    </>
  );
}

function PeopleRow({
  hit,
  query,
  primary,
  onSelect,
}: {
  hit: PeopleHit;
  query: string;
  primary: boolean;
  onSelect?: (personId: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(hit.id)}
        style={{
          ...rowBtnStyle(),
          background: primary ? 'var(--cv2-bg-row-hover)' : 'transparent',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = primary ? 'var(--cv2-bg-row-hover)' : 'transparent'; }}
      >
        <PresenceAvatar name={hit.name} size={20} />
        <span style={{ flex: 1, minWidth: 0, font: 'var(--ds-font-body)', color: 'var(--cv2-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <HighlightedText text={hit.name} query={query} bold />
          {hit.subName && hit.subName !== hit.name && (
            <span style={{ color: 'var(--cv2-text-muted)' }}>
              {' · '}
              <HighlightedText text={hit.subName} query={query} />
            </span>
          )}
        </span>
        {primary && <EnterChip />}
      </button>
    </li>
  );
}

function MessageRow({
  hit,
  query,
  onSelect,
}: {
  hit: WorkspaceSearchHit;
  query: string;
  onSelect?: (h: { id: string; conversationId: string; parentId: string | null }) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.({ id: hit.id, conversationId: hit.conversationId, parentId: hit.parentId })}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--cv2-bg-row-hover)',
          borderRadius: 8,
          display: 'flex',
          gap: 8,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
          fontFamily: 'inherit',
        }}
      >
        <PresenceAvatar name={hit.authorName} size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ font: 'var(--ds-font-body-small)', fontWeight: 700, color: 'var(--cv2-text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hit.authorName}
            </span>
            <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              in {hit.conversationTitle}
            </span>
            <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
              {formatActivityTime(hit.createdAt)}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', font: 'var(--ds-font-body-small)', color: 'var(--cv2-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <HighlightedText text={hit.body} query={query} />
          </p>
        </div>
      </button>
    </li>
  );
}

function ScopeRow({
  scopeName,
  scopePrivate,
  onSubmit,
}: {
  scopeName: string;
  scopePrivate: boolean;
  onSubmit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      style={{ ...rowBtnStyle(), padding: '12px 16px' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <SearchIcon size={16} style={{ color: 'var(--cv2-text-subtle)' }} />
      <span style={{ flex: 1, font: 'var(--ds-font-body)', color: 'var(--cv2-text)', display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        Search in
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '0px 8px',
            background: 'var(--cv2-bg-row-active)',
            color: 'var(--cv2-text-link)',
            borderRadius: 4,
            font: 'var(--ds-font-body-small)',
            fontWeight: 600,
            maxWidth: 360,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {scopePrivate ? <LockIcon size={12} /> : <AtIcon size={12} />}
          {scopeName}
        </span>
      </span>
      <EnterChip />
    </button>
  );
}

function HighlightedText({ text, query, bold = false }: { text: string; query: string; bold?: boolean }) {
  if (!query) return <span style={{ fontWeight: bold ? 700 : 'inherit' }}>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <span style={{ fontWeight: bold ? 700 : 'inherit' }}>{text}</span>;
  const before = text.slice(0, idx);
  const hit = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <span style={{ fontWeight: bold ? 700 : 'inherit' }}>
      {before}
      <mark style={{ background: 'var(--ds-background-warning)', color: 'inherit', padding: 0, borderRadius: 2 }}>{hit}</mark>
      {after}
    </span>
  );
}

function EnterChip() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0px 10px',
        background: 'transparent',
        color: 'var(--cv2-text-strong)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 4,
        font: 'var(--ds-font-body-small)',
        fontWeight: 600,
      }}
    >
      Enter
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 18px 6px',
        font: 'var(--ds-font-body-small)',
        fontWeight: 600,
        color: 'var(--cv2-text-muted)',
      }}
    >
      {children}
    </div>
  );
}

function rowBtnStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '8px 18px',
    background: 'transparent',
    color: 'var(--cv2-text)',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  };
}

function recentRowStyle(): React.CSSProperties {
  return {
    ...rowBtnStyle(),
    padding: '8px 18px',
  };
}

function pillBtnStyle(): React.CSSProperties {
  return {
    background: 'transparent',
    color: 'var(--cv2-text-subtle)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    font: 'var(--ds-font-body-small)',
    fontWeight: 600,
    padding: '4px 8px',
  };
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--cv2-text-subtle)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  };
}

function emptyHintStyle(): React.CSSProperties {
  return {
    padding: '12px 18px 22px',
    font: 'var(--ds-font-body-small)',
    color: 'var(--cv2-text-muted)',
  };
}
