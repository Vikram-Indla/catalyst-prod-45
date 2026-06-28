import React, { useMemo } from 'react';
import { useReleasePortfolio } from '@/hooks/useReleasePortfolio';
import { RH } from '@/constants/releasehub.design';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  success: 'var(--ds-text-success, #216E4E)',
  successBg: 'var(--ds-background-success, rgba(34,160,107,0.12))',
  warning: 'var(--ds-text-warning, #A54800)',
  warningBg: 'var(--ds-background-warning, rgba(255,153,31,0.12))',
  danger: 'var(--ds-text-danger, #AE2A19)',
  dangerBg: 'var(--ds-background-danger, rgba(174,42,25,0.10))',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  bgBrand: 'var(--ds-background-brand-bold, #0C66E4)',
};

const SKIP_STATUS = ['completed', 'released', 'done', 'rolled_back', 'cancelled', 'archived', 'draft', 'production'];

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 8px', borderRadius: 12,
      fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
      color, background: bg, flexShrink: 0,
    }}>{label}</span>
  );
}

export function ScopeIntegrityPanel() {
  const { data: portfolio = [], isLoading } = useReleasePortfolio();

  const activeRows = useMemo(
    () => portfolio.filter((r) => !SKIP_STATUS.includes(r.status) && (r.scopeItems > 0 || r.openDefects > 0 || r.itemsAfterGoLive > 0)),
    [portfolio],
  );

  if (isLoading || activeRows.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text }}>Scope integrity</span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>{activeRows.length} active release{activeRows.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Rows */}
      {activeRows.map((r, i) => {
        const hasDrift = r.itemsAfterGoLive > 0;
        const hasDefects = r.openDefects > 0;
        const totalKnown = Math.max(r.scopeItems, 1);
        const driftPct = Math.min(100, (r.itemsAfterGoLive / totalKnown) * 100);
        const basePct = 100 - driftPct;
        const healthy = !hasDrift && !hasDefects;

        return (
          <div
            key={r.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 16,
              padding: '12px 16px',
              borderBottom: i < activeRows.length - 1 ? `1px solid ${T.border}` : 'none',
              alignItems: 'center',
            }}
          >
            {/* Left: name + bar */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                {r.scopeItems > 0 && (
                  <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, flexShrink: 0 }}>{r.scopeItems} items</span>
                )}
              </div>
              {/* Scope bar: baseline (blue) | drift (orange) */}
              <div style={{ height: 6, borderRadius: 4, background: T.bgNeutral, display: 'flex', overflow: 'hidden' }}>
                {r.scopeItems > 0 && (
                  <div style={{ width: `${basePct}%`, background: T.bgBrand, borderRadius: hasDrift ? '4px 0 0 4px' : 4, transition: 'width 300ms' }} />
                )}
                {hasDrift && (
                  <div style={{ width: `${driftPct}%`, background: T.warning, borderRadius: '0 4px 4px 0', transition: 'width 300ms' }} />
                )}
              </div>
            </div>

            {/* Right: chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {healthy && <Chip label="Clean" color={T.success} bg={T.successBg} />}
              {hasDrift && <Chip label={`+${r.itemsAfterGoLive} late`} color={T.warning} bg={T.warningBg} />}
              {hasDefects && <Chip label={`${r.openDefects} defect${r.openDefects !== 1 ? 's' : ''}`} color={T.danger} bg={T.dangerBg} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScopeIntegrityPanel;
