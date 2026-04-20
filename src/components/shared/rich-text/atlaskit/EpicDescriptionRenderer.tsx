/**
 * EpicDescriptionRenderer — ADF read-mode renderer.
 *
 * Catalyst's canonical read-side renderer for stored ADF (epic / story /
 * task descriptions, comments, acceptance criteria). Delegates to
 * `@atlaskit/renderer` for 1:1 Jira parity on rich formatting, tables,
 * panels, layout columns, and inline nodes. Media nodes are overridden
 * through `mediaNodeComponents` to use Catalyst's attachment pipeline
 * (ph_issue_attachments → local_public_url → jira-attachment-proxy).
 *
 * 2026-04-20 — plain-text PlainTextFallback + AtlaskitRenderBoundary
 * REMOVED. Atlaskit is now the single rich-text surface; per product
 * directive there is no fallback projection. Previously required
 * because TipTap's StarterKit double-registered prosemirror-gapcursor
 * and prosemirror-tables jsonIDs against @atlaskit/editor-core,
 * crashing the renderer; that collision was eliminated by ripping
 * TipTap out of CreateStoryModal + BusinessRequestDetailModal (the
 * only two TipTap consumers in the project-hub module graph).
 *
 * Failure modes:
 *   - Empty / null content → render nothing (caller handles empty state).
 *   - Renderer chunk still loading → Suspense boundary inside
 *     <AtlaskitRenderer> renders nothing until the chunk resolves.
 *   - Renderer genuinely throws → propagates to the nearest app
 *     ErrorBoundary (which re-renders the whole view in recoverable
 *     shape). No plain-text projection; Atlaskit is canonical.
 */
import { useMemo } from 'react';
import AtlaskitRenderer from '@/components/shared/AtlaskitRenderer';
import { parseStoredDescriptionToAdf } from './adfNormalizer';
import { isAdfEmpty } from './adfHelpers';
import { mediaNodeComponents, MediaProvidersShell } from './atlaskitMediaOverrides';

interface EpicDescriptionRendererProps {
  /** Stored description as ADF object, ADF JSON string, plain text, or null. */
  content: unknown;
  /** Issue key — used by MediaProvidersShell to resolve media attachments. */
  issueKey?: string;
}

export default function EpicDescriptionRenderer({ content, issueKey }: EpicDescriptionRendererProps) {
  const { doc, empty } = useMemo(() => ({
    doc: parseStoredDescriptionToAdf(content),
    empty: isAdfEmpty(content),
  }), [content]);

  if (empty) return null;

  return (
    <MediaProvidersShell issueKey={issueKey}>
      <AtlaskitRenderer
        document={doc}
        appearance="full-page"
        nodeComponents={mediaNodeComponents}
      />
    </MediaProvidersShell>
  );
}
