/**
 * EpicDescriptionRenderer — ADF read-mode renderer.
 *
 * Canonical plan is to render through `@atlaskit/renderer` for 1:1 Jira
 * parity. That import path pulls in `@atlaskit/task-decision`,
 * `@atlaskit/media-card`, `@atlaskit/media-client`, `@atlaskit/media-core`
 * and other transitive packages which the Lovable npm registry mirror
 * currently refuses (403 on a rotating subset). Vite's dev import-analysis
 * then fails to resolve `@atlaskit/renderer` and surfaces an overlay on
 * pages that idle-prefetch the chunk (e.g. /for-you via
 * `warmAtlaskitViewOnIdle`).
 *
 * Until Catalyst's build environment can reliably install the full
 * @atlaskit transitive tree, this wrapper delegates to the existing
 * `AdfDescriptionRenderer` (ADF → HTML → React) which already produces
 * Jira-quality output for the description shapes Catalyst stores. The
 * data layer remains 100% ADF; only the renderer engine differs. Swap
 * the internals back to `@atlaskit/renderer` once the registry is fixed —
 * no caller changes required.
 */
import React, { useMemo } from 'react';
import { AdfDescriptionRenderer } from '@/modules/project-work-hub/components/AdfDescriptionRenderer';
import { adfToHtml } from '@/modules/project-work-hub/utils/adfToHtml';
import { parseStoredDescriptionToAdf } from './adfNormalizer';

interface EpicDescriptionRendererProps {
  /** Stored description as ADF object, ADF JSON string, plain text, or null. */
  content: unknown;
  /** Issue key — used by AdfDescriptionRenderer to resolve media attachments. */
  issueKey?: string;
}

export default function EpicDescriptionRenderer({ content, issueKey }: EpicDescriptionRendererProps) {
  const html = useMemo(() => {
    const adf = parseStoredDescriptionToAdf(content);
    return adfToHtml(adf as any) || '';
  }, [content]);

  return <AdfDescriptionRenderer html={html} issueKey={issueKey} />;
}
