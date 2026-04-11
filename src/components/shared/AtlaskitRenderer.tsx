/**
 * AtlaskitRenderer — Wrapper around @atlaskit/renderer
 * Renders ADF JSON content in read-only mode.
 * Use for displaying saved descriptions, acceptance criteria, and comments.
 */
import React from 'react';
import { ReactRenderer } from '@atlaskit/renderer';
import type { ADFEntity } from '@atlaskit/adf-utils/types';

interface AtlaskitRendererProps {
  /** ADF document to render */
  document: ADFEntity;
  /** Appearance mode */
  appearance?: 'full-page' | 'comment';
  /** Max height before scroll (0 = no limit) */
  maxHeight?: number;
}

export default function AtlaskitRenderer({
  document,
  appearance = 'full-page',
  maxHeight = 0,
}: AtlaskitRendererProps) {
  if (!document || !document.type) {
    return null;
  }

  return (
    <div
      className="atlaskit-renderer-wrapper"
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <ReactRenderer
        document={{ ...document, version: document.version ?? 1 } as any}
        appearance={appearance}
        adfStage="stage0"
      />
    </div>
  );
}
