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
  canonical: { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', label: 'CANONICAL' },
  wrapper:   { bg: 'var(--ds-background-selected, #E9F2FF)', text: 'var(--ds-link, #0C66E4)', label: 'WRAPPER' },
  deprecated:{ bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', label: 'DEPRECATED' },
  replace:   { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)', label: 'MUST REPLACE' },
  delete:    { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)', label: 'DELETE' },
  keep:      { bg: 'var(--ds-background-neutral, #F1F2F4)', text: 'var(--ds-icon, #44546F)', label: 'KEEP (DIFFERENT PURPOSE)' },
  replaced:  { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', label: 'REPLACED ✓' },
};

const ADS_CLOSENESS_STYLES: Record<AdsCloseness, { bg: string; text: string; label: string; icon: string }> = {
  exact:    { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', label: 'ADS EXACT',    icon: '●' },
  close:    { bg: 'var(--ds-background-selected, #E9F2FF)', text: 'var(--ds-link, #0C66E4)', label: 'ADS CLOSE',    icon: '◐' },
  partial:  { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', label: 'ADS PARTIAL',  icon: '◔' },
  divergent:{ bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)', label: 'ADS DIVERGENT',icon: '○' },
  none:     { bg: 'var(--ds-background-neutral, #F1F2F4)', text: 'var(--ds-icon, #44546F)', label: 'NO ADS',       icon: '✕' },
};

const SWEEP_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  'not-started': { bg: 'var(--ds-background-neutral, #F1F2F4)', text: 'var(--ds-icon, #44546F)', label: 'SWEEP: NOT STARTED' },
  'in-progress': { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', label: 'SWEEP: IN PROGRESS' },
  'complete':    { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', label: 'SWEEP: COMPLETE ✓' },
};

export function DuplicateCard({ purpose, canonical, duplicates, adsRecommendation, restoreCommit, sweepStatus = 'not-started' }: DuplicateCardProps) {
  const sweep = SWEEP_BADGE[sweepStatus];
  const totalDuplicateConsumers = duplicates.reduce((sum, d) => sum + d.consumers, 0);
  const needsReplace = duplicates.filter(d => d.status === 'replace' || d.status === 'deprecated');

  return (
    <div style={{
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 8,
      marginBottom: 24,
      background: 'var(--ds-surface, #fff)',
      fontFamily: 'var(--ds-font-family-body, "Atlassian Sans", -apple-system, sans-serif)',
      fontSize: 14,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Duplicate Detection — Component Consolidation
          </div>
          <div style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', marginTop: 2 }}>
            {purpose}
          </div>
        </div>
        <div style={{ padding: '4px 12px', borderRadius: 3, background: sweep.bg, color: sweep.text, fontSize: 11, fontWeight: 700 }}>
          {sweep.label}
        </div>
      </div>

      {/* Canonical */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-background-success-subtle, #DFFCF0)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-success, #216E4E)' }}>
            CANONICAL — USE THIS ONE
          </div>
          <span style={{ padding: '2px 8px', borderRadius: 3, background: 'var(--ds-text-success, #216E4E)', color: 'var(--ds-surface, #FFFFFF)', fontSize: 11, fontWeight: 700 }}>
            {canonical.consumers} consumers
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 653, color: 'var(--ds-text, #172B4D)' }}>{canonical.name}</div>
        <code style={{ fontSize: 12, color: 'var(--ds-icon, #44546F)', fontFamily: 'monospace' }}>{canonical.source}</code>
        <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canonical.ads && (
            <span style={{ padding: '2px 8px', borderRadius: 3, background: 'var(--ds-background-selected, #E9F2FF)', color: 'var(--ds-link, #0C66E4)', fontSize: 11, fontWeight: 600 }}>
              ADS: {canonical.ads}
            </span>
          )}
          {canonical.adsCloseness && (() => {
            const ac = ADS_CLOSENESS_STYLES[canonical.adsCloseness];
            return (
              <span style={{ padding: '2px 8px', borderRadius: 3, background: ac.bg, color: ac.text, fontSize: 11, fontWeight: 600 }}>
                {ac.icon} {ac.label}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Duplicates table */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
        <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
          Duplicates ({duplicates.length} components · {totalDuplicateConsumers} consumers to migrate)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Component', 'Source', 'Consumers', 'ADS', 'Status', 'Risk'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)' }}>
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
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)', fontWeight: 600 }}>
                    {d.name}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
                    <code style={{ fontSize: 11, fontFamily: 'monospace' }}>{d.source}</code>
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
                    {d.consumers}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
                    {d.adsCloseness ? (() => {
                      const ac = ADS_CLOSENESS_STYLES[d.adsCloseness!];
                      return <span style={{ padding: '2px 6px', borderRadius: 3, background: ac.bg, color: ac.text, fontSize: 10, fontWeight: 700 }}>{ac.icon} {ac.label}</span>;
                    })() : <span style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.text, fontSize: 10, fontWeight: 700 }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)', fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
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
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-background-warning-subtle, #FFF7D6)' }}>
          <div style={{ fontSize: 12, fontWeight: 653, color: 'var(--ds-text-warning, #974F0C)', marginBottom: 4 }}>
            Sweep Plan — {needsReplace.length} components to replace
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ds-icon, #44546F)' }}>
            {needsReplace.map((d, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                Replace <code>{d.name}</code> ({d.consumers} consumers) → <code>{canonical.name}</code>
                {d.breakageRisk && <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}> — Risk: {d.breakageRisk}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ADS Recommendation */}
      {adsRecommendation && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-background-information-subtle, #E9F2FF)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 3, background: 'var(--ds-link, #0C66E4)', color: 'var(--ds-surface, #FFFFFF)', fontSize: 11, fontWeight: 700 }}>
              ADS RECOMMENDATION
            </span>
            <a href={adsRecommendation.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--ds-link, #0C66E4)', textDecoration: 'underline' }}>
              {adsRecommendation.package} docs
            </a>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', marginBottom: 8, lineHeight: 1.5 }}>
            {adsRecommendation.guidance}
          </div>
          {adsRecommendation.tokens && adsRecommendation.tokens.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>Required tokens</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {adsRecommendation.tokens.map((t, i) => (
                  <code key={i} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--ds-background-neutral, #F1F2F4)', fontFamily: 'monospace' }}>{t}</code>
                ))}
              </div>
            </div>
          )}
          {adsRecommendation.requiredProps && adsRecommendation.requiredProps.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>Required props for ADS compliance</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {adsRecommendation.requiredProps.map((p, i) => (
                  <code key={i} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'var(--ds-background-success, #DFFCF0)', fontFamily: 'monospace' }}>{p}</code>
                ))}
              </div>
            </div>
          )}
          {adsRecommendation.antiPatterns && adsRecommendation.antiPatterns.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-danger, #AE2A19)', marginBottom: 4 }}>Anti-patterns (ADS warns against)</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)' }}>
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
        <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
          <strong>Restore point:</strong> <code>git revert {restoreCommit}</code> — reverts the consolidation if any replacement breaks a surface. Run <code>git log --oneline {restoreCommit}..HEAD</code> to see what would be affected.
        </div>
      )}
    </div>
  );
}
