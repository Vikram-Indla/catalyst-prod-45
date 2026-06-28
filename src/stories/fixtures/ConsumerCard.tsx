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
  safe:     { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', label: 'SAFE TO REMOVE' },
  caution:  { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'VERIFY BEFORE REMOVING' },
  critical: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', label: 'DO NOT REMOVE — BREAKS APP' },
};

export function ConsumerCard({ component, source, consumers, ads, risk, notes }: ConsumerCardProps) {
  const r = RISK_COLORS[risk];
  return (
    <div style={{
      border: '1px solid var(--ds-border)',
      borderRadius: 8,
      padding: 0,
      marginBottom: 24,
      background: 'var(--ds-surface)',
      fontFamily: 'var(--ds-font-family-body, "Atlassian Sans", -apple-system, sans-serif)',
      fontSize: 'var(--ds-font-size-400)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ds-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Component Registry
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: 'var(--ds-text)', marginTop: 2 }}>
            {component}
          </div>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 3,
          background: r.bg,
          color: r.text,
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
        }}>
          {r.label}
        </div>
      </div>

      {/* Source verification */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)' }}>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>
          Source file (production)
        </div>
        <code style={{
          fontSize: 'var(--ds-font-size-200)',
          padding: '2px 6px',
          borderRadius: 3,
          background: 'var(--ds-background-neutral)',
          color: 'var(--ds-text)',
          fontFamily: 'var(--ds-font-family-code, "SFMono-Regular", monospace)',
        }}>
          {source}
        </code>
        {ads && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 3,
              background: 'var(--ds-background-information)',
              color: 'var(--ds-text-information)',
              fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
            }}>
              ADS
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
              Wraps <code>{ads.package}</code>
              {ads.token && <> · Token: <code>{ads.token}</code></>}
            </span>
          </div>
        )}
      </div>

      {/* Consumer list */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-border)' }}>
        <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)', marginBottom: 8 }}>
          Consumers ({consumers.length} files import this)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-300)' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--ds-border)', fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)' }}>
                File
              </th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--ds-border)', fontSize: 'var(--ds-font-size-100)', fontWeight: 653, color: 'var(--ds-text-subtlest)' }}>
                Surface
              </th>
            </tr>
          </thead>
          <tbody>
            {consumers.map((c, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--ds-border-subtle)' }}>
                  <code style={{ fontSize: 'var(--ds-font-size-200)', fontFamily: 'var(--ds-font-family-code, monospace)' }}>{c.file}</code>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-subtle)' }}>
                  {c.surface}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ padding: '12px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', fontStyle: 'italic' }}>
          {notes}
        </div>
      )}
    </div>
  );
}
