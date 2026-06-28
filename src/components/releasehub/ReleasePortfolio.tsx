/**
 * ReleasePortfolio — the Release Operations overview centerpiece.
 *
 * One row per release with a DERIVED production-confidence verdict
 * (resolveReleaseConfidence over real signals: date alignment vs go-live,
 * sign-off progress, open defects/incidents, readiness). Native Catalyst
 * vocabulary, ADS tokens, canonical StatusLozenge + ads ProgressBar. No DORA,
 * no single hero, no invented index. Honest states: aligned shows green,
 * terminal shows Released, undated shows Draft.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useReleasePortfolio, type ReleasePortfolioRow } from '@/hooks/useReleasePortfolio';
import { CONFIDENCE_LABEL, type ReleaseConfidence } from '@/lib/releasehub/releaseConfidence';
import { RH } from '@/constants/releasehub.design';
import { ProgressBar } from '@/components/ads/ProgressBar';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { type StatusAppearance } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

const T = {
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  success: 'var(--ds-text-success, #216E4E)',
  warning: 'var(--ds-text-warning, #A54800)',
  danger: 'var(--ds-text-danger, #AE2A19)',
  bgSuccess: 'var(--ds-background-success, #DCFFF1)',
  bgWarning: 'var(--ds-background-warning, #FFF7D6)',
  bgDanger: 'var(--ds-background-danger, #FFEDEB)',
  bgNeutral: 'var(--ds-background-neutral, #F1F2F4)',
  mono: 'var(--ds-font-family-code, monospace)',
};

const CONF_STYLE: Record<ReleaseConfidence, { fg: string; bg: string; accent: string }> = {
  high:     { fg: T.success,  bg: T.bgSuccess, accent: 'var(--ds-border-success, #4BCE97)' },
  medium:   { fg: T.warning,  bg: T.bgWarning, accent: 'var(--ds-border-warning, #E2B203)' },
  low:      { fg: T.danger,   bg: T.bgDanger,  accent: 'var(--ds-border-danger, #F87168)' },
  released: { fg: T.subtlest, bg: T.bgNeutral, accent: T.border },
  draft:    { fg: T.subtlest, bg: T.bgNeutral, accent: T.border },
};

const ENV_APPEARANCE: Record<string, StatusAppearance> = { production: 'success', beta: 'new', staging: 'inprogress', uat: 'inprogress' };

function titleCase(v: string | null) {
  if (!v) return '';
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

function ReleaseRow({ r, onOpen }: { r: ReleasePortfolioRow; onOpen: (id: string) => void }) {
  const c = CONF_STYLE[r.confidence];
  const isTerminal = r.confidence === 'released';
  const isDraft = r.confidence === 'draft';
  const pct = r.readinessPct ?? 0;

  const metaParts: React.ReactNode[] = [];
  if (r.goLiveDate && !isTerminal) metaParts.push(format(new Date(r.goLiveDate), 'MMM d'));
  if (isTerminal && r.goLiveDate) metaParts.push(`Shipped ${format(new Date(r.goLiveDate), 'MMM d')}`);
  if (r.scopeItems > 0) metaParts.push(`${r.scopeItems} work item${r.scopeItems === 1 ? '' : 's'}`);

  return (
    <div
      onClick={() => onOpen(r.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}`, borderLeft: `3px solid ${c.accent}`, cursor: 'pointer' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: isTerminal || isDraft ? T.subtle : T.text }}>{r.name}</span>
          {r.targetEnv && <StatusLozenge appearance={ENV_APPEARANCE[r.targetEnv] ?? 'inprogress'} label={titleCase(r.targetEnv)} />}
          {r.health === 'at_risk' && !isTerminal && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.warning }}>at risk</span>}
        </div>
        <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isDraft ? (
            <span>Draft · go-live not set{r.scopeItems === 0 ? ' · no scope' : ''}</span>
          ) : (
            <>
              <span>{metaParts.join(' · ')}</span>
              {r.scopeItems > 0 && (
                r.itemsAfterGoLive === 0
                  ? <span style={{ color: T.success }}>· dates aligned</span>
                  : <span style={{ color: T.danger }}>· {r.itemsAfterGoLive} after go-live</span>
              )}
              {r.openIncidents > 0 && <span style={{ color: T.danger }}>· {r.openIncidents} incident{r.openIncidents === 1 ? '' : 's'}</span>}
              {r.openDefects > 0 && <span style={{ color: r.confidence === 'low' ? T.danger : T.warning }}>· {r.openDefects} defect{r.openDefects === 1 ? '' : 's'}</span>}
            </>
          )}
        </div>
        {!isTerminal && !isDraft && (
          <div style={{ marginTop: 8, maxWidth: 280 }}>
            <ProgressBar value={pct / 100} appearance={r.confidence === 'high' ? 'success' : 'default'} aria-label={`${r.name} readiness ${pct}%`} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: c.fg, background: c.bg, padding: '4px 8px', borderRadius: 12, whiteSpace: 'nowrap' }}>{CONFIDENCE_LABEL[r.confidence]}</span>
        {!isDraft && r.signoffTotal > 0 && (
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginTop: 4 }}>sign-offs {r.signoffDone} / {r.signoffTotal}{!isTerminal ? ` · ${pct}%` : ''}</div>
        )}
        {!isDraft && r.signoffTotal === 0 && !isTerminal && (
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginTop: 4 }}>{pct}%</div>
        )}
      </div>
    </div>
  );
}

export function ReleasePortfolio() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useReleasePortfolio();
  const onOpen = (id: string) => navigate(`/release-hub/${id}`);

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text }}>Release portfolio</span>
        <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest }}>confidence = dates · sign-offs · quality · readiness</span>
      </div>
      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>No releases</div>
      ) : (
        rows.map((r) => <ReleaseRow key={r.id} r={r} onOpen={onOpen} />)
      )}
    </div>
  );
}

export default ReleasePortfolio;
