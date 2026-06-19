import React, { useMemo } from 'react';
import { useReleasePortfolio } from '@/hooks/useReleasePortfolio';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  success: 'var(--ds-icon-success, #22A06B)',
  successBg: 'var(--ds-background-success, rgba(34,160,107,0.12))',
  successBorder: 'var(--ds-border-success, #4BCE97)',
  warning: 'var(--ds-icon-warning, #E2B203)',
  warningBg: 'var(--ds-background-warning, rgba(255,153,31,0.12))',
  warningBorder: 'var(--ds-border-warning, #E2B203)',
  danger: 'var(--ds-icon-danger, #AE2A19)',
  dangerBg: 'var(--ds-background-danger, rgba(174,42,25,0.10))',
  dangerBorder: 'var(--ds-border-danger, rgba(174,42,25,0.35))',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
};

const SKIP_STATUS = ['completed', 'released', 'done', 'rolled_back', 'cancelled', 'archived', 'draft'];

type SignoffTier = 'complete' | 'partial' | 'none' | 'unknown';

function signoffTier(done: number, total: number): SignoffTier {
  if (total === 0) return 'unknown';
  if (done >= total) return 'complete';
  if (done === 0) return 'none';
  return 'partial';
}

const TIER_COLOR: Record<SignoffTier, string> = {
  complete: 'var(--ds-icon-success, #22A06B)',
  partial:  'var(--ds-icon-warning, #E2B203)',
  none:     'var(--ds-icon-danger, #AE2A19)',
  unknown:  'var(--ds-icon-subtlest, #B3B9C4)',
};

const TIER_BG: Record<SignoffTier, string> = {
  complete: 'var(--ds-background-success, rgba(34,160,107,0.12))',
  partial:  'var(--ds-background-warning, rgba(255,153,31,0.12))',
  none:     'var(--ds-background-danger, rgba(174,42,25,0.10))',
  unknown:  'var(--ds-background-neutral, #F1F2F4)',
};

const TIER_BORDER: Record<SignoffTier, string> = {
  complete: 'var(--ds-border-success, #4BCE97)',
  partial:  'var(--ds-border-warning, #E2B203)',
  none:     'var(--ds-border-danger, rgba(174,42,25,0.35))',
  unknown:  'var(--ds-border, #DFE1E6)',
};

export function OwnerAlignmentStrip() {
  const { data: portfolio = [], isLoading } = useReleasePortfolio();

  const activeRows = useMemo(
    () => portfolio.filter((r) => !SKIP_STATUS.includes(r.status)),
    [portfolio],
  );

  if (isLoading || activeRows.length === 0) return null;

  const allAligned = activeRows.every((r) => signoffTier(r.signoffDone, r.signoffTotal) === 'complete' || signoffTier(r.signoffDone, r.signoffTotal) === 'unknown');

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text }}>Owner alignment</span>
        {allAligned && (
          <span style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.success }}>All signoffs cleared</span>
        )}
      </div>

      {/* Release chips row */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {activeRows.map((r) => {
          const tier = signoffTier(r.signoffDone, r.signoffTotal);
          const pct = r.signoffTotal > 0 ? Math.round((r.signoffDone / r.signoffTotal) * 100) : null;
          const label = r.signoffTotal > 0 ? `${r.signoffDone}/${r.signoffTotal}` : 'no signoffs';

          return (
            <div
              key={r.id}
              style={{
                display: 'inline-flex', flexDirection: 'column', gap: 6,
                padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${TIER_BORDER[tier]}`,
                background: TIER_BG[tier],
                minWidth: 120,
              }}
            >
              {/* Release name */}
              <span style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{r.name}</span>

              {/* Signoff progress bar */}
              {r.signoffTotal > 0 && (
                <div style={{ height: 4, borderRadius: 2, background: T.bgNeutral, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: TIER_COLOR[tier], borderRadius: 2, transition: 'width 300ms' }} />
                </div>
              )}

              {/* Fraction label */}
              <span style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 500, color: TIER_COLOR[tier] }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OwnerAlignmentStrip;
