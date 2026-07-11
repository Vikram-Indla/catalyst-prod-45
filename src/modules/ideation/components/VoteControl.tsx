/**
 * VoteControl — D9 non-canonical component (Ideation Phase 3 S2).
 *
 * No canonical equivalent exists: ReactionBar is emoji-reaction-only, not
 * vote+importance. Mirrors 04 §C.4 rail mock:
 * "👍 12 votes · Critical×3  [Vote ▾ importance]".
 *
 * Manual position + createPortal instead of @atlaskit/popup — same fix
 * StatusLozengeDropdown.tsx already documents for this exact failure mode:
 * "NOT @atlaskit/popup — Popper.js cannot find the trigger ... popup lands
 * at (0,0)". Confirmed by direct DOM inspection here too (both the Catalyst
 * Popup wrapper AND raw @atlaskit/popup with a native button trigger left
 * the popper wrapper stuck at its pre-`update()` default
 * `position:fixed; top:0; left:0`, no transform ever applied, in this
 * component tree) before reaching for this pattern.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import { token } from '@atlaskit/tokens';
import { useIdeationVotes, useCastIdeaVote } from '@/hooks/useIdeationVotes';
import type { VoteImportance } from '@/modules/ideation/types';

const IMPORTANCE_OPTIONS: { level: VoteImportance; label: string }[] = [
  { level: 'critical', label: 'Critical' },
  { level: 'important', label: 'Important' },
  { level: 'nice', label: 'Nice to have' },
  { level: 'none', label: 'No opinion' },
];

const IMPORTANCE_LABEL: Record<VoteImportance, string> = {
  critical: 'Critical',
  important: 'Important',
  nice: 'Nice to have',
  none: 'No opinion',
};

export function VoteControl({ ideaId }: { ideaId: string }) {
  const { data: votes, isLoading } = useIdeationVotes(ideaId);
  const castVote = useCastIdeaVote(ideaId);
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onMousedown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onMousedown);
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('mousedown', onMousedown);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [isOpen]);

  if (isLoading || !votes) return null;

  const toggle = () => {
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, left: r.left });
    }
    setIsOpen((o) => !o);
  };

  const handlePick = async (level: VoteImportance) => {
    setIsOpen(false);
    await castVote.mutateAsync(votes.myVote === level ? 'remove' : level);
  };

  const breakdown = IMPORTANCE_OPTIONS.filter((o) => votes.byImportance[o.level] > 0)
    .map((o) => `${IMPORTANCE_LABEL[o.level]}×${votes.byImportance[o.level]}`)
    .join(' · ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: token('color.text', 'var(--ds-text)'),
          font: '400 14px/20px var(--ds-font-family-body, "Atlassian Sans")',
        }}
      >
        <ThumbsUpIcon label="" color={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
        {votes.total} {votes.total === 1 ? 'vote' : 'votes'}
      </div>
      {breakdown && (
        <div
          style={{
            color: token('color.text.subtle', 'var(--ds-text-subtle)'),
            font: '400 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
          }}
        >
          {breakdown}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        data-testid="ideation-vote-trigger"
        onClick={toggle}
        disabled={castVote.isPending}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 12px',
          borderRadius: 3,
          border: votes.myVote ? 'none' : `1px solid ${token('color.border', 'var(--ds-border)')}`,
          background: votes.myVote ? token('color.background.brand.bold', 'var(--ds-background-brand-bold)') : token('color.background.neutral', 'var(--ds-background-neutral)'),
          color: votes.myVote ? token('color.text.inverse', 'var(--ds-text-inverse)') : token('color.text', 'var(--ds-text)'),
          font: '500 14px/20px var(--ds-font-family-body, "Atlassian Sans")',
          cursor: castVote.isPending ? 'default' : 'pointer',
        }}
      >
        {votes.myVote ? `Voted: ${IMPORTANCE_LABEL[votes.myVote]}` : 'Vote'}
        <ChevronDownIcon label="" primaryColor="currentColor" />
      </button>

      {isOpen && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Vote importance"
          data-testid="ideation-vote-menu"
          style={{
            position: 'fixed',
            top: anchor.top,
            left: anchor.left,
            minWidth: 180,
            padding: 4,
            background: token('elevation.surface.overlay', 'var(--ds-surface-overlay)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 'var(--ds-border-radius, 4px)',
            boxShadow: '0 8px 16px -4px var(--ds-shadow-overlay-perimeter), 0 0 1px var(--ds-shadow-overlay)',
            zIndex: 9999,
            fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
          }}
        >
          {IMPORTANCE_OPTIONS.map((o) => (
            <button
              key={o.level}
              type="button"
              role="menuitemradio"
              aria-checked={votes.myVote === o.level}
              onClick={() => handlePick(o.level)}
              data-testid={`ideation-vote-option-${o.level}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 3,
                font: '400 14px/20px var(--ds-font-family-body, "Atlassian Sans")',
                color: token('color.text', 'var(--ds-text)'),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {o.label}
              {votes.myVote === o.level && (
                <CheckMarkIcon label="" color={token('color.icon.brand', 'var(--ds-icon-brand)')} />
              )}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default VoteControl;
