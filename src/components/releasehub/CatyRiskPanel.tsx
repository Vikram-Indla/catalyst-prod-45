/**
 * CatyRiskPanel — enterprise AI Release Risk Summary for the Release Operations
 * overview (route /release-hub/overview).
 *
 * Generates a live risk read from the `release-risk` mode of the `ai-digest`
 * edge function (Gemini). Renders a composite risk index + posture meter,
 * severity-coded metric tiles, the AI narrative, and ranked risk drivers with
 * deep-links into existing Release Hub routes.
 *
 * Degrades gracefully: if the edge function errors or returns nothing, the
 * panel falls back to a locally-computed estimate from the live KPIs — it never
 * renders a blank AI box (zero-assumption: a computed estimate, clearly labelled,
 * beats a lie or a void).
 *
 * ADS tokens only. Canonical CatyPulseIcon for the CATY signature.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import { RefreshCw, Copy, StickyNote, ChevronRight, ChevronDown, ChevronUp } from '@/lib/atlaskit-icons';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { RH } from '@/constants/releasehub.design';
import { catalystToast } from '@/lib/catalystToast';
import {
  useGenerateReleaseRisk,
  useSaveCatyRiskNote,
  type ReleaseRiskSummary,
  type ReleaseRiskPosture,
  type ReleaseRiskDriver,
} from '@/hooks/useReleaseHub';

const T = {
  card: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  link: 'var(--ds-link)',
  success: 'var(--ds-text-success)',
  warning: 'var(--ds-text-warning)',
  danger: 'var(--ds-text-danger)',
  information: 'var(--ds-text-information)',
  bgSuccess: 'var(--ds-background-success)',
  bgWarning: 'var(--ds-background-warning)',
  bgDanger: 'var(--ds-background-danger)',
  bgInformation: 'var(--ds-background-information)',
  bgNeutral: 'var(--ds-background-neutral)',
  caty: 'var(--ds-icon-accent-magenta)', // signature CATY magenta (ADS magenta accent token)
  catyBg: 'var(--ds-background-accent-magenta-subtlest)',
};

export interface CatyRiskMetrics {
  freezeConflicts: number;
  pending: number;
  atRisk: number;
  active: number;
}

interface CatyRiskPanelProps {
  context: Record<string, unknown>;
  metrics: CatyRiskMetrics;
  basis: string;
  fallbackNarrative: string;
}

function postureFromIndex(idx: number): ReleaseRiskPosture {
  if (idx >= 75) return 'critical';
  if (idx >= 50) return 'elevated';
  if (idx >= 25) return 'watch';
  return 'clear';
}

// Executive status chip — plain business language + one restrained Atlassian
// semantic colour. The only colour the panel carries: an at-a-glance posture
// for a C-suite reader.
const POSTURE_STATUS: Record<ReleaseRiskPosture, { label: string; fg: string; bg: string }> = {
  clear:    { label: 'On track',        fg: T.success,     bg: T.bgSuccess },
  watch:    { label: 'Monitor',         fg: T.information, bg: T.bgInformation },
  elevated: { label: 'Needs attention', fg: T.warning,     bg: T.bgWarning },
  critical: { label: 'Action required', fg: T.danger,      bg: T.bgDanger },
};

/** Local estimate used until the AI responds, or if it fails. */
function localEstimate(metrics: CatyRiskMetrics, narrative: string): ReleaseRiskSummary {
  const riskIndex = Math.min(
    100,
    metrics.freezeConflicts * 30 + metrics.atRisk * 20 + Math.min(metrics.pending, 10) * 4,
  );
  const posture = postureFromIndex(riskIndex);
  const drivers: ReleaseRiskDriver[] = [];
  if (metrics.freezeConflicts > 0) {
    drivers.push({
      severity: 'high',
      title: `${metrics.freezeConflicts} freeze conflict${metrics.freezeConflicts === 1 ? '' : 's'} on the deployment window`,
      action: 'Move the deploy out of the change-freeze or request an exception.',
      link: 'freeze',
    });
  }
  if (metrics.pending > 0) {
    drivers.push({
      severity: 'medium',
      title: `${metrics.pending} sign-off${metrics.pending === 1 ? '' : 's'} pending`,
      action: 'Clear the approval queue before the next deployment slot.',
      link: 'signoff',
    });
  }
  if (metrics.atRisk > 0) {
    drivers.push({
      severity: 'medium',
      title: `${metrics.atRisk} at-risk release${metrics.atRisk === 1 ? '' : 's'}`,
      action: 'Review readiness and target dates on the flagged releases.',
      link: 'release',
    });
  }
  return {
    riskIndex,
    posture,
    headline: posture === 'clear' ? 'Release path is clear' : 'Attention needed before next window',
    narrative,
    drivers,
  };
}

function SkeletonBar({ w, h = 12 }: { w: string | number; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: T.bgNeutral, opacity: 0.7 }} />;
}

export function CatyRiskPanel({ context, metrics, basis, fallbackNarrative }: CatyRiskPanelProps) {
  const navigate = useNavigate();
  const gen = useGenerateReleaseRisk();
  const saveNote = useSaveCatyRiskNote();

  // Auto-generate once on mount; Regenerate re-runs.
  useEffect(() => {
    gen.mutate(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallback = useMemo(() => localEstimate(metrics, fallbackNarrative), [metrics, fallbackNarrative]);
  const summary: ReleaseRiskSummary = gen.data ?? fallback;
  const isLoading = gen.isPending && !gen.data;
  const usedFallback = !gen.data && !gen.isPending; // resolved but no AI data (error/empty)

  const goLink = (link: ReleaseRiskDriver['link']) => {
    if (link === 'freeze') navigate('/release-hub/freeze-windows');
    else if (link === 'signoff') navigate('/release-hub/sign-off-queue');
    else if (link === 'release') navigate('/release-hub/releases-management');
  };

  const copy = () => {
    const text = `${summary.headline}\n\n${summary.narrative}`;
    navigator.clipboard?.writeText(text).then(() => catalystToast.success('Copied')).catch(() => {});
  };

  const save = () => {
    saveNote.mutate(
      {
        contentMd: `**${summary.headline}**\n\n${summary.narrative}`,
        riskIndex: summary.riskIndex,
        posture: summary.posture,
        payload: summary,
      },
      {
        onSuccess: () => catalystToast.success('Saved as note'),
        onError: () => catalystToast.error('Could not save note'),
      },
    );
  };

  const [expanded, setExpanded] = useState(false);
  const status = POSTURE_STATUS[summary.posture];

  const tiles: { value: number; label: string }[] = [
    { value: metrics.freezeConflicts, label: metrics.freezeConflicts === 1 ? 'Freeze conflict' : 'Freeze conflicts' },
    { value: metrics.pending, label: 'Sign-offs pending' },
    { value: metrics.atRisk, label: metrics.atRisk === 1 ? 'At-risk release' : 'At-risk releases' },
    { value: metrics.active, label: 'Active releases' },
  ];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header — click to expand / collapse (collapsed by default) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px', borderBottom: expanded ? `1px solid ${T.border}` : 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <CatyPulseIcon size={16} />
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, flexShrink: 0 }}>AI release risk summary</span>
          {!isLoading && !expanded && (
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {summary.headline}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {!isLoading && (
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: status.fg, background: status.bg, padding: '4px 8px', borderRadius: 12 }}>{status.label}</span>
          )}
          {expanded ? <ChevronUp size={20} style={{ color: T.subtlest }} /> : <ChevronDown size={20} style={{ color: T.subtlest }} />}
        </div>
      </div>

      {expanded && (
        <>
          {/* Basis */}
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${T.border}`, background: T.sunken }}>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{basis}</span>
          </div>

          {/* Metric tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px', borderBottom: `1px solid ${T.border}` }}>
            {tiles.map((tile) => (
              <div key={tile.label} style={{ background: T.sunken, borderRadius: 6, padding: '8px 12px' }}>
                <p style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-700)', fontWeight: 600, color: T.text, margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{tile.value}</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>{tile.label}</p>
              </div>
            ))}
          </div>

          {/* Narrative */}
          <div style={{ padding: '16px', borderBottom: summary.drivers.length ? `1px solid ${T.border}` : 'none' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SkeletonBar w="100%" /><SkeletonBar w="82%" />
              </div>
            ) : (
              <>
                <p style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, margin: '0 0 8px' }}>{summary.headline}</p>
                <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-400)', color: T.text, margin: 0, lineHeight: 1.65 }}>{summary.narrative}</p>
              </>
            )}
          </div>

          {/* What needs attention */}
          {!isLoading && summary.drivers.length > 0 && (
            <div style={{ padding: '16px 16px 8px' }}>
              <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, margin: '0 0 8px' }}>What needs attention</p>
              {summary.drivers.slice(0, 4).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.subtlest, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: T.text, margin: 0 }}>{d.title}</p>
                    <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, margin: '4px 0 0' }}>{d.action}</p>
                  </div>
                  {d.link && (
                    <button
                      onClick={() => goLink(d.link)}
                      style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: T.link, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {d.link === 'freeze' ? 'Resolve' : d.link === 'signoff' ? 'Review' : 'Open'}
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.sunken }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance="default" iconBefore={RefreshCw} isDisabled={gen.isPending} isLoading={gen.isPending} onClick={() => gen.mutate(context)}>Regenerate</Button>
              <Button appearance="subtle" iconBefore={Copy} onClick={copy}>Copy</Button>
              <Button appearance="subtle" iconBefore={StickyNote} isDisabled={saveNote.isPending} isLoading={saveNote.isPending} onClick={save}>Save as note</Button>
            </div>
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>
              {usedFallback ? 'Estimated from live release data' : 'Generated by Caty'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default CatyRiskPanel;
