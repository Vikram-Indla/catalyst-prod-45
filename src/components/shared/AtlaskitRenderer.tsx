/**
 * AtlaskitRenderer — Wrapper around @atlaskit/renderer
 * Renders ADF JSON content in read-only mode.
 * Use for displaying saved descriptions, acceptance criteria, and comments.
 *
 * IMPORTANT: `@atlaskit/renderer` bundles its OWN copy of prosemirror-state,
 * prosemirror-model, etc. If it loads eagerly on a page that also pulls in
 * Tiptap (e.g. /for-you renders work-item previews + StoryDetailModal uses
 * Tiptap), both ProseMirror copies register the same selection JSON IDs and
 * we get `RangeError: Duplicate use of selection JSON ID cell`.
 *
 * Fix: lazy-load `@atlaskit/renderer` via `React.lazy` so its module graph
 * only enters the page when an Atlaskit-rendered surface actually mounts.
 * The user-visible rendering experience is identical.
 */
import React, { Suspense, lazy } from 'react';
import type { ADFEntity } from '@atlaskit/adf-utils/types';

const LazyReactRenderer = lazy(async () => {
  const mod = await import('@atlaskit/renderer');
  return { default: mod.ReactRenderer as unknown as React.ComponentType<any> };
});

interface AtlaskitRendererProps {
  /** ADF document to render */
  document: ADFEntity;
  /** Appearance mode */
  appearance?: 'full-page' | 'comment';
  /** Max height before scroll (0 = no limit) */
  maxHeight?: number;
  /**
   * Optional map of ADF node type → React component override, passed
   * through to `@atlaskit/renderer` as `nodeComponents`. Catalyst uses
   * this to replace the default MediaCard (Atlassian-hosted media +
   * auth) with its own attachment pipeline. See
   * `components/shared/rich-text/atlaskit/atlaskitMediaOverrides.tsx`.
   */
  nodeComponents?: Record<string, React.ComponentType<any>>;
  /** Optional synchronous fallback while the chunk loads. */
  fallback?: React.ReactNode;
}

export default function AtlaskitRenderer({
  document,
  appearance = 'full-page',
  maxHeight = 0,
  nodeComponents,
  fallback,
}: AtlaskitRendererProps) {
  if (!document || !document.type) {
    return null;
  }

  return (
    <div
      className="atlaskit-renderer-wrapper"
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <Suspense fallback={fallback ?? <div style={{ minHeight: 24 }} aria-hidden />}>
        <LazyReactRenderer
          document={{ ...document, version: document.version ?? 1 } as any}
          appearance={appearance}
          adfStage="stage0"
          nodeComponents={nodeComponents}
        />
      </Suspense>
    </div>
  );
}
