/**
 * Empty state for Dependencies tab — shown when no dependencies exist
 *
 * Layout: centered flex column with headline + subtext + illustration + CTA button
 */

import React from 'react';
import Button from '@atlaskit/button/new';
import { Plus, Link2 } from '@/lib/atlaskit-icons';

const T = {
  headline: { fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: '16px 0 8px 0' },
  subtext: { fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: 'var(--ds-text, #292A2E)', margin: 0 },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 32px',
    textAlign: 'center' as const,
  },
};

interface DependenciesEmptyStateProps {
  projectKey: string;
  onAddClick: () => void;
}

export default function DependenciesEmptyState({ projectKey, onAddClick }: DependenciesEmptyStateProps) {
  return (
    <div style={T.container}>
      {/* Illustration — ADS Link2 glyph in a neutral tile (no emoji; enterprise guardrail) */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 8,
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          color: 'var(--ds-text-subtlest, #6B778C)',
        }}
      >
        <Link2 size={48} />
      </div>

      {/* Headline */}
      <h4 style={T.headline}>No dependencies yet</h4>

      {/* Subtext */}
      <p style={{ ...T.subtext, marginBottom: 24, maxWidth: 400 }}>
        Map out which work items are blocking or blocked by others to visualize project dependencies.
      </p>

      {/* CTA Button */}
      <Button appearance="primary" onClick={onAddClick} iconBefore={Plus}>
        Add dependency
      </Button>

      {/* Secondary link */}
      <p style={{ ...T.subtext, marginTop: 24, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, #505258)' }}>
        Dependencies are stored locally and synced within {projectKey}
      </p>
    </div>
  );
}
