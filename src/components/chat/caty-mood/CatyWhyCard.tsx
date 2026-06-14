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
import { CatyMoodFace } from './CatyMoodFace';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { CatyMood, CatyState } from './catyMoodEngine';
import type { CatyEvidence, CatyTypeBreakdown } from './useCatySignals';
import type { CatyTrend } from './catyMoodHistory';

interface StateStyle {
  accent: string;
  bg: string;
  label: string;
}

const STATE_STYLE: Record<CatyState, StateStyle> = {
  zen: { accent: 'var(--ds-text-success, #22A06B)', bg: 'var(--ds-background-success, #DCFFF1)', label: 'zen' },
  content: { accent: 'var(--ds-text-subtle, #44546F)', bg: 'var(--ds-background-neutral, #F1F2F4)', label: 'content' },
  focused: { accent: 'var(--ds-text-information, #0C66E4)', bg: 'var(--ds-background-information, #E9F2FE)', label: 'focused' },
  concerned: { accent: 'var(--ds-text-warning-inverse, #974F0C)', bg: 'var(--ds-background-warning, #FFF7D6)', label: 'concerned' },
  alert: { accent: 'var(--ds-text-danger, #AE2E24)', bg: 'var(--ds-background-danger, #FFECEB)', label: 'alert' },
};

function Sparkline({ scores, accent }: { scores: number[]; accent: string }) {
  if (scores.length < 2) {
    return (
      <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', padding: '4px 0' }}>
        trend builds over a few days
      </div>
    );
  }
  const max = Math.max(...scores, 1);
  const n = scores.length;
  const pts = scores
    .map((v, i) => {
      const x = (i / (n - 1)) * 196 + 2;
      const y = 32 - (v / max) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = pts.split(' ').pop()!.split(',');
  return (
    <svg width="100%" height="34" viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={accent} />
    </svg>
  );
}

export interface CatyWhyCardProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  mood: CatyMood;
  state: CatyState;
  evidence: CatyEvidence;
  byType: CatyTypeBreakdown;
  trend: CatyTrend;
  sparkline: number[];
  eventLine: string;
  onClose: () => void;
  onOpenTicket: (key: string) => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}

const TREND_ICON: Record<CatyTrend['direction'], string> = { up: '↑', down: '↓', flat: '→' };

/** Compact circular score indicator. Ring fills toward SCORE_FULL; number centred. */
const SCORE_FULL = 20;
function ScoreRing({ score, accent }: { score: number; accent: string }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, score / SCORE_FULL);
  const label = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={`Score ${label}`} style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--ds-border, #DFE1E6)" strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - frac)}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fill={accent}>
        {label}
      </text>
    </svg>
  );
}

export function CatyWhyCard({
  open,
  anchorRef,
  mood,
  state,
  evidence,
  byType,
  trend,
  sparkline,
  eventLine,
  onClose,
  onOpenTicket,
  onHoverIn,
  onHoverOut,
}: CatyWhyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showEvidence, setShowEvidence] = useState(false);

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

  const chips = mood.contributions.slice(0, 3);

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
        borderTop: `2px solid var(--ds-border-information, #0C66E4)`,
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
        zIndex: 700,
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'var(--ds-font-family-body, inherit)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 8px' }}>
        <CatyMoodFace state={state} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: style.accent }}>{style.label}</span>
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>
              {TREND_ICON[trend.direction]} {trend.word}
              {trend.direction !== 'flat' ? ` ${Math.abs(trend.deltaPct)}% vs last week` : ''}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text, #172B4D)', fontStyle: 'italic' }}>{mood.message}</div>
        </div>
      </div>

      <div style={{ padding: '0 12px' }}>
        <Sparkline scores={sparkline} accent={style.accent} />
      </div>

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 8px' }}>
          {chips.map((c) => (
            <span
              key={c.key}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 10,
                background: 'var(--ds-background-neutral, #F1F2F4)',
                color: 'var(--ds-text-subtle, #44546F)',
              }}
            >
              {c.label} {c.count}
            </span>
          ))}
        </div>
      )}

      {byType.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', marginBottom: 4 }}>
            your work · {mood.score === 0 ? 'all types' : 'every type counts'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {byType.map((t) => (
              <span
                key={t.type}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}
                title={t.type}
              >
                <JiraIssueTypeIcon type={t.type} size={16} />
                {t.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {eventLine !== 'nothing new' && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            fontSize: 12,
            color: 'var(--ds-text-subtle, #44546F)',
          }}
        >
          <span style={{ fontWeight: 600 }}>new:</span> {eventLine}
        </div>
      )}

      {mood.contributions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowEvidence((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textAlign: 'left',
            padding: '8px 12px',
            border: 'none',
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <ScoreRing score={mood.score} accent={style.accent} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>Workload score</span>
            <span style={{ fontSize: 12, color: 'var(--ds-text-information, #0C66E4)' }}>
              {showEvidence ? 'Hide the math ▾' : 'Show the math ▸'}
            </span>
          </span>
        </button>
      )}

      {showEvidence && (
        <div style={{ padding: '4px 12px 8px' }}>
          {mood.contributions.map((c) => {
            const tickets = evidence[c.key] ?? [];
            return (
              <div key={c.key} style={{ padding: '8px 0', borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--ds-text, #172B4D)', fontWeight: 600 }}>
                    {c.label} ×{c.weight}
                  </span>
                  <span style={{ color: 'var(--ds-text-subtle, #44546F)' }}>{c.points} pts</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tickets.map((t) => (
                    <button
                      key={t.issue_key}
                      type="button"
                      onClick={() => onOpenTicket(t.issue_key)}
                      style={{
                        fontSize: 11,
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--ds-border, #DFE1E6)',
                        background: 'transparent',
                        color: 'var(--ds-text-information, #0C66E4)',
                        cursor: 'pointer',
                      }}
                      title={t.summary ?? t.issue_key}
                    >
                      {t.issue_key}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
              fontSize: 11,
              color: 'var(--ds-text-subtlest, #626F86)',
              paddingTop: 8,
              lineHeight: 1.5,
            }}
          >
            <span aria-hidden>🔒</span>
            <span>Deterministic — same tickets always sum to {mood.score}. No AI guess, no hidden weight.</span>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
