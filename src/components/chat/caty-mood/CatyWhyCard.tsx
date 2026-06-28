/**
 * CatyWhyCard — the glass-box hover/why popover. Summary on top (state, trend,
 * sparkline, message, top chips); expandable evidence drills every contribution down
 * to the exact tickets. Portal to body + getBoundingClientRect (CLAUDE.md 2026-06-13:
 * @atlaskit/dropdown-menu breaks inside overflow:hidden — self-rolled portal instead).
 *
 * Colour comes from ADS semantic tokens (token-first, hex fallback). The brand cat is
 * never recoloured; only the card chrome carries state colour.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button';
import { IconButton } from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import CloseIcon from '@atlaskit/icon/core/close';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { catalystToast } from '@/lib/catalystToast';
import type { CatyMood, CatyState } from './catyMoodEngine';
import type { CatyEvidence, CatyTypeBreakdown } from './useCatySignals';
import type { CatyTrend } from './catyMoodHistory';

interface StateStyle {
  accent: string;
  label: string;
  appearance: 'success' | 'default' | 'inprogress' | 'moved' | 'removed';
}

const STATE_STYLE: Record<CatyState, StateStyle> = {
  zen: { accent: 'var(--ds-text-success, #22A06B)', label: 'zen', appearance: 'success' },
  content: { accent: 'var(--ds-text-subtle, #44546F)', label: 'content', appearance: 'default' },
  focused: { accent: 'var(--ds-text-information, #0C66E4)', label: 'focused', appearance: 'inprogress' },
  concerned: { accent: 'var(--ds-text-warning-inverse, #974F0C)', label: 'concerned', appearance: 'moved' },
  alert: { accent: 'var(--ds-text-danger, #AE2E24)', label: 'alert', appearance: 'removed' },
};


export interface CatyWhyCardProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  mood: CatyMood;
  state: CatyState;
  evidence: CatyEvidence;
  byType: CatyTypeBreakdown;
  trend: CatyTrend;
  onClose: () => void;
  onOpenTicket: (key: string) => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}


export function CatyWhyCard({
  open,
  anchorRef,
  mood,
  state,
  evidence,
  byType,
  trend,
  onClose,
  onOpenTicket,
  onHoverIn,
  onHoverOut,
}: CatyWhyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isTriaging, setIsTriaging] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!cardRef.current?.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !anchorRef.current) return null;
  const rect = anchorRef.current.getBoundingClientRect();
  const style = STATE_STYLE[state];

  // Place above the FAB by default; flip below if near the top.
  const placeBelow = rect.top < 360;
  const top = placeBelow ? rect.bottom + 10 : undefined;
  const bottom = placeBelow ? undefined : window.innerHeight - rect.top + 10;
  // Cap to the available viewport on the chosen side so the card never clips off-screen.
  const VP_MARGIN = 12;
  const maxHeight = Math.max(
    220,
    placeBelow ? window.innerHeight - (rect.bottom + 10) - VP_MARGIN : rect.top - 10 - VP_MARGIN,
  );

  // Horizontal: prefer centred on the FAB, but clamp inside the viewport so the card
  // opens INWARD (toward the screen) instead of clipping off the right edge.
  const CARD_W = 300;
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - CARD_W / 2),
    window.innerWidth - CARD_W - 12,
  );

  const totalCount = mood.contributions.reduce((sum, c) => sum + c.count, 0);

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Caty — ${style.label}`}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      style={{
        position: 'fixed',
        left,
        top,
        bottom,
        width: CARD_W,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderTop: `2px solid ${style.accent}`,
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
        zIndex: 700,
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'var(--ds-font-family-body, inherit)',
        padding: '12px',
      }}
    >
      {/* Header: status icon + message + minimize button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, marginBottom: 4 }}>
              <Lozenge appearance={style.appearance}>{style.label}</Lozenge>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text, #172B4D)' }}>
              {mood.message}
            </div>
          </div>
        </div>
        <IconButton
          icon={CloseIcon}
          label="Close"
          appearance="subtle"
          onClick={onClose}
          style={{ flexShrink: 0 }}
        />
      </div>

      {/* Contribution chips: clickable filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {mood.contributions.length > 0 ? (
          mood.contributions.map(c => (
            <button
              key={c.label}
              onClick={() => {
                navigate(`/project-hub/BAU/allwork?contributionCategory=${encodeURIComponent(c.label)}`);
                onClose();
              }}
              style={{
                padding: '6px 12px',
                background: 'var(--ds-background-information-subtle, #DFFCF0)',
                border: '1px solid var(--ds-border-information, #85E6C5)',
                borderRadius: 6,
                fontSize: 'var(--ds-font-size-200)',
                color: 'var(--ds-text, #172B4D)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {c.label} ({c.count})
            </button>
          ))
        ) : (
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #42526E)' }}>No updates</div>
        )}
      </div>

      {/* Error state message */}
      {triageError && (
        <div style={{
          marginBottom: 12,
          padding: 8,
          background: 'var(--ds-background-danger-subtle, #FFECEB)',
          border: '1px solid var(--ds-border-danger, #F87462)',
          borderRadius: 4,
          fontSize: 'var(--ds-font-size-200)',
          color: 'var(--ds-text-danger, #AE2A19)',
          fontFamily: 'var(--ds-font-family-body, inherit)',
        }}>
          {triageError}
        </div>
      )}

      {/* Primary action: Triage button */}
      <Button
        appearance="primary"
        isLoading={isTriaging}
        onClick={async () => {
          setIsTriaging(true);
          setTriageError(null);
          try {
            await new Promise(resolve => setTimeout(resolve, 300)); // simulate nav delay
            navigate('/project-hub/BAU/allwork');
            onClose();
          } catch (err) {
            setTriageError('Failed to navigate. Please try again.');
            setIsTriaging(false);
          }
        }}
        isDisabled={isTriaging}
        style={{ width: '100%', marginBottom: 8 }}
      >
        Review and Triage ({totalCount})
      </Button>

      {/* Secondary action: Dismiss for 24h */}
      <Button
        appearance="subtle"
        onClick={() => {
          localStorage.setItem('caty.alert.muted-until', new Date(Date.now() + 24*60*60*1000).toISOString());
          catalystToast.info('Alert muted until tomorrow');
          onClose();
        }}
        style={{ width: '100%', marginBottom: 12, fontSize: 'var(--ds-font-size-200)' }}
      >
        Dismiss for 24 hours
      </Button>

      {/* Help text */}
      <div style={{
        fontSize: 'var(--ds-font-size-100)',
        color: 'var(--ds-text-subtlest, #6B778C)',
        fontFamily: 'var(--ds-font-family-body, inherit)',
        lineHeight: '1.4',
      }}>
        These items are blocking progress and need to be assigned, resolved, or deprioritized.
      </div>
    </div>,
    document.body,
  );
}
