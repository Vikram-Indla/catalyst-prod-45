/**
 * EpicDescriptionRenderer — Pilot pivot.
 *
 * Original plan was to render Epic descriptions through `@atlaskit/renderer`
 * for canonical Jira-grade ADF rendering. That import path however pulls in
 * `@atlaskit/task-decision`, `@atlaskit/media-card`, `@atlaskit/media-client`,
 * `@atlaskit/media-core` and others whose transitive deps cannot be resolved
 * by Catalyst's npm registry mirror. Rollup fails the production build with
 * "failed to resolve import" errors that rotate as packages are added.
 *
 * Until Catalyst's build environment can reliably install the full
 * @atlaskit transitive dep tree, this component delegates to the existing
 * `AdfDescriptionRenderer` (ADF → HTML → React) which already produces
 * Jira-quality output for the description shapes Catalyst stores. The
 * data layer remains 100% ADF; only the renderer engine differs.
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
