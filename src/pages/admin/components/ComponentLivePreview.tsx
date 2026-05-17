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
import { ErrorBoundary } from 'react-error-boundary';
import Heading from '@atlaskit/heading';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

import type { ComponentRegistryEntry } from '@/registry/components.registry';
import { previewFixtures, hasFixture, getDeferredReason } from './componentPreviewFixtures';

interface ThemedFrameProps {
  mode: 'light' | 'dark';
  children: React.ReactNode;
}

function ThemedFrame({ mode, children }: ThemedFrameProps) {
  return (
    <div
      data-color-mode={mode}
      style={{
        border: `1px solid ${token('color.border', '#DCDFE4')}`,
        borderRadius: 6,
        padding: token('space.200', '16px'),
        background:
          mode === 'dark'
            ? token('color.background.neutral', '#22272B')
            : token('elevation.surface', '#FFFFFF'),
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
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: mode === 'dark'
            ? token('color.text.inverse', '#FFFFFF')
            : token('color.text.subtle', '#44546F'),
          opacity: 0.8,
        }}
      >
        {mode}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function PreviewError({ error }: { error: Error }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: token('color.text.danger', '#AE2A19'),
        background: token('color.background.danger', '#FFEDEB'),
        padding: token('space.100', '8px'),
        borderRadius: 4,
      }}
    >
      Render failed: {error.message}
    </div>
  );
}

export interface ComponentLivePreviewProps {
  entry: ComponentRegistryEntry;
}

export default function ComponentLivePreview({ entry }: ComponentLivePreviewProps) {
  const [resetKey, setResetKey] = useState(0);

  if (!hasFixture(entry.id)) {
    const reason = getDeferredReason(entry.id);
    return (
      <div>
        <Heading size="xsmall">Live preview</Heading>
        <div
          style={{
            marginTop: token('space.100', '8px'),
            padding: token('space.200', '16px'),
            border: `1px dashed ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            color: token('color.text.subtle', '#44546F'),
            fontSize: 13,
          }}
        >
          <strong>Preview deferred to v2.</strong>{' '}
          {reason ?? 'No fixture provided for this entry.'}
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
        <ErrorBoundary FallbackComponent={PreviewError}>
          <ThemedFrame mode="light">{fixture()}</ThemedFrame>
        </ErrorBoundary>
        <ErrorBoundary FallbackComponent={PreviewError}>
          <ThemedFrame mode="dark">{fixture()}</ThemedFrame>
        </ErrorBoundary>
      </div>
    </div>
  );
}
