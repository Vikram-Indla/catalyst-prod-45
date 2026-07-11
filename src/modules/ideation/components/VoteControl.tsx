/**
 * VoteControl — D9 non-canonical component (Ideation Phase 3 S2).
 *
 * No canonical equivalent exists: ReactionBar is emoji-reaction-only, not
 * vote+importance. Built from Atlaskit primitives (Button, Popup) + ADS
 * tokens per D9's approval terms. Mirrors 04 §C.4 rail mock:
 * "👍 12 votes · Critical×3  [Vote ▾ importance]".
 */
import { useState } from 'react';
import Button from '@atlaskit/button/new';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import { token } from '@atlaskit/tokens';
import { Popup } from '@/components/ads/Popup';
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

  if (isLoading || !votes) return null;

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

      <Popup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom-start"
        trigger={(triggerProps) => (
          <Button
            {...triggerProps}
            onClick={() => setIsOpen((o) => !o)}
            isDisabled={castVote.isPending}
            iconAfter={ChevronDownIcon}
            appearance={votes.myVote ? 'primary' : 'default'}
            testId="ideation-vote-trigger"
          >
            {votes.myVote ? `Voted: ${IMPORTANCE_LABEL[votes.myVote]}` : 'Vote'}
          </Button>
        )}
        content={() => (
          <div style={{ padding: 4, minWidth: 180 }} data-testid="ideation-vote-menu">
            {IMPORTANCE_OPTIONS.map((o) => (
              <button
                key={o.level}
                type="button"
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
          </div>
        )}
      />
    </div>
  );
}

export default VoteControl;
