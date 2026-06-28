import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@atlaskit/button/new';
import CommentAddIcon from '@atlaskit/icon/core/comment-add';
import EditIcon from '@atlaskit/icon/core/edit';
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
import BookmarkIcon from '@atlaskit/icon/core/book-with-bookmark';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './hover-toolbar.css';

interface EmojiCategory {
  id: string;
  label: string;
  entries: [string, string][];
}

// Named emoji categories. Search overrides categories (flat filter across all).
const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys & people',
    entries: [
      ['😄','smile happy grin'],['😂','laugh cry tears joy'],['🥲','smile tear happy sad'],
      ['😊','smile happy blush'],['🤣','rofl laugh rolling'],['😍','love eyes heart'],
      ['🤔','think hmm question'],['😮','wow surprised'],['😢','sad cry tear'],['😡','angry mad rage'],
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    entries: [
      ['👍','thumbs up like yes'],['👎','thumbs down no dislike'],['🙏','pray thanks hands'],
      ['👏','clap applause'],['🙌','hands raised celebrate'],['💪','muscle strong flex'],
      ['👀','eyes look watch'],['🤝','handshake deal'],
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    entries: [
      ['❤️','heart love red'],['🔥','fire hot'],['✅','check done yes tick'],['💯','hundred percent perfect'],
      ['✨','sparkle stars shine'],['💡','idea bulb light'],['⚡','lightning bolt fast'],
      ['🎯','target bullseye goal'],['💎','diamond gem'],['🌟','star gold shine'],['⭐','star'],
      ['💫','dizzy star sparkle'],['🌈','rainbow color'],['🔑','key lock'],['🔒','lock security'],
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    entries: [
      ['🎉','party celebrate tada'],['🚀','rocket launch ship'],['📌','pin pinned bookmark'],
      ['🏆','trophy win award'],['🎮','gaming controller play'],['💻','laptop computer'],
      ['📱','phone mobile'],['🔧','wrench tool fix'],['📊','chart graph data'],['📝','memo note write'],
      ['📅','calendar date'],['🎁','gift present'],['🎸','guitar music'],
    ],
  },
  {
    id: 'nature',
    label: 'Nature & food',
    entries: [
      ['🍎','apple red fruit'],['🍕','pizza food'],['☕','coffee hot drink'],['🌍','earth world globe'],
    ],
  },
];

const EMOJI_ENTRIES: [string, string][] = EMOJI_CATEGORIES.flatMap(c => c.entries);

// Neutral default frequently-used set, shown only when the user has no reaction history.
const DEFAULT_FREQUENT = ['👍', '✅', '😂', '❤️', '🎉', '👀'];

// Slack-parity one-click quick reactions.
const QUICK_REACTIONS = ['👍', '✅', '😂'];

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
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  // null until the reaction query resolves — no row shown before data lands.
  const [frequent, setFrequent] = useState<string[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeTab, setActiveTab] = useState<string>(EMOJI_CATEGORIES[0].id);

  // Load the current user's most-used reaction emojis (top 6).
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setFrequent(DEFAULT_FREQUENT);
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from('chat_message_reactions')
        .select('emoji')
        .eq('user_id', user.id);
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setFrequent(DEFAULT_FREQUENT);
        return;
      }
      const tally = new Map<string, number>();
      for (const row of data as { emoji: string }[]) {
        if (!row?.emoji) continue;
        tally.set(row.emoji, (tally.get(row.emoji) ?? 0) + 1);
      }
      const top = Array.from(tally.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([emoji]) => emoji);
      setFrequent(top.length > 0 ? top : DEFAULT_FREQUENT);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const q = query.trim().toLowerCase();
  const searchResults = useMemo(
    () => (q ? EMOJI_ENTRIES.filter(([, names]) => names.includes(q)).map(([e]) => e) : null),
    [q],
  );

  // Position: prefer above anchor, fallback below
  const PICKER_H = 300;
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

  const jumpTo = useCallback((id: string) => {
    setActiveTab(id);
    const section = sectionRefs.current[id];
    const body = bodyRef.current;
    if (section && body) {
      body.scrollTo({ top: section.offsetTop - body.offsetTop, behavior: 'smooth' });
    }
  }, []);

  const pick = useCallback((emoji: string) => { onSelect(emoji); onClose(); }, [onSelect, onClose]);

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

      {!q && (
        <div className="c-emoji-picker__tabs" role="tablist" aria-label="Emoji categories">
          {EMOJI_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`c-emoji-picker__tab${activeTab === cat.id ? ' c-emoji-picker__tab--active' : ''}`}
              role="tab"
              aria-selected={activeTab === cat.id}
              aria-label={cat.label}
              title={cat.label}
              onClick={() => jumpTo(cat.id)}
            >
              {cat.entries[0][0]}
            </button>
          ))}
        </div>
      )}

      {q ? (
        <div className="c-emoji-picker__body">
          <div className="c-emoji-picker__grid" role="listbox" aria-label="Search results">
            {(searchResults ?? []).map(emoji => (
              <button
                key={emoji}
                className="c-emoji-picker__btn"
                onClick={() => pick(emoji)}
                role="option"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
            {searchResults && searchResults.length === 0 && (
              <div className="c-emoji-picker__empty">No emoji found</div>
            )}
          </div>
        </div>
      ) : (
        <div className="c-emoji-picker__body" ref={bodyRef}>
          {frequent && frequent.length > 0 && (
            <div className="c-emoji-picker__section">
              <div className="c-emoji-picker__section-label">Frequently used</div>
              <div className="c-emoji-picker__grid" role="listbox" aria-label="Frequently used">
                {frequent.map(emoji => (
                  <button
                    key={`freq-${emoji}`}
                    className="c-emoji-picker__btn"
                    onClick={() => pick(emoji)}
                    role="option"
                    aria-label={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {EMOJI_CATEGORIES.map(cat => (
            <div
              key={cat.id}
              className="c-emoji-picker__section"
              ref={el => { sectionRefs.current[cat.id] = el; }}
            >
              <div className="c-emoji-picker__section-label">{cat.label}</div>
              <div className="c-emoji-picker__grid" role="listbox" aria-label={cat.label}>
                {cat.entries.map(([emoji]) => (
                  <button
                    key={`${cat.id}-${emoji}`}
                    className="c-emoji-picker__btn"
                    onClick={() => pick(emoji)}
                    role="option"
                    aria-label={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

// ── More-actions menu portal ────────────────────────────────────────────────

function MoreMenu({
  anchorRect,
  isOwn,
  isPinned,
  isSaved,
  onCopyLink,
  onCopyText,
  onMarkUnread,
  onTogglePin,
  onToggleSave,
  onForward,
  onEdit,
  onDelete,
  onClose,
}: {
  anchorRect: DOMRect;
  isOwn: boolean;
  isPinned: boolean;
  isSaved: boolean;
  onCopyLink: () => void;
  onCopyText: () => void;
  onMarkUnread: () => void;
  onTogglePin: () => void;
  onToggleSave: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const MENU_W = 240;
  const top = anchorRect.bottom + 4;
  const left = Math.max(8, Math.min(anchorRect.right - MENU_W, window.innerWidth - MENU_W - 8));

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

  const run = useCallback((fn: () => void) => () => { fn(); onClose(); }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="c-more-menu"
      style={{ top, left }}
      role="menu"
      aria-label="Message actions"
    >
      {confirmDelete ? (
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
      ) : (
        <>
          <button className="c-more-menu__item" role="menuitem" onClick={run(onCopyLink)}>
            <span className="c-more-menu__label">Copy link</span>
            <span className="c-more-menu__hint" aria-hidden="true">L</span>
          </button>
          <button className="c-more-menu__item" role="menuitem" onClick={run(onCopyText)}>
            <span className="c-more-menu__label">Copy text</span>
            <span className="c-more-menu__hint" aria-hidden="true">⌘C</span>
          </button>
          <button className="c-more-menu__item" role="menuitem" onClick={run(onMarkUnread)}>
            <span className="c-more-menu__label">Mark unread</span>
            <span className="c-more-menu__hint" aria-hidden="true">U</span>
          </button>
          <button className="c-more-menu__item" role="menuitem" onClick={run(onTogglePin)}>
            <span className="c-more-menu__label">{isPinned ? 'Unpin from conversation' : 'Pin to conversation'}</span>
            <span className="c-more-menu__hint" aria-hidden="true">P</span>
          </button>
          <button className="c-more-menu__item" role="menuitem" onClick={run(onToggleSave)}>
            <span className="c-more-menu__label">{isSaved ? 'Remove from later' : 'Save for later'}</span>
          </button>
          <button className="c-more-menu__item" role="menuitem" onClick={run(onForward)}>
            <span className="c-more-menu__label">Forward message…</span>
          </button>

          {isOwn && (
            <>
              <div className="c-more-menu__divider" role="separator" aria-hidden="true" />
              <button
                className="c-more-menu__item"
                role="menuitem"
                onClick={() => { onEdit(); onClose(); }}
              >
                <EditIcon label="" LEGACY_size="small" />
                <span className="c-more-menu__label">Edit message</span>
                <span className="c-more-menu__hint" aria-hidden="true">E</span>
              </button>
              <button
                className="c-more-menu__item c-more-menu__item--danger"
                role="menuitem"
                onClick={() => setConfirmDelete(true)}
              >
                Delete message
              </button>
            </>
          )}
        </>
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
  onCopyLink: () => void;
  onCopyText: () => void;
  onMarkUnread: () => void;
  onTogglePin: () => void;
  onToggleSave: () => void;
  onForward: () => void;
  onAskCaty?: () => void;
}

function CatyStarIcon({ label: _ }: { label: string }) {
  return (
    <span aria-hidden="true" style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 1, display: 'flex', alignItems: 'center', fontFamily: 'var(--ds-font-family-body)' }}>✦</span>
  );
}

interface Props extends HoverToolbarCallbacks {
  messageId: string;
  isOwn: boolean;
  isPinned: boolean;
  isSaved: boolean;
}

export function HoverToolbar({
  isOwn,
  isPinned,
  isSaved,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onCopyLink,
  onCopyText,
  onMarkUnread,
  onTogglePin,
  onToggleSave,
  onForward,
  onAskCaty,
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLDivElement>(null);

  const toolbarPinned = emojiOpen || moreOpen;

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
      className={`c-hover-tb${toolbarPinned ? ' c-hover-tb--pinned' : ''}`}
      role="toolbar"
      aria-label="Message actions"
      onClick={e => e.stopPropagation()}
    >
      {/* Quick reactions (Slack parity) */}
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          className="c-hover-tb__btn c-hover-tb__quick"
          onClick={() => onToggleReaction(emoji)}
          aria-label={`React with ${emoji}`}
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}

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

      {/* Save for later */}
      <IconButton
        icon={BookmarkIcon}
        label={isSaved ? 'Remove from later' : 'Save for later'}
        appearance="subtle"
        onClick={onToggleSave}
        isSelected={isSaved}
      />

      {/* Caty summarize — only rendered when parent wires onAskCaty */}
      {onAskCaty && (
        <IconButton
          icon={CatyStarIcon}
          label="Summarize with Caty"
          appearance="subtle"
          onClick={onAskCaty}
        />
      )}

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
          isPinned={isPinned}
          isSaved={isSaved}
          onCopyLink={onCopyLink}
          onCopyText={onCopyText}
          onMarkUnread={onMarkUnread}
          onTogglePin={onTogglePin}
          onToggleSave={onToggleSave}
          onForward={onForward}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  );
}
