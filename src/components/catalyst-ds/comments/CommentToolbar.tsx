import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Reply,
  SmilePlus,
  Edit,
  MoreHorizontal,
  Copy,
  Trash2,
} from '@/lib/atlaskit-icons';
import { toast } from '@/components/ui/sonner';
import { EmojiPicker } from '@/components/catalyst-detail-views/shared/sections/Description/_components/EmojiPicker/EmojiPicker';
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition';
import type { CdsCommentReaction } from '../types';

const MENU_WIDTH = 168;
const MENU_HEIGHT = 96;
const EMOJI_PICKER_WIDTH = 320;
const EMOJI_PICKER_HEIGHT = 360;

/**
 * CommentToolbar — actions row beneath every comment.
 *
 * Layout (left → right):
 *   [Reaction chip] [Reaction chip] … [Reply] [👍/active] [😊+] [Edit] [⋯]
 *
 * Reactions:
 *   - Each reaction is one chip per emoji with an aggregate count.
 *   - Chips with `hasMine = true` get a darker blue border to signal
 *     the current user has reacted; clicking toggles it off.
 *   - The thumbs-up toolbar button is a quick-add for 👍 — when the
 *     current user already reacted with 👍, the BUTTON itself turns
 *     into the active chip style. There's NO duplicate chip rendered
 *     in this case — the button IS the chip.
 *   - The 😊+ button opens the existing EmojiPicker (panel mode); the
 *     picker is repositioned on scroll/resize so it sticks to the
 *     trigger button.
 *
 * Edit / Copy link / Delete behave as before; the ⋯ dropdown also
 * recomputes its position on scroll/resize and opens upward when the
 * viewport doesn't have room below.
 */
export interface CommentToolbarProps {
  /** Aggregated reactions for the comment. */
  reactions?: CdsCommentReaction[];
  /** Toggle the given emoji for the current viewer. `hasMine` is the
   *  current state — true → remove, false → add. */
  onToggleReaction?: (emoji: string, hasMine: boolean) => void | Promise<void>;
  onReply?: () => void;
  onEdit?: () => void;
  onCopyLink?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ active, className = '', style, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        border: active
          ? '1.5px solid var(--ds-border-selected)'
          : '1.5px solid transparent',
        borderRadius: 6,
        background: 'transparent',
        color: active
          ? 'var(--ds-text-selected)'
          : 'var(--ds-text-subtle)',
        cursor: 'pointer',
        transition:
          'background 100ms ease, color 100ms ease, border-color 100ms ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (active) return;
        (e.currentTarget as HTMLButtonElement).style.background =
          'var(--ds-background-neutral-subtle-hovered)';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
      className={className}
      {...props}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
        }}
      >
        {children}
      </span>
    </button>
  ),
);
IconButton.displayName = 'CommentToolbar.IconButton';

/** Light-blue pill showing an emoji + count. Border darkens when the
 *  current viewer is one of the reactors. */
function ReactionChip({
  emoji,
  count,
  hasMine,
  onClick,
}: {
  emoji: string;
  count: number;
  hasMine: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hasMine ? 'Remove your reaction' : `Add your ${emoji}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 8px',
        border: hasMine
          ? '1.5px solid var(--ds-border-selected)'
          : '1px solid var(--ds-border-information)',
        borderRadius: 9999,
        background: 'var(--ds-background-information)',
        color: hasMine
          ? 'var(--ds-text-selected)'
          : 'var(--ds-text-information)',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 500,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-400)' }}>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

/**
 * Quick-add shortcuts shown when a comment has NO reactions yet — one
 * click adds the emoji. Matches Jira's reaction toolbar; the shortcuts
 * vanish the instant any reaction lands so the toolbar shows only
 * actual reaction chips after that.
 */
const SUGGESTED_REACTIONS = ['👍', '❤️', '👏', '🎉', '👀'] as const;

export function CommentToolbar({
  reactions = [],
  onToggleReaction,
  onReply,
  onEdit,
  onCopyLink,
  onDelete,
}: CommentToolbarProps) {
  // ── State for the ⋯ menu ───────────────────────────────────────
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const menuPos = useAnchoredPosition(menuTriggerRef, {
    open: menuOpen,
    menuWidth: MENU_WIDTH,
    menuHeight: MENU_HEIGHT,
  });

  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuTriggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // ── State for the 😊+ emoji picker ─────────────────────────────
  // Drives the EmojiPicker via {left, top, bottom} coords so we can
  // flip it above the trigger when there's no room below. The picker
  // computes its own top as `bottom + 4`, so we pass `bottom = top - 4`
  // to land the picker at the position our hook chose.
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const emojiTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const emojiPos = useAnchoredPosition(emojiTriggerRef, {
    open: emojiOpen,
    menuWidth: EMOJI_PICKER_WIDTH,
    menuHeight: EMOJI_PICKER_HEIGHT,
  });

  // ── Reaction helpers ───────────────────────────────────────────
  // Once ANY reaction exists on the comment, the suggestion row
  // disappears and the toolbar shows only chips + the emoji picker.
  // `optimisticHidden` flips the moment the user clicks any reaction
  // entry point (suggestion / picker / chip) so the suggestion row
  // vanishes BEFORE the server refetch — no perceived lag between
  // click and hide. The effect below resets the optimistic flag once
  // the server settles back to "no reactions" (e.g. the user toggled
  // their reaction OFF) so the suggestions re-appear.
  const hasAnyReactions = reactions.length > 0;
  const [optimisticHidden, setOptimisticHidden] = React.useState(false);
  React.useEffect(() => {
    if (!hasAnyReactions) setOptimisticHidden(false);
  }, [hasAnyReactions]);
  const hideSuggestions = hasAnyReactions || optimisticHidden;
  const visibleReactionChips = reactions;

  const handleToggle = React.useCallback(
    (emoji: string) => {
      if (!onToggleReaction) return;
      const existing = reactions.find((r) => r.emoji === emoji);
      const hasMine = !!existing?.hasMine;
      // Hide suggestions immediately — the server refetch lags by a
      // round trip, so we cover the gap with this local flag.
      setOptimisticHidden(true);
      void Promise.resolve(onToggleReaction(emoji, hasMine));
    },
    [onToggleReaction, reactions],
  );

  const handleEmojiPicked = React.useCallback(
    (entry: { char: string }) => {
      setEmojiOpen(false);
      handleToggle(entry.char);
    },
    [handleToggle],
  );

  const hasMenuItems = !!onCopyLink || !!onDelete;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
      }}
    >
      {onReply && (
        <IconButton onClick={onReply} aria-label="Reply" title="Reply">
          <Reply />
        </IconButton>
      )}

      {/* Reaction chips sit after Reply — when any reaction exists,
          this is where the chips appear, in front of the picker. */}
      {visibleReactionChips.map((r) => (
        <ReactionChip
          key={r.emoji}
          emoji={r.emoji}
          count={r.count}
          hasMine={r.hasMine}
          onClick={() => handleToggle(r.emoji)}
        />
      ))}

      {/* Suggested reaction shortcuts — only shown while the comment
          has zero reactions. The first click on any of these adds the
          reaction and hides the whole row, leaving the chips + picker
          to manage further changes. */}
      {onToggleReaction && !hideSuggestions && (
        <>
          {SUGGESTED_REACTIONS.map((emoji) => (
            <IconButton
              key={emoji}
              onClick={() => handleToggle(emoji)}
              aria-label={`React with ${emoji}`}
              title={`React with ${emoji}`}
            >
              <span style={{ fontSize: 'var(--ds-font-size-400)', lineHeight: 1 }}>{emoji}</span>
            </IconButton>
          ))}
        </>
      )}

      {onToggleReaction && (
        <>
          <IconButton
            ref={emojiTriggerRef}
            active={emojiOpen}
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label="Add reaction"
            aria-haspopup="dialog"
            aria-expanded={emojiOpen}
            title="Add reaction"
          >
            <SmilePlus />
          </IconButton>
          {emojiOpen && emojiPos && (
            <EmojiPicker
              mode="panel"
              coords={{
                left: emojiPos.left,
                top: 0,
                // EmojiPicker positions itself at `bottom + 4`; we
                // subtract 4 so the picker lands at our chosen top.
                bottom: emojiPos.top - 4,
              }}
              onSelect={handleEmojiPicked}
              onDismiss={() => setEmojiOpen(false)}
            />
          )}
        </>
      )}

      {onEdit && (
        <IconButton onClick={onEdit} aria-label="Edit" title="Edit">
          <Edit />
        </IconButton>
      )}

      {hasMenuItems && (
        <>
          <IconButton
            ref={menuTriggerRef}
            active={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More actions"
            title="More actions"
          >
            <MoreHorizontal />
          </IconButton>
          {menuOpen &&
            menuPos &&
            createPortal(
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: 'fixed',
                  top: menuPos.top,
                  left: menuPos.left,
                  width: 168,
                  background: 'var(--ds-surface-overlay)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: 6,
                  boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.16))',
                  zIndex: 2000,
                  padding: '4px 0',
                }}
              >
                {onCopyLink && (
                  <MenuItem
                    onClick={async () => {
                      setMenuOpen(false);
                      try {
                        await Promise.resolve(onCopyLink());
                        toast('Link copied to clipboard');
                      } catch {
                        toast.error('Could not copy link');
                      }
                    }}
                    icon={<Copy />}
                  >
                    Copy link
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    icon={<Trash2 />}
                  >
                    Delete
                  </MenuItem>
                )}
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}

function MenuItem({ icon, onClick, children }: MenuItemProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        border: 'none',
        background: hover
          ? 'var(--ds-background-neutral-subtle-hovered)'
          : 'transparent',
        color: 'var(--ds-text)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 400,
        textAlign: 'left',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          flexShrink: 0,
          color: 'var(--ds-text)',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  );
}
