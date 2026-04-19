/**
 * CANONICAL — Description section for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Renders ADF (Atlassian Document Format) content with full Jira-parity
 * (headings, bold, numbered lists, tables with borders, media with lightbox).
 * Includes expand/collapse toggle matching Jira's collapsible sections.
 * Click-to-edit: clicking the description or pencil icon enters edit mode
 * with the canonical Atlaskit editor (@atlaskit/editor-core). On a chunk
 * load or runtime failure the AtlaskitBoundary falls back to the existing
 * TipTap editor / HTML renderer so users are never stranded.
 */
import React, { Suspense, lazy, useState, useCallback } from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import Heading from '@atlaskit/heading';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adfToHtml } from '@/modules/project-work-hub/utils/adfToHtml';
import { AdfDescriptionRenderer } from '@/modules/project-work-hub/components/AdfDescriptionRenderer';
import { CatalystRichTextEditor } from '@/components/shared/rich-text';
import { prefetchEpicEditor } from '@/lib/atlaskitPrefetch';
import type { PhIssue } from '../types';

/* Atlaskit description — canonical across ALL issue types.
   LAYER 1 — STRICT VIEW/EDIT SPLIT (Atlassian-canonical).
   The renderer chunk (~400–600KB) is loaded on view.
   The editor-core chunk (~2MB) is loaded only on Edit click.

   These lazy imports MUST target the component files directly, NOT the
   `@/components/shared/rich-text/atlaskit` barrel. Rollup treats each
   `import(...)` specifier as the module boundary for the generated chunk:
   if both dynamic imports resolve to the same barrel module, Rollup
   hoists every barrel re-export into one chunk — so loading the
   Renderer drags `@atlaskit/editor-core` with it. Direct file imports
   keep the two graphs separate and let the renderer load alone on view.

   Wrapped in AtlaskitBoundary so a chunk-load failure or runtime error
   surfaces in the console and a safe TipTap/HTML path is used as fallback.

   Data-contract shim: `parseStoredDescriptionToAdf` (inside the Atlaskit
   Editor/Renderer components) accepts ADF object, ADF JSON string, plain
   text, or null. Issue types that historically stored only plain text in
   `description_text` are transparently wrapped as a single ADF paragraph
   on first load. On save, the editor writes normalized ADF JSON back to
   `ph_issues.description_adf`, completing the lazy migration.

   File names still reference "Epic" for historical reasons; the files
   themselves are generic ADF editor/renderer pair. File renames are a
   separate follow-up task. */
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);
const EpicDescriptionRenderer = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer'),
);
import { AtlaskitBoundary } from '@/components/shared/rich-text/atlaskit/AtlaskitBoundary';

function AtlaskitFallback({ minHeight = 80 }: { minHeight?: number }) {
  return (
    <div style={{ minHeight, paddingLeft: 20, color: '#97A0AF', fontSize: 13 }}>
      Loading editor…
    </div>
  );
}

/* LAYER 2 (mini) — pre-hydration placeholder parity.
   Renders the description via the synchronous HTML path that is already
   in the main bundle, so the text is on screen in <5ms. When the real
   @atlaskit/renderer chunk arrives, React swaps it in with matching
   typography and lineHeight — no layout shift, no flash of empty state.
   This is the same DOM the Atlaskit-failure fallback produces, so the
   placeholder is guaranteed to match the chunk-failure path as well. */
function AtlaskitRendererPlaceholder({
  html,
  issueKey,
}: {
  html: string;
  issueKey?: string;
}) {
  return (
    <div
      className="cv-desc-body"
      // Jira-measured: body 14/400, line-height 1.5, #292A2E, Atlassian Sans
      style={{
        fontSize: 14, fontWeight: 400, color: '#292A2E', lineHeight: 1.5,
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
      }}
    >
      <AdfDescriptionRenderer html={html} issueKey={issueKey} />
    </div>
  );
}

/* Build-ID marker so we can distinguish which deployed commit is running
   by looking at the console without checking chunk hashes. Update when
   the description surface changes materially. */
const DESC_BUILD_ID = 'atlaskit-canonical-v218';

/* ── Scoped styles for ADF content inside CatalystView ── */
const STYLE_ID = 'cv-desc-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    /* Scoped ADF content styles — target BOTH wrappers so list/typography
       render correctly in the Atlaskit-success path (.adf-description-content
       from AdfDescriptionRenderer) AND the sync fallback path (.cv-desc-body
       from AtlaskitRendererPlaceholder). Without the .adf-description-content
       selector, bullets/numbers disappear when the real Atlaskit renderer
       chunk loads because list-style defaults to none in reset stylesheets.
       Jira-parity bullet style: filled disc top-level, hollow circle nested,
       square third-level (matching Atlassian's canonical ADF renderer). */
    .cv-desc-body h1, .adf-description-content h1 { font-size: 24px; font-weight: 700; margin: 20px 0 8px; color: #292A2E; line-height: 1.3; }
    .cv-desc-body h2, .adf-description-content h2 { font-size: 20px; font-weight: 600; margin: 16px 0 8px; color: #292A2E; line-height: 1.3; }
    .cv-desc-body h3, .adf-description-content h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: #292A2E; line-height: 1.4; }
    .cv-desc-body h4, .adf-description-content h4 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; color: #292A2E; }
    .cv-desc-body h5, .adf-description-content h5 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; color: #292A2E; }
    .cv-desc-body h6, .adf-description-content h6 { font-size: 12px; font-weight: 600; margin: 8px 0 4px; color: #5E6C84; text-transform: uppercase; }
    .cv-desc-body ol, .cv-desc-body ul,
    .adf-description-content ol, .adf-description-content ul { margin: 4px 0 8px; padding-left: 24px; }
    .cv-desc-body li, .adf-description-content li { margin-bottom: 4px; }
    .cv-desc-body ol, .adf-description-content ol { list-style-type: decimal; }
    .cv-desc-body ul, .adf-description-content ul { list-style-type: disc; }
    .cv-desc-body ul ul, .adf-description-content ul ul { list-style-type: circle; }
    .cv-desc-body ul ul ul, .adf-description-content ul ul ul { list-style-type: square; }
    .cv-desc-body ol ol, .adf-description-content ol ol { list-style-type: lower-alpha; }
    .cv-desc-body ol ol ol, .adf-description-content ol ol ol { list-style-type: lower-roman; }
    .cv-desc-body table, .adf-description-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .cv-desc-body th, .adf-description-content th { background: #F4F5F7; font-weight: 600; text-align: left; }
    .cv-desc-body th, .cv-desc-body td,
    .adf-description-content th, .adf-description-content td { border: 1px solid #DFE1E6; padding: 8px 12px; font-size: 14px; vertical-align: top; }
    .cv-desc-body blockquote, .adf-description-content blockquote { border-left: 2px solid #DFE1E6; padding: 8px 12px; margin: 8px 0; color: #5E6C84; }
    .cv-desc-body pre, .adf-description-content pre { background: #F4F5F7; padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin: 4px 0 8px; font-family: 'JetBrains Mono', monospace; }
    .cv-desc-body code, .adf-description-content code { background: #F4F5F7; padding: 2px 4px; border-radius: 3px; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
    .cv-desc-body pre code, .adf-description-content pre code { background: none; padding: 0; }
    .cv-desc-body p, .adf-description-content p { margin: 0 0 8px; font-weight: 400; }
    .cv-desc-body a, .adf-description-content a { color: #0052CC; text-decoration: none; }
    .cv-desc-body a:hover, .adf-description-content a:hover { text-decoration: underline; }
    .cv-desc-body hr, .adf-description-content hr { border: none; border-top: 1px solid #DFE1E6; margin: 16px 0; }
    .cv-desc-body img, .adf-description-content img { max-width: 100%; border-radius: 4px; cursor: pointer; }
  `;
  document.head.appendChild(s);
}

interface CatalystDescriptionSectionProps {
  issue: PhIssue | null;
  /** Override the section heading (default: "Description") */
  label?: string;
  /** Start collapsed (default: false) */
  defaultCollapsed?: boolean;
}

export function CatalystDescriptionSection({ issue, label = 'Description', defaultCollapsed = false }: CatalystDescriptionSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const queryClient = useQueryClient();

  /* Per-issue diagnostic at info level (visible at default console filter).
     Prints the build ID so we can confirm which deployed bundle is live
     without inspecting chunk hashes. */
  React.useEffect(() => {
    if (!issue) return;
    // eslint-disable-next-line no-console
    console.info(
      `[CatalystDescriptionSection] build=${DESC_BUILD_ID} issue_key=${issue.issue_key ?? 'n/a'} issue_type=${JSON.stringify(issue.issue_type)} → ATLASKIT`,
    );
  }, [issue]);

  // Raw ADF content string for the editor (prefer description_adf_raw → description_adf → text)
  const rawAdfContent = issue?.description_adf
    ? (typeof issue.description_adf === 'string' ? issue.description_adf : JSON.stringify(issue.description_adf))
    : (issue?.description_text || '');

  const descHtml = adfToHtml(issue?.description_adf) || issue?.description_text || '';
  const isEmpty = !descHtml.trim();

  // Mutation to save description
  const saveDescriptionMutation = useMutation({
    mutationFn: async (adfJson: string) => {
      const parsed = adfJson ? JSON.parse(adfJson) : null;
      await supabase
        .from('ph_issues')
        .update({ description_adf: parsed })
        .eq('id', issue!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue?.id] });
      setEditing(false);
    },
  });

  const handleSave = useCallback((adfJson: string) => {
    if (!issue) return;
    saveDescriptionMutation.mutate(adfJson);
  }, [issue, saveDescriptionMutation]);

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header with expand/collapse + edit button */}
      {/* Phase D.1 (2026-04-18): typography moved to Atlaskit Heading (size="small"
          maps to a semantic h3 styled via @atlaskit/tokens). The outer div keeps
          flex / gap / hover + click-to-collapse behavior; font styling is no
          longer inline. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: collapsed ? 0 : 8, userSelect: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1 }}
        >
          <ChevronRight
            size={16}
            style={{
              transition: 'transform 0.15s ease',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              color: '#5E6C84',
            }}
          />
          <Heading size="small">{label}</Heading>
        </div>
        {/* Edit pencil — visible on hover, hidden when editing or collapsed */}
        {!collapsed && !editing && issue && (
          <button
            onClick={() => setEditing(true)}
            title="Edit description"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 4, color: '#6B778C',
              display: 'flex', alignItems: 'center',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s, color 0.1s, background 0.1s',
            }}
            /*
             * Layer 3 — intent-based prefetch.
             * The Atlaskit editor chunk is ~2MB; start its dynamic import
             * the moment the user hovers or focuses the pencil. By the
             * time the click fires, vendor-atlaskit-editor is in the HTTP
             * cache and the editor mounts synchronously from Suspense.
             * No visible loading state for 95% of users.
             */
            onMouseEnter={e => {
              e.currentTarget.style.color = '#292A2E';
              e.currentTarget.style.background = '#F4F5F7';
              prefetchEpicEditor();
            }}
            onFocus={() => { prefetchEpicEditor(); }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        editing && issue ? (
          /* ── Edit mode — canonical Atlaskit editor for every issue type.
             AtlaskitBoundary is kept strictly as a runtime safety net: if
             the @atlaskit/editor-core chunk fails to load (network / CDN
             outage) or throws, the boundary renders the existing TipTap
             editor so the user is never stranded without a working
             composer. This is NOT an issue-type gate — it is a
             chunk-failure gate. */
          <div style={{ paddingLeft: 20 }}>
            <AtlaskitBoundary
              diagnosticTag={`description-edit:${issue.issue_key ?? issue.id}`}
              fallback={
                <CatalystRichTextEditor
                  content={rawAdfContent}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  placeholder="Add a description..."
                  minHeight={200}
                  mode="save"
                  workItemId={issue.id}
                  storagePath="description-images"
                />
              }
            >
              <Suspense fallback={<AtlaskitFallback minHeight={240} />}>
                <EpicDescriptionEditor
                  initialContent={issue.description_adf ?? issue.description_text ?? null}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  workItemId={issue.id}
                  placeholder="Add a description..."
                />
              </Suspense>
            </AtlaskitBoundary>
          </div>
        ) : isEmpty ? (
          /* ── Empty placeholder — click to edit ── */
          <div
            onClick={() => { if (issue) setEditing(true); }}
            style={{
              fontSize: 14, color: '#97A0AF', fontStyle: 'italic',
              minHeight: 40, paddingLeft: 20, cursor: issue ? 'pointer' : 'default',
              borderRadius: 4, padding: '8px 20px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (issue) e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Add a description...
          </div>
        ) : (
          /* ── Read-only ADF render — canonical Atlaskit renderer for every
             issue type. Click anywhere to enter edit mode (Jira parity).
             AtlaskitBoundary falls back to the synchronous HTML renderer
             only on a chunk-load / runtime failure — NOT on issue type. */
          <div
            role="button"
            tabIndex={0}
            style={{
              paddingLeft: 20, minHeight: 40, cursor: 'text', borderRadius: 4,
              position: 'relative',
              transition: 'background 0.15s',
            }}
            onClick={() => { if (issue) setEditing(true); }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && issue) {
                e.preventDefault();
                setEditing(true);
              }
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title="Click to edit"
          >
            <AtlaskitBoundary
              diagnosticTag={`description-view:${issue?.issue_key ?? issue?.id ?? 'n/a'}`}
              fallback={
                <AtlaskitRendererPlaceholder html={descHtml} issueKey={issue?.issue_key} />
              }
            >
              <Suspense
                fallback={
                  <AtlaskitRendererPlaceholder html={descHtml} issueKey={issue?.issue_key} />
                }
              >
                <EpicDescriptionRenderer content={issue?.description_adf ?? issue?.description_text ?? null} issueKey={issue?.issue_key} />
              </Suspense>
            </AtlaskitBoundary>
          </div>
        )
      )}
    </div>
  );
}
