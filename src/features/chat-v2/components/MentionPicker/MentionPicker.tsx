import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { useConversationMembers } from '@/hooks/chat/useConversationMembers';

export interface MentionEntry {
  /** Raw token to insert at the caret (without the leading '@'). */
  token: string;
  /** Display name shown to the user. */
  name: string;
  /** Secondary line; can equal name. */
  display: string;
  /** Avatar URL (people) or null (special). */
  avatarUrl: string | null;
  /** 'online' | 'away' | null. */
  presence: 'online' | 'away' | null;
  /** Right-aligned hint. */
  hint: string;
  /** True for @here / @channel etc. */
  special?: boolean;
}

interface MentionPickerProps {
  conversationId: string | null;
  query: string;
  anchorRect: DOMRect | null;
  onPick: (entry: MentionEntry) => void;
  onClose: () => void;
}

const PICKER_W = 480;
const ROW_H = 44;
const MAX_VISIBLE = 7;

const SPECIALS: MentionEntry[] = [
  {
    token: 'here',
    name: '@here',
    display: 'Notify every online member in this channel.',
    avatarUrl: null,
    presence: null,
    hint: 'Enter',
    special: true,
  },
  {
    token: 'channel',
    name: '@channel',
    display: 'Notify everyone in this channel.',
    avatarUrl: null,
    presence: null,
    hint: 'Enter',
    special: true,
  },
];

export function MentionPicker({
  conversationId,
  query,
  anchorRect,
  onPick,
  onClose,
}: MentionPickerProps) {
  const { data: members } = useConversationMembers(conversationId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const entries = useMemo<MentionEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const specials = SPECIALS.filter(s => !q || s.token.startsWith(q));
    const people: MentionEntry[] = (members ?? [])
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .map(m => ({
        token: m.name.replace(/\s+/g, ''),
        name: m.name || m.email || 'Unknown',
        display: m.name || m.email || 'Unknown',
        avatarUrl: null,
        presence: m.lastReadAt ? 'online' : null,
        hint: 'Not in channel',
      }));
    return [...specials, ...people];
  }, [members, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (entries.length === 0) {
        if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIdx(i => (i + 1) % entries.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIdx(i => (i - 1 + entries.length) % entries.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const entry = entries[activeIdx];
        if (entry) onPick(entry);
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [entries, activeIdx, onPick, onClose]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  if (!anchorRect) return null;
  if (entries.length === 0) return null;

  const visibleCount = Math.min(entries.length, MAX_VISIBLE);
  const height = visibleCount * ROW_H + 8;
  const top = Math.max(12, anchorRect.top - height - 8);
  let left = anchorRect.left;
  if (left + PICKER_W > window.innerWidth - 12) left = window.innerWidth - PICKER_W - 12;
  if (left < 12) left = 12;

  return createPortal(
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Mention picker"
      style={{
        position: 'fixed',
        top,
        left,
        width: PICKER_W,
        maxHeight: height,
        overflowY: 'auto',
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: 4,
        fontFamily: 'var(--cv2-font)',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      {entries.slice(0, MAX_VISIBLE).map((entry, idx) => (
        <MentionRow
          key={entry.special ? `s-${entry.token}` : `p-${entry.token}-${idx}`}
          entry={entry}
          active={idx === activeIdx}
          onMouseEnter={() => setActiveIdx(idx)}
          onClick={() => onPick(entry)}
        />
      ))}
    </div>,
    document.body,
  );
}

function MentionRow({
  entry,
  active,
  onMouseEnter,
  onClick,
}: {
  entry: MentionEntry;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        height: ROW_H,
        padding: '0 12px',
        background: active ? 'var(--cv2-bg-row-hover)' : 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      {entry.special ? (
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--cv2-bg-row-active)',
            color: 'var(--cv2-text-subtle)',
            borderRadius: 4,
            font: 'var(--ds-font-body)',
          }}
        >
          📣
        </span>
      ) : (
        <PresenceAvatar
          src={entry.avatarUrl}
          name={entry.name}
          size={28}
          presence={entry.presence}
        />
      )}
      <span
        style={{
          font: 'var(--ds-font-body)',
          fontWeight: 700,
          color: 'var(--cv2-text-strong)',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.name}
      </span>
      {!entry.special && (
        <PresenceDot presence={entry.presence} />
      )}
      <span
        style={{
          font: 'var(--ds-font-body)',
          color: 'var(--cv2-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {entry.display}
      </span>
      <span
        style={{
          font: 'var(--ds-font-body-small)',
          color: 'var(--cv2-text-muted)',
          background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
          padding: active ? '2px 8px' : '0',
          borderRadius: 4,
          border: active ? '1px solid var(--cv2-border-strong)' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.hint}
      </span>
    </button>
  );
}

function PresenceDot({ presence }: { presence: 'online' | 'away' | null }) {
  if (presence === 'online') {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 4,
          background: 'var(--cv2-presence-online)',
        }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 4,
        background: 'transparent',
        border: '1.5px solid var(--cv2-text-muted)',
      }}
    />
  );
}
