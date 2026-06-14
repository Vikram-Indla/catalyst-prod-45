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
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import { CatyMoodFace } from './CatyMoodFace';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
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
      {/* Header: status icon + message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CatyMoodFace state={state} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            <Lozenge appearance={style.appearance}>{style.label}</Lozenge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text, #172B4D)' }}>
            {mood.message}
          </div>
        </div>
      </div>

      {/* Metrics row: 2 tiles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {/* Tile 1: headline item count */}
        <div style={{
          flex: 1,
          padding: 8,
          background: 'var(--ds-background-neutral, #F1F2F4)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--ds-text, #172B4D)',
          fontWeight: 500,
        }}>
          {mood.contributions.length > 0 ? `${mood.contributions[0].label} (${mood.contributions[0].count})` : 'No updates'}
        </div>

        {/* Tile 2: secondary metric */}
        <div style={{
          flex: 1,
          padding: 8,
          background: 'var(--ds-background-neutral, #F1F2F4)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--ds-text, #172B4D)',
          fontWeight: 500,
        }}>
          {mood.contributions.length > 1 ? `${mood.contributions[1].label} (${mood.contributions[1].count})` : '—'}
        </div>
      </div>

      {/* Action button */}
      <Button
        appearance="default"
        onClick={() => {
          // Route to backlog with relevant filter
          window.location.hash = '#/project-hub/BAU/allwork';
          onClose();
        }}
        style={{ width: '100%', marginBottom: 8 }}
      >
        Triage these {totalCount}
      </Button>

      {/* "Show details" link */}
      <button
        type="button"
        onClick={() => {
          window.location.hash = '#/caty';
          onClose();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ds-link, #0052CC)',
          cursor: 'pointer',
          fontSize: 11,
          padding: 0,
          fontFamily: 'var(--ds-font-family-body, inherit)',
        }}
      >
        Show details →
      </button>
    </div>,
    document.body,
  );
}
