import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@atlaskit/button/new';
import CommentAddIcon from '@atlaskit/icon/core/comment-add';
import EditIcon from '@atlaskit/icon/core/edit';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './hover-toolbar.css';

const EMOJI_ENTRIES: [string, string][] = [
  ['👍','thumbs up like yes'],['👎','thumbs down no dislike'],['❤️','heart love red'],
  ['😄','smile happy grin'],['😂','laugh cry tears joy'],['🥲','smile tear happy sad'],
  ['😊','smile happy blush'],['🙏','pray thanks hands'],['👏','clap applause'],['🔥','fire hot'],
  ['🎉','party celebrate tada'],['✅','check done yes tick'],['🚀','rocket launch ship'],
  ['💯','hundred percent perfect'],['🤔','think hmm question'],['😮','wow surprised'],
  ['😢','sad cry tear'],['😡','angry mad rage'],['🤣','rofl laugh rolling'],['😍','love eyes heart'],
  ['🙌','hands raised celebrate'],['💪','muscle strong flex'],['👀','eyes look watch'],
  ['✨','sparkle stars shine'],['💡','idea bulb light'],['⚡','lightning bolt fast'],
  ['🎯','target bullseye goal'],['📌','pin pinned bookmark'],['🔑','key lock'],['💎','diamond gem'],
  ['🌟','star gold shine'],['⭐','star'],['💫','dizzy star sparkle'],['🌈','rainbow color'],
  ['🍎','apple red fruit'],['🍕','pizza food'],['☕','coffee hot drink'],['🎸','guitar music'],
  ['🏆','trophy win award'],['🎮','gaming controller play'],['💻','laptop computer'],
  ['📱','phone mobile'],['🔧','wrench tool fix'],['📊','chart graph data'],
  ['📝','memo note write'],['📅','calendar date'],['🔒','lock security'],
  ['🌍','earth world globe'],['🤝','handshake deal'],['🎁','gift present'],
];
const ALL_EMOJIS = EMOJI_ENTRIES.map(([e]) => e);

// ── Emoji picker portal ─────────────────────────────────────────────────────

function EmojiPicker({
  anchorRect,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const emojis = q
    ? EMOJI_ENTRIES.filter(([, names]) => names.includes(q)).map(([e]) => e)
    : ALL_EMOJIS;

  // Position: prefer above anchor, fallback below
  const PICKER_H = 220;
  const PICKER_W = 272;
  const top = anchorRect.top - PICKER_H - 4 < 8
    ? anchorRect.bottom + 4
    : anchorRect.top - PICKER_H - 4;
  const left = Math.min(anchorRect.right - PICKER_W, window.innerWidth - PICKER_W - 8);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="c-emoji-picker"
      style={{ top, left }}
      role="dialog"
      aria-label="Emoji picker"
    >
      <input
        className="c-emoji-picker__search"
        placeholder="Search emoji…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
        aria-label="Search emoji"
      />
      <div className="c-emoji-picker__grid" role="listbox" aria-label="Emoji list">
        {emojis.map(emoji => (
          <button
            key={emoji}
            className="c-emoji-picker__btn"
            onClick={() => { onSelect(emoji); onClose(); }}
            role="option"
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

// ── More-actions menu portal ────────────────────────────────────────────────

function MoreMenu({
  anchorRect,
  isOwn,
  onEdit,
  onDelete,
  onClose,
}: {
  anchorRect: DOMRect;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const top = anchorRect.bottom + 4;
  const left = Math.max(8, anchorRect.right - 164);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (confirmDelete) setConfirmDelete(false);
        else onClose();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose, confirmDelete]);

  return createPortal(
    <div
      ref={ref}
      className="c-more-menu"
      style={{ top, left }}
      role="menu"
      aria-label="Message actions"
    >
      {isOwn && !confirmDelete && (
        <button
          className="c-more-menu__item"
          role="menuitem"
          onClick={() => { onEdit(); onClose(); }}
        >
          <EditIcon label="" LEGACY_size="small" />
          Edit message
        </button>
      )}
      {isOwn && !confirmDelete && (
        <button
          className="c-more-menu__item c-more-menu__item--danger"
          role="menuitem"
          onClick={() => setConfirmDelete(true)}
        >
          Delete message
        </button>
      )}
      {isOwn && confirmDelete && (
        <div className="c-more-menu__confirm" role="alertdialog" aria-label="Confirm delete">
          <span className="c-more-menu__confirm-label">Delete this message?</span>
          <div className="c-more-menu__confirm-actions">
            <button
              className="c-more-menu__item c-more-menu__item--danger"
              role="menuitem"
              onClick={() => { onDelete(); onClose(); }}
            >
              Delete
            </button>
            <button
              className="c-more-menu__item"
              role="menuitem"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!isOwn && (
        <button className="c-more-menu__item" role="menuitem" onClick={onClose}>
          Copy link
        </button>
      )}
    </div>,
    document.body,
  );
}

// ── HoverToolbar ────────────────────────────────────────────────────────────

export interface HoverToolbarCallbacks {
  onToggleReaction: (emoji: string) => void;
  onOpenThread: () => void;
  onEditMessage: () => void;
  onDeleteMessage: () => void;
}

interface Props extends HoverToolbarCallbacks {
  messageId: string;
  isOwn: boolean;
}

export function HoverToolbar({
  isOwn,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLDivElement>(null);

  const isPinned = emojiOpen || moreOpen;

  const handleEmojiTrigger = useCallback(() => {
    setMoreOpen(false);
    setEmojiOpen(v => !v);
  }, []);

  const handleMoreTrigger = useCallback(() => {
    setEmojiOpen(false);
    setMoreOpen(v => !v);
  }, []);

  return (
    <div
      className={`c-hover-tb${isPinned ? ' c-hover-tb--pinned' : ''}`}
      role="toolbar"
      aria-label="Message actions"
      onClick={e => e.stopPropagation()}
    >
      {/* Emoji picker toggle */}
      <button
        ref={emojiTriggerRef}
        className={`c-hover-tb__btn${emojiOpen ? ' c-hover-tb__btn--active' : ''}`}
        onClick={handleEmojiTrigger}
        aria-label="More emoji reactions"
        aria-expanded={emojiOpen}
        title="More reactions"
      >
        😊
      </button>

      <div className="c-hover-tb__divider" aria-hidden="true" />

      {/* Reply in thread */}
      <IconButton
        icon={CommentAddIcon}
        label="Reply in thread"
        appearance="subtle"
        onClick={onOpenThread}
      />

      {/* More actions */}
      <div ref={moreTriggerRef} style={{ display: 'inline-flex' }}>
        <IconButton
          icon={ShowMoreHorizontalIcon}
          label="More actions"
          appearance="subtle"
          onClick={handleMoreTrigger}
          isSelected={moreOpen}
        />
      </div>

      {/* Portals */}
      {emojiOpen && emojiTriggerRef.current && (
        <EmojiPicker
          anchorRect={emojiTriggerRef.current.getBoundingClientRect()}
          onSelect={onToggleReaction}
          onClose={() => setEmojiOpen(false)}
        />
      )}

      {moreOpen && moreTriggerRef.current && (
        <MoreMenu
          anchorRect={moreTriggerRef.current.getBoundingClientRect()}
          isOwn={isOwn}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  );
}
