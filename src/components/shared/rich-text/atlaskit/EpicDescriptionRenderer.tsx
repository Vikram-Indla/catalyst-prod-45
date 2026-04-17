/**
 * EpicDescriptionRenderer — Atlaskit-native ADF renderer for Epic descriptions.
 * Wraps `@atlaskit/renderer`'s ReactRenderer so the read view uses the same
 * ADF rendering pipeline that Jira itself uses, no HTML middleman.
 *
 * IMPORTANT: `@atlaskit/renderer` is lazy-loaded — see AtlaskitRenderer.tsx
 * for the rationale (avoids ProseMirror duplicate-selection-ID collision
 * with Tiptap on pages that mount both, e.g. /for-you).
 *
 * Media handling:
 *   - We feed the renderer ADF that has been normalized to use external
 *     media (`media.attrs.type === 'external'`, `attrs.url` set). Atlaskit's
 *     renderer handles external media without a MediaProvider.
 *   - Legacy ADF still using `attrs.url` with `attrs.type === 'file'` is
 *     coerced by the normalizer at parse time.
 */
import React, { Suspense, lazy, useMemo } from 'react';
import { IntlProvider } from 'react-intl-next';
import { parseStoredDescriptionToAdf } from './adfNormalizer';

const LazyReactRenderer = lazy(async () => {
  const mod = await import('@atlaskit/renderer');
  return { default: mod.ReactRenderer as unknown as React.ComponentType<any> };
});

interface EpicDescriptionRendererProps {
  /** Stored description as ADF object, ADF JSON string, plain text, or null. */
  content: unknown;
  /** Issue key — reserved for future attachment resolution. */
  issueKey?: string;
}

export default function EpicDescriptionRenderer({ content }: EpicDescriptionRendererProps) {
  const adf = useMemo(() => parseStoredDescriptionToAdf(content), [content]);

  return (
    <IntlProvider locale="en">
      <div className="epic-desc-atlaskit-renderer">
        <Suspense fallback={<div style={{ minHeight: 24 }} aria-hidden />}>
          <LazyReactRenderer
            document={adf as any}
            appearance="full-page"
            adfStage="stage0"
          />
        </Suspense>
      </div>
    </IntlProvider>
  );
}
