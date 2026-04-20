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
 * Retires the bespoke `adfToHtml` translator — previously this component
 * rendered ADF → HTML → dangerouslySetInnerHTML via
 * `AdfDescriptionRenderer`. That path dropped node types the translator
 * didn't know about (mediaInline, layoutSection/Column, nestedExpand,
 * decisionList) and diverged from Jira's native rendering in subtle
 * ways. The @atlaskit/renderer path covers the full schema.
 *
 * Failure modes covered:
 *   - Empty / null content → render nothing (caller handles empty state).
 *   - Renderer chunk still loading → Suspense fallback shows plain-text
 *     projection (structured prose preserved via `adfToPlainText`).
 *   - Renderer throws during render → ErrorBoundary catches, falls back
 *     to the same plain-text projection so the page never white-screens.
 *
 * Public API unchanged from prior versions — call sites do not churn.
 */
import React, { Component, type ErrorInfo, type ReactNode, useMemo } from 'react';
import AtlaskitRenderer from '@/components/shared/AtlaskitRenderer';
import { parseStoredDescriptionToAdf } from './adfNormalizer';
import { adfToPlainText, isAdfEmpty } from './adfHelpers';
import { mediaNodeComponents, MediaProvidersShell } from './atlaskitMediaOverrides';

interface EpicDescriptionRendererProps {
  /** Stored description as ADF object, ADF JSON string, plain text, or null. */
  content: unknown;
  /** Issue key — used by MediaProvidersShell to resolve media attachments. */
  issueKey?: string;
}

/* ── Error boundary ─────────────────────────────────────────────
   If @atlaskit/renderer throws (schema mismatch, chunk hydrate
   failure, node-component bug), collapse to the plain-text
   projection rather than white-screening the whole detail view. */
interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}
interface BoundaryState { hasError: boolean; }

class AtlaskitRenderBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the signal in the console — this is the chunk-load / render-error path
    // and we want to notice regressions without surfacing to the user.
    // eslint-disable-next-line no-console
    console.warn('[EpicDescriptionRenderer] @atlaskit/renderer threw — falling back to plain text', error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/* ── Plain-text projection (skeleton + error fallback) ──────── */
function PlainTextFallback({ text }: { text: string }) {
  if (!text) return null;
  // Preserve paragraph breaks from `adfToPlainText` output.
  return (
    <div
      className="atlaskit-renderer-fallback"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--cp-text-primary, #0F172A)',
        whiteSpace: 'pre-wrap',
      }}
    >
      {text}
    </div>
  );
}

export default function EpicDescriptionRenderer({ content, issueKey }: EpicDescriptionRendererProps) {
  const { doc, plain, empty } = useMemo(() => {
    const parsed = parseStoredDescriptionToAdf(content);
    return {
      doc: parsed,
      plain: adfToPlainText(content),
      empty: isAdfEmpty(content),
    };
  }, [content]);

  if (empty) return null;

  return (
    <MediaProvidersShell issueKey={issueKey}>
      <AtlaskitRenderBoundary fallback={<PlainTextFallback text={plain} />}>
        <AtlaskitRenderer
          document={doc}
          appearance="full-page"
          nodeComponents={mediaNodeComponents}
          fallback={<PlainTextFallback text={plain} />}
        />
      </AtlaskitRenderBoundary>
    </MediaProvidersShell>
  );
}
