/**
 * ComponentLivePreview — light + dark side-by-side render of a registry entry.
 *
 * Authored: 2026-05-17 (preflight Step 8).
 *
 * Renders the actual component (from previewFixtures) twice — inside a
 * `data-color-mode="light"` wrapper and a `data-color-mode="dark"` wrapper —
 * so engineers can visually verify a canonical component resolves all ADS
 * tokens correctly in both themes.
 *
 * v1 covers atoms that render without app providers. For organisms that
 * need QueryClient / AuthProvider / Router context, the preview shows a
 * "Deferred to v2" placeholder with a fixture-status badge in the
 * ComponentSpecCard (Step 7 wired the call site).
 *
 * Hard guardrails:
 *   - @atlaskit/* primitives only
 *   - ADS tokens only
 *   - Side-by-side frame uses CSS grid (no hand-rolled flex tabs)
 */
import { useState } from 'react';
import Heading from '@atlaskit/heading';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { ComponentRegistryEntry } from '@/registry/components.registry';
import { previewFixtures, hasFixture, DEFERRED_ENTRIES } from './componentPreviewFixtures';

interface ThemedFrameProps {
  mode: 'light' | 'dark';
  children: React.ReactNode;
}

function ThemedFrame({ mode, children }: ThemedFrameProps) {
  return (
    <div
      data-color-mode={mode}
      style={{
        border: `1px solid ${token('color.border', 'var(--ds-border-disabled, #DCDFE4)')}`,
        borderRadius: 6,
        padding: token('space.200', '16px'),
        background:
          mode === 'dark'
            ? token('color.background.neutral', 'var(--ds-surface, #FFFFFF)')
            : token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100', '8px'),
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: mode === 'dark'
            ? token('color.text.inverse', 'var(--ds-surface, #FFFFFF)')
            : token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
          opacity: 0.8,
        }}
      >
        {mode === 'dark' ? 'Dark' : 'Light'}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

const PREVIEW_ERROR_FALLBACK = (
  <div
    style={{
      fontSize: 12,
      color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
      background: token('color.background.danger', 'var(--ds-background-danger, #FFECEB)'),
      padding: token('space.100', '8px'),
      borderRadius: 4,
    }}
  >
    Render failed — open the spec card source link to inspect.
  </div>
);

export interface ComponentLivePreviewProps {
  entry: ComponentRegistryEntry;
}

export default function ComponentLivePreview({ entry }: ComponentLivePreviewProps) {
  const [resetKey, setResetKey] = useState(0);

  if (!hasFixture(entry.id)) {
    const deferred = DEFERRED_ENTRIES[entry.id];
    return (
      <div>
        <Heading size="xsmall">Live preview</Heading>
        <div
          style={{
            marginTop: token('space.100', '8px'),
            padding: token('space.200', '16px'),
            border: `1px dashed ${token('color.border.warning', 'var(--ds-background-warning-bold, #E2B203)')}`,
            borderRadius: 6,
            background: token('color.background.warning', 'var(--ds-background-warning, #FFF7D6)'),
            display: 'flex',
            flexDirection: 'column',
            gap: token('space.150', '12px'),
          }}
        >
          <div style={{ fontSize: 13, color: token('color.text.warning', 'var(--ds-text-warning, #974F0C)') }}>
            <strong>Inline preview unavailable.</strong>{' '}
            {deferred?.reason ?? 'No fixture provided for this entry.'}
          </div>
          {deferred && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {deferred.liveRoutes.map(route => (
                <a
                  key={route.href}
                  href={route.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 3,
                    background: token('color.background.brand.bold', 'var(--ds-link, #0C66E4)'),
                    color: 'var(--ds-text-inverse, #FFFFFF)',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {route.label} ↗
                </a>
              ))}
              {deferred.docsUrl && (
                <a
                  href={deferred.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 3,
                    border: `1px solid ${token('color.border.warning', 'var(--ds-background-warning-bold, #E2B203)')}`,
                    background: 'transparent',
                    color: token('color.text.warning', 'var(--ds-text-warning, #974F0C)'),
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  atlassian.design examples ↗
                </a>
              )}
              {deferred.sourceFile && (
                <a
                  href={`vscode://file/${entry.file_path ? '/Users/vikramindla/Documents/GitHub/catalyst-prod-45/' + deferred.sourceFile : ''}`}
                  style={{
                    fontSize: 11,
                    color: token('color.text.subtle', 'var(--ds-icon, #44546F)'),
                    textDecoration: 'none',
                    fontFamily: 'var(--ds-font-family-code)',
                  }}
                >
                  {deferred.sourceFile}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const fixture = previewFixtures[entry.id];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.150', '12px'),
          marginBottom: token('space.100', '8px'),
        }}
      >
        <Heading size="xsmall">Live preview</Heading>
        <Button
          appearance="subtle"
          spacing="compact"
          onClick={() => setResetKey(k => k + 1)}
        >
          Reset
        </Button>
      </div>
      <div
        key={resetKey}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: token('space.200', '16px'),
        }}
      >
        <ErrorBoundary fallback={PREVIEW_ERROR_FALLBACK}>
          <ThemedFrame mode="light">{fixture()}</ThemedFrame>
        </ErrorBoundary>
        <ErrorBoundary fallback={PREVIEW_ERROR_FALLBACK}>
          <ThemedFrame mode="dark">{fixture()}</ThemedFrame>
        </ErrorBoundary>
      </div>
    </div>
  );
}
