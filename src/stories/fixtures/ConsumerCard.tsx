/**
 * ConsumerCard — Storybook documentation block that shows:
 *
 *   WHO USES THIS          — live consumer count + file list
 *   IS THIS THE REAL THING — source file + import verification
 *   CAN I SAFELY DELETE    — dependency risk (safe / caution / critical)
 *
 * Usage in any story:
 *
 *   import { ConsumerCard } from '../fixtures/ConsumerCard';
 *
 *   <ConsumerCard
 *     component="CatalystStatusPill"
 *     source="src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx"
 *     consumers={[
 *       { file: 'CatalystViewStory.tsx', surface: 'Story detail view' },
 *       { file: 'CatalystViewEpic.tsx', surface: 'Epic detail view' },
 *       { file: 'BacklogPage.atlaskit.tsx', surface: 'Backlog list table cells' },
 *     ]}
 *     ads={{ package: '@atlaskit/lozenge', token: 'color.background.success' }}
 *     risk="critical"
 *     notes="16 consumers across all detail views + table cells. DO NOT delete."
 *   />
 */
import React from 'react';

export interface Consumer {
  /** File name (just the basename, e.g. "CatalystViewStory.tsx") */
  file: string;
  /** Human-readable surface name (e.g. "Story detail view") */
  surface: string;
}

export interface ConsumerCardProps {
  /** Component name as used in imports */
  component: string;
  /** Source file path relative to src/ */
  source: string;
  /** List of files that import this component */
  consumers: Consumer[];
  /** ADS provenance — which @atlaskit package it wraps */
  ads?: {
    package: string;
    token?: string;
    docs?: string;
  };
  /**
   * Dependency risk:
   * - "safe"     → 0-2 consumers, can be removed without wide impact
   * - "caution"  → 3-10 consumers, removal needs verification
   * - "critical" → 11+ consumers, removal breaks multiple surfaces
   */
  risk: 'safe' | 'caution' | 'critical';
  /** Free-text notes for the auditor */
  notes?: string;
}

const RISK_COLORS = {
  safe:     { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', label: 'SAFE TO REMOVE' },
  caution:  { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', label: 'VERIFY BEFORE REMOVING' },
  critical: { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)', label: 'DO NOT REMOVE — BREAKS APP' },
};

export function ConsumerCard({ component, source, consumers, ads, risk, notes }: ConsumerCardProps) {
  const r = RISK_COLORS[risk];
  return (
    <div style={{
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 8,
      padding: 0,
      marginBottom: 24,
      background: 'var(--ds-surface, #fff)',
      fontFamily: 'var(--ds-font-family-body, "Atlassian Sans", -apple-system, sans-serif)',
      fontSize: 14,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Component Registry
          </div>
          <div style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #172B4D)', marginTop: 2 }}>
            {component}
          </div>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 3,
          background: r.bg,
          color: r.text,
          fontSize: 11,
          fontWeight: 700,
        }}>
          {r.label}
        </div>
      </div>

      {/* Source verification */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
        <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 4 }}>
          Source file (production)
        </div>
        <code style={{
          fontSize: 12,
          padding: '2px 6px',
          borderRadius: 3,
          background: 'var(--ds-background-neutral, #F1F2F4)',
          color: 'var(--ds-text, #172B4D)',
          fontFamily: 'var(--ds-font-family-code, "SFMono-Regular", monospace)',
        }}>
          {source}
        </code>
        {ads && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 3,
              background: 'var(--ds-background-information, #E9F2FF)',
              color: 'var(--ds-text-information, #0055CC)',
              fontSize: 11, fontWeight: 600,
            }}>
              ADS
            </span>
            <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
              Wraps <code>{ads.package}</code>
              {ads.token && <> · Token: <code>{ads.token}</code></>}
            </span>
          </div>
        )}
      </div>

      {/* Consumer list */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
        <div style={{ fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
          Consumers ({consumers.length} files import this)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                File
              </th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', fontSize: 11, fontWeight: 653, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                Surface
              </th>
            </tr>
          </thead>
          <tbody>
            {consumers.map((c, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}>
                  <code style={{ fontSize: 12, fontFamily: 'var(--ds-font-family-code, monospace)' }}>{c.file}</code>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)', color: 'var(--ds-text-subtle, #42526E)' }}>
                  {c.surface}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', fontStyle: 'italic' }}>
          {notes}
        </div>
      )}
    </div>
  );
}
