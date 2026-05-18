/**
 * ADSViolationsPanel — surfaces live ADS-compliance defects.
 *
 * Authored: 2026-05-17 (preflight Step 9).
 *
 * Reads ads-violations.generated.ts (produced by scripts/scan-ads-violations.ts)
 * and renders a sortable, severity-grouped table. Every row is a VS Code
 * deep link so engineers can jump to the offending line.
 *
 * Severity model:
 *   P0 — hand-rolled menus, banned imports (WCAG, governance violations)
 *   P1 — deprecated shim imports
 *   P2 — primitive duplication (e.g. local Lozenge wrapper when @atlaskit/lozenge exists)
 *
 * Hard guardrails:
 *   - @atlaskit/* primitives only
 *   - ADS tokens only
 */
import { useMemo, useState } from 'react';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Badge from '@atlaskit/badge';
import { token } from '@atlaskit/tokens';

import {
  adsViolations,
  adsViolationsStats,
  type AdsViolationSeverity,
  type AdsViolationCategory,
} from '@/registry/ads-violations.generated';

const REPO_ROOT = '/Users/vikramindla/Documents/GitHub/catalyst-prod-45';

const CATEGORY_LABELS: Record<AdsViolationCategory, string> = {
  'hand-rolled-dropdown': 'Hand-rolled dropdown',
  'banned-import': 'Banned import',
  'deprecated-shim': 'Deprecated shim',
  'lozenge-duplicate': 'Lozenge duplicate',
};

function SeverityChip({ severity }: { severity: AdsViolationSeverity }) {
  const appearance: Record<AdsViolationSeverity, 'removed' | 'moved' | 'new'> = {
    P0: 'removed',
    P1: 'moved',
    P2: 'new',
  };
  return <Lozenge appearance={appearance[severity]}>{severity}</Lozenge>;
}

function VscodeLink({ file, line }: { file: string; line: number }) {
  const href = `vscode://file/${REPO_ROOT}/${file}:${line}`;
  return (
    <a
      href={href}
      style={{
        color: token('color.link', '#0C66E4'),
        textDecoration: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", "Roboto Mono", monospace',
        fontSize: 12,
      }}
    >
      {file}:{line}
    </a>
  );
}

export default function ADSViolationsPanel() {
  const [severityFilter, setSeverityFilter] = useState<AdsViolationSeverity | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<AdsViolationCategory | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    return adsViolations.filter(v => {
      if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && v.category !== categoryFilter) return false;
      return true;
    });
  }, [severityFilter, categoryFilter]);

  const filterButton = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    count?: number,
  ) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 12,
        border: `1px solid ${
          isActive ? token('color.border.selected', '#0C66E4') : token('color.border', '#DCDFE4')
        }`,
        background: isActive
          ? token('color.background.selected', '#E9F2FF')
          : token('elevation.surface', '#FFFFFF'),
        color: isActive
          ? token('color.text.selected', '#0C66E4')
          : token('color.text', 'var(--cp-text-primary, #172B4D)'),
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
      {typeof count === 'number' && <Badge>{count}</Badge>}
    </button>
  );

  return (
    <div style={{ marginTop: token('space.200', '16px'), display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
      <div>
        <Heading size="medium">ADS violations</Heading>
        <p
          style={{
            marginTop: token('space.075', '6px'),
            marginBottom: 0,
            fontSize: 13,
            color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
            maxWidth: 760,
          }}
        >
          Live scan of {adsViolationsStats.total} ADS-compliance defects detected
          by <code>scripts/scan-ads-violations.ts</code>. Click any row to open
          the file at the offending line in VS Code. Re-run with{' '}
          <code>npm run scan:ads-violations</code> after a fix.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {filterButton('All severities', severityFilter === 'ALL', () => setSeverityFilter('ALL'), adsViolationsStats.total)}
        {(['P0', 'P1', 'P2'] as AdsViolationSeverity[]).map(sev =>
          filterButton(
            sev,
            severityFilter === sev,
            () => setSeverityFilter(sev),
            adsViolationsStats.bySeverity[sev] ?? 0,
          ),
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {filterButton('All categories', categoryFilter === 'ALL', () => setCategoryFilter('ALL'))}
        {(Object.keys(CATEGORY_LABELS) as AdsViolationCategory[]).map(cat =>
          filterButton(
            CATEGORY_LABELS[cat],
            categoryFilter === cat,
            () => setCategoryFilter(cat),
            adsViolationsStats.byCategory[cat] ?? 0,
          ),
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: token('space.300', '24px'),
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            background: token('color.background.success', '#DCFFF1'),
            color: token('color.text.success', '#216E4E'),
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          ✓ No violations match the current filter.
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: token('color.background.neutral.subtle', '#F7F8F9') }}>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left', width: 60 }}>Sev</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left', width: 180 }}>Category</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Location</th>
                <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Rule / suggestion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr
                  key={v.id}
                  style={{ borderTop: `1px solid ${token('color.border', '#DCDFE4')}` }}
                >
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top' }}>
                    <SeverityChip severity={v.severity} />
                  </td>
                  <td
                    style={{
                      padding: token('space.100', '8px'),
                      verticalAlign: 'top',
                      color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
                    }}
                  >
                    {CATEGORY_LABELS[v.category]}
                  </td>
                  <td style={{ padding: token('space.100', '8px'), verticalAlign: 'top' }}>
                    <VscodeLink file={v.file} line={v.line} />
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", "Roboto Mono", monospace',
                        fontSize: 11,
                        color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 360,
                      }}
                      title={v.excerpt}
                    >
                      {v.excerpt}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: token('space.100', '8px'),
                      verticalAlign: 'top',
                      color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
                    }}
                  >
                    <div>{v.rule}</div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
                      }}
                    >
                      Fix: {v.suggestion}
                      {v.claudeAnchor && ` (CLAUDE.md ${v.claudeAnchor})`}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
