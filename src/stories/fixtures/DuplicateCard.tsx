/**
 * DuplicateCard — Storybook documentation block for component consolidation.
 *
 * Shows:
 *   CANONICAL       — the ONE component everyone should use
 *   DUPLICATES      — other components that do the same thing
 *   SWEEP PLAN      — what to replace, risk level, consumer count
 *   RESTORE         — git commit hash to revert if replacement breaks
 *
 * Usage:
 *
 *   <DuplicateCard
 *     purpose="Show issue status as a colored pill"
 *     canonical={{
 *       name: 'CatalystStatusPill',
 *       source: 'src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx',
 *       consumers: 16,
 *       ads: '@atlaskit/lozenge',
 *     }}
 *     duplicates={[
 *       { name: 'StatusPill', source: 'src/components/shared/StatusPill.tsx', consumers: 4, status: 'deprecated' },
 *       { name: 'StatusBadge', source: 'src/components/hierarchy/StatusBadge.tsx', consumers: 2, status: 'replace' },
 *     ]}
 *     restoreCommit="abc123"
 *   />
 */
import React from 'react';

export type DuplicateStatus =
  | 'canonical'    // THE one to use
  | 'wrapper'      // Thin wrapper around canonical — acceptable
  | 'deprecated'   // Still works, marked for removal
  | 'replace'      // Must be replaced with canonical ASAP
  | 'delete'       // Zero consumers, safe to delete now
  | 'keep'         // Different enough purpose, not a true duplicate
  | 'replaced';    // Already replaced — sweep complete

/** ADS closeness score — how well a component follows Atlassian Design System */
export type AdsCloseness = 'exact' | 'close' | 'partial' | 'divergent' | 'none';

export interface DuplicateEntry {
  name: string;
  source: string;
  consumers: number;
  status: DuplicateStatus;
  /** What breaks if you just delete this without replacing imports */
  breakageRisk?: string;
  /** How close this implementation is to ADS */
  adsCloseness?: AdsCloseness;
}

/** ADS recommendation block — what Atlassian Design says is the correct pattern */
export interface AdsRecommendation {
  /** The @atlaskit package that should be used */
  package: string;
  /** Direct URL to the ADS component docs */
  docsUrl: string;
  /** What ADS says about this pattern (e.g. "Use Lozenge for status, not Badge") */
  guidance: string;
  /** ADS tokens that should be used */
  tokens?: string[];
  /** Props that must be set for ADS compliance */
  requiredProps?: string[];
  /** Common anti-patterns ADS warns against */
  antiPatterns?: string[];
}

export interface DuplicateCardProps {
  /** What all these components do (e.g. "Show issue status as colored pill") */
  purpose: string;
  /** The ONE canonical component */
  canonical: {
    name: string;
    source: string;
    consumers: number;
    ads?: string;
    /** How close the canonical is to ADS — should be 'exact' or 'close' */
    adsCloseness?: AdsCloseness;
  };
  /** All the duplicates */
  duplicates: DuplicateEntry[];
  /** ADS recommendation — what the design system says is correct */
  adsRecommendation?: AdsRecommendation;
  /** Git commit hash where consolidation was done — enables restore */
  restoreCommit?: string;
  /** Summary of sweep status */
  sweepStatus?: 'not-started' | 'in-progress' | 'complete';
}

const STATUS_STYLES: Record<DuplicateStatus, { bg: string; text: string; label: string }> = {
  canonical: { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', label: 'CANONICAL' },
  wrapper:   { bg: 'var(--ds-background-selected)', text: 'var(--ds-link)', label: 'WRAPPER' },
  deprecated:{ bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'DEPRECATED' },
  replace:   { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', label: 'MUST REPLACE' },
  delete:    { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', label: 'DELETE' },
  keep:      { bg: 'var(--ds-background-neutral)', text: 'var(--ds-icon)', label: 'KEEP (DIFFERENT PURPOSE)' },
  replaced:  { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', label: 'REPLACED ✓' },
};

const ADS_CLOSENESS_STYLES: Record<AdsCloseness, { bg: string; text: string; label: string; icon: string }> = {
  exact:    { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', label: 'ADS EXACT',    icon: '●' },
  close:    { bg: 'var(--ds-background-selected)', text: 'var(--ds-link)', label: 'ADS CLOSE',    icon: '◐' },
  partial:  { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'ADS PARTIAL',  icon: '◔' },
  divergent:{ bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', label: 'ADS DIVERGENT',icon: '○' },
  none:     { bg: 'var(--ds-background-neutral)', text: 'var(--ds-icon)', label: 'NO ADS',       icon: '✕' },
};

const SWEEP_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  'not-started': { bg: 'var(--ds-background-neutral)', text: 'var(--ds-icon)', label: 'SWEEP: NOT STARTED' },
  'in-progress': { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'SWEEP: IN PROGRESS' },
  'complete':    { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', label: 'SWEEP: COMPLETE ✓' },
};

export function DuplicateCard({ purpose, canonical, duplicates, adsRecommendation, restoreCommit, sweepStatus = 'not-started' }: DuplicateCardProps) {
  const sweep = SWEEP_BADGE[sweepStatus];
  const totalDuplicateConsumers = duplicates.reduce((sum, d) => sum + d.consumers, 0);
  const needsReplace = duplicates.filter(d => d.status === 'replace' || d.status === 'deprecated');

  return (
    <div style={{
      border: '1px solid var(--ds-border)',
      borderRadius: 8,
      marginBottom: 24,
      background: 'var(--ds-surface)',
      fontFamily: 'var(--ds-font-family-body, "Atlassian Sans", -apple-system, sans-serif)',
      fontSize: 'var(--ds-font-size-400)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ds-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Duplicate Detection — Component Consolidation
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text)', marginTop: 2 }}>
            {purpose}
          </div>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 3, background: sweep.bg, color: sweep.text, fontSize: 'var(--ds-font-size-100)', fontWeight: 700 }}>
          {sweep.label}
        </div>
      </div>

      {/* Canonical */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-background-success-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-success)' }}>
            CANONICAL — USE THIS ONE
          </div>
          <span style={{ padding: '2px 8px', borderRadius: 3, background: 'var(--ds-text-success)', color: 'var(--ds-surface)', fontSize: 'var(--ds-font-size-100)', fontWeight: 700 }}>
            {canonical.consumers} consumers
          </span>
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 653, color: 'var(--ds-text)' }}>{canonical.name}</div>
        <code style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon)', fontFamily: 'monospace' }}>{canonical.source}</code>
        <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canonical.ads && (
            <span style={{ padding: '2px 8px', borderRadius: 3, background: 'var(--ds-background-selected)', color: 'var(--ds-link)', fontSize: 'var(--ds-font-size-100)', fontWeight: 600 }}>
              ADS: {canonical.ads}
            </span>
          )}
          {canonical.adsCloseness && (() => {
            const ac = ADS_CLOSENESS_STYLES[canonical.adsCloseness];
            return (
              <span style={{ padding: '2px 8px', borderRadius: 3, background: ac.bg, color: ac.text, fontSize: 'var(--ds-font-size-100)', fontWeight: 600 }}>
                {ac.icon} {ac.label}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Duplicates table */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)' }}>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', marginBottom: 8 }}>
          Duplicates ({duplicates.length} components · {totalDuplicateConsumers} consumers to migrate)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-300)' }}>
          <thead>
            <tr>
              {['Component', 'Source', 'Consumers', 'ADS', 'Status', 'Risk'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--ds-border)', fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {duplicates.map((d, i) => {
              const s = STATUS_STYLES[d.status];
              return (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle)', fontWeight: 600 }}>
                    {d.name}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                    <code style={{ fontSize: 'var(--ds-font-size-100)', fontFamily: 'monospace' }}>{d.source}</code>
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                    {d.consumers}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                    {d.adsCloseness ? (() => {
                      const ac = ADS_CLOSENESS_STYLES[d.adsCloseness!];
                      return <span style={{ padding: '2px 6px', borderRadius: 3, background: ac.bg, color: ac.text, fontSize: 'var(--ds-font-size-50)', fontWeight: 700 }}>{ac.icon} {ac.label}</span>;
                    })() : <span style={{ fontSize: 'var(--ds-font-size-50)', color: 'var(--ds-text-subtlest)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.text, fontSize: 'var(--ds-font-size-50)', fontWeight: 700 }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
                    {d.breakageRisk ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sweep summary */}
      {needsReplace.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-background-warning-subtle)' }}>
          <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-warning)', marginBottom: 4 }}>
            Sweep Plan — {needsReplace.length} components to replace
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-icon)' }}>
            {needsReplace.map((d, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                Replace <code>{d.name}</code> ({d.consumers} consumers) → <code>{canonical.name}</code>
                {d.breakageRisk && <span style={{ color: 'var(--ds-text-danger)' }}> — Risk: {d.breakageRisk}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ADS Recommendation */}
      {adsRecommendation && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-background-information-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 3, background: 'var(--ds-link)', color: 'var(--ds-surface)', fontSize: 'var(--ds-font-size-100)', fontWeight: 700 }}>
              ADS RECOMMENDATION
            </span>
            <a href={adsRecommendation.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', textDecoration: 'underline' }}>
              {adsRecommendation.package} docs
            </a>
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', marginBottom: 8, lineHeight: 1.5 }}>
            {adsRecommendation.guidance}
          </div>
          {adsRecommendation.tokens && adsRecommendation.tokens.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>Required tokens</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {adsRecommendation.tokens.map((t, i) => (
                  <code key={i} style={{ fontSize: 'var(--ds-font-size-100)', padding: '1px 6px', borderRadius: 3, background: 'var(--ds-background-neutral)', fontFamily: 'monospace' }}>{t}</code>
                ))}
              </div>
            </div>
          )}
          {adsRecommendation.requiredProps && adsRecommendation.requiredProps.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>Required props for ADS compliance</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {adsRecommendation.requiredProps.map((p, i) => (
                  <code key={i} style={{ fontSize: 'var(--ds-font-size-100)', padding: '1px 6px', borderRadius: 3, background: 'var(--ds-background-success)', fontFamily: 'monospace' }}>{p}</code>
                ))}
              </div>
            </div>
          )}
          {adsRecommendation.antiPatterns && adsRecommendation.antiPatterns.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-danger)', marginBottom: 4 }}>Anti-patterns (ADS warns against)</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>
                {adsRecommendation.antiPatterns.map((ap, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{ap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Restore */}
      {restoreCommit && (
        <div style={{ padding: '12px 16px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
          <strong>Restore point:</strong> <code>git revert {restoreCommit}</code> — reverts the consolidation if any replacement breaks a surface. Run <code>git log --oneline {restoreCommit}..HEAD</code> to see what would be affected.
        </div>
      )}
    </div>
  );
}
