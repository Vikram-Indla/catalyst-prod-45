/**
 * CANONICAL — Description section for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Renders ADF (Atlassian Document Format) content with full Jira-parity
 * (headings, bold, numbered lists, tables with borders, media with lightbox).
 * Includes expand/collapse toggle matching Jira's collapsible sections.
 * Click-to-edit: clicking the description or pencil icon enters edit mode
 * with the canonical Atlaskit editor (@atlaskit/editor-core).
 *
 * 2026-04-20 — TipTap fallback removed (USER DIRECTIVE). There is no
 * fallback editor; if the Atlaskit chunk fails to load we surface an
 * explicit error so the failure is visible and fixable rather than
 * silently dropping users onto a different editor whose output shape
 * we do not accept.
 */
import React, { Suspense, lazy, useState, useCallback } from 'react';
/* jira-compare 2026-05-03 (Council P3.2): lucide ChevronRight + Pencil
   removed — CLAUDE.md "ADS-only inside hub scope" violation. Swapped to
   Atlaskit equivalents. Heading wrapper also dropped in favour of an
   inline H2 styled to Jira's measured "Description" label values
   (testid issue.views.issue-base.common.description.label probed
   2026-05-03: H2 / 14px / weight 500 / rgb(80,82,88) / lh ~19). */
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import EditIcon from '@atlaskit/icon/core/edit';
import Spinner from '@atlaskit/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adfToPlainText, isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
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

function AtlaskitFallback({ minHeight = 80 }: { minHeight?: number }) {
  /* jira-compare follow-up (2026-05-02): replaced literal "Loading editor…"
     text with @atlaskit/spinner — matches Jira NIN's editor-chunk
     hydration pattern (subtle spinner, no visible English string). */
  return (
    <div style={{
      minHeight, paddingLeft: 20, display: 'flex', alignItems: 'center',
      gap: 8, color: 'var(--ds-text-subtlest, #6B778C)',
    }}>
      <Spinner size="small" label="Loading editor" />
    </div>
  );
}

/* LAYER 2 (mini) — pre-hydration placeholder parity.
   Renders the description as plain text (via `adfToPlainText`) so prose
   is on screen in <5ms while the @atlaskit/renderer chunk loads. When
   the real renderer arrives, React swaps in the fully-styled markup —
   images, tables, panels, lists. No layout shift for plain prose; the
   first frame of richer content is a brief text-only flash (accepted
   trade for eliminating the bespoke ADF→HTML translator). Same DOM as
   the chunk-failure fallback path. */
function AtlaskitRendererPlaceholder({
  plain,
}: {
  plain: string;
}) {
  return (
    <div
      className="cv-desc-body"
      // Jira-measured: body 14/400, line-height 1.5, #292A2E, Atlassian Sans
      style={{
        fontSize: 14, fontWeight: 400, color: '#292A2E', lineHeight: 1.5,
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
        whiteSpace: 'pre-wrap',
      }}
    >
      {plain}
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
    /* Scoped ADF content styles — target BOTH the Atlaskit renderer path
       (.atlaskit-renderer-wrapper, set by our AtlaskitRenderer wrapper)
       and the plain-text fallback paths (.cv-desc-body on the placeholder,
       .atlaskit-renderer-fallback on the ErrorBoundary fallback). Without
       explicit list-style on these wrappers, bullets/numbers disappear in
       some Jira ADFs because list-style defaults to 'none' in the
       Atlaskit reset. Jira-parity bullet style: filled disc top-level,
       hollow circle nested, square third-level (matching Atlassian's
       canonical ADF renderer). The legacy '.adf-description-content'
       selector is retained defensively in case any stale prerender DOM
       sneaks in; safe to drop in a future pass. */
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
    .cv-desc-body th, .adf-description-content th { background: var(--ds-surface-sunken, #F4F5F7); font-weight: 600; text-align: left; }
    .cv-desc-body th, .cv-desc-body td,
    .adf-description-content th, .adf-description-content td { border: 1px solid var(--ds-border, #DFE1E6); padding: 8px 12px; font-size: 14px; vertical-align: top; }
    .cv-desc-body blockquote, .adf-description-content blockquote { border-left: 2px solid var(--ds-border, #DFE1E6); padding: 8px 12px; margin: 8px 0; color: #5E6C84; }
    .cv-desc-body pre, .adf-description-content pre { background: var(--ds-surface-sunken, #F4F5F7); padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin: 4px 0 8px; font-family: var(--cp-font-mono); }
    .cv-desc-body code, .adf-description-content code { background: var(--ds-surface-sunken, #F4F5F7); padding: 2px 4px; border-radius: 3px; font-size: 12px; font-family: var(--cp-font-mono); }
    .cv-desc-body pre code, .adf-description-content pre code { background: none; padding: 0; }
    .cv-desc-body p, .adf-description-content p { margin: 0 0 8px; font-weight: 400; }

    /* jira-compare 2026-05-03 (Council P3.3 — body pixel fix):
       Atlaskit Renderer's bundled CSS paints body text at 16px / lh 24
       in slate-900 (rgb(15,23,42)) — that's Catalyst's Tailwind base
       leaking through, NOT a Jira value. Jira's measured body
       (testid issue.views.field.rich-text.description) is 14px / 400 /
       rgb(41,42,46) / lh 20. Override by selector specificity with
       !important since Atlaskit's CSS-in-JS class wins ordinary cascade. */
    .atlaskit-renderer-wrapper,
    .atlaskit-renderer-wrapper p,
    .atlaskit-renderer-wrapper li,
    .atlaskit-renderer-wrapper div {
      font-size: 14px !important;
      line-height: 20px !important;
      color: var(--ds-text, rgb(41,42,46)) !important;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif !important;
    }
    /* Headings inside the renderer keep their relative scale but use ADS
       text token, not slate-900. */
    .atlaskit-renderer-wrapper h1,
    .atlaskit-renderer-wrapper h2,
    .atlaskit-renderer-wrapper h3,
    .atlaskit-renderer-wrapper h4,
    .atlaskit-renderer-wrapper h5,
    .atlaskit-renderer-wrapper h6 {
      color: var(--ds-text, rgb(41,42,46)) !important;
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif !important;
    }
    /* Inline images inside the renderer: Jira renders br=0 (probed
       2026-05-03 on BAU-5737); Catalyst's earlier 4px was speculative. */
    .atlaskit-renderer-wrapper img {
      border-radius: 0 !important;
    }
    .cv-desc-body a, .adf-description-content a { color: #0052CC; text-decoration: none; }
    .cv-desc-body a:hover, .adf-description-content a:hover { text-decoration: underline; }
    .cv-desc-body hr, .adf-description-content hr { border: none; border-top: 1px solid var(--ds-border, #DFE1E6); margin: 16px 0; }
    .cv-desc-body img, .adf-description-content img { max-width: 100%; border-radius: 4px; cursor: pointer; }

    /* Bidi — Jira parity. Applying \`unicode-bidi: plaintext\` to every text
       block (paragraph, heading, list item, blockquote, table cell) lets
       the browser detect the first strong-directional character and flow
       RTL scripts (Arabic / Hebrew / Persian) right-to-left — without
       forcing a global \`direction: rtl\` that would mis-align our Latin
       UI. Fixes ICP-411 where Arabic description lines rendered LTR with
       the leading Arabic numerals drifting to the wrong edge.
       The same rule is applied to the Atlaskit renderer wrapper class
       (\`.atlaskit-renderer-wrapper\`) used by EpicDescriptionRenderer so
       read-mode behaves identically. */
    .cv-desc-body p, .cv-desc-body h1, .cv-desc-body h2, .cv-desc-body h3,
    .cv-desc-body h4, .cv-desc-body h5, .cv-desc-body h6,
    .cv-desc-body li, .cv-desc-body blockquote, .cv-desc-body td, .cv-desc-body th,
    .adf-description-content p, .adf-description-content h1, .adf-description-content h2,
    .adf-description-content h3, .adf-description-content h4, .adf-description-content h5,
    .adf-description-content h6, .adf-description-content li, .adf-description-content blockquote,
    .adf-description-content td, .adf-description-content th,
    .atlaskit-renderer-wrapper p, .atlaskit-renderer-wrapper h1, .atlaskit-renderer-wrapper h2,
    .atlaskit-renderer-wrapper h3, .atlaskit-renderer-wrapper h4, .atlaskit-renderer-wrapper h5,
    .atlaskit-renderer-wrapper h6, .atlaskit-renderer-wrapper li, .atlaskit-renderer-wrapper blockquote,
    .atlaskit-renderer-wrapper td, .atlaskit-renderer-wrapper th,
    .atlaskit-renderer-fallback,
    .catalyst-rte-content p, .catalyst-rte-content h1, .catalyst-rte-content h2,
    .catalyst-rte-content h3, .catalyst-rte-content h4, .catalyst-rte-content h5,
    .catalyst-rte-content h6, .catalyst-rte-content li, .catalyst-rte-content blockquote,
    .catalyst-rte-content td, .catalyst-rte-content th
    { unicode-bidi: plaintext; }
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

  /* jira-compare 2026-05-03 (Council P3.2): per-issue console.info removed.
     Build ID still tracked in DESC_BUILD_ID constant; visible by grepping
     the bundle if needed. console.info per render polluted the DevTools
     view during every probe and added zero diagnostic value at runtime. */

  // Empty-check goes through the canonical ADF-aware helper. Previously
  // `!adfToHtml(adf).trim()` — the (ab)use of a rendering function for an
  // emptiness predicate is retired in the B1 @atlaskit/renderer rollout.
  const descSource = issue?.description_adf ?? issue?.description_text ?? null;
  const isEmpty = isAdfEmpty(descSource);
  // Plain-text projection — used by Suspense placeholder and chunk-failure
  // fallback so the page renders prose instantly while the renderer chunk
  // arrives (or if it fails).
  const plainText = adfToPlainText(descSource);

  // Mutation to save description
  const saveDescriptionMutation = useMutation({
    mutationFn: async (adfJson: string) => {
      const parsed = adfJson ? JSON.parse(adfJson) : null;
      await supabase
        .from('ph_issues')
        .update({ description_adf: parsed })
        .eq('issue_key', issue!.issue_key);
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
          {/* jira-compare 2026-05-03 (Council P3.2): the chevron is a pure
              affordance — wrap the Atlaskit glyph with rotation transform
              so the same icon serves both collapsed (▶) and expanded (▼)
              states. CSS rotate is faster than swapping icons. */}
          <span
            style={{
              display: 'inline-flex',
              transition: 'transform 0.15s ease',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              color: 'var(--ds-text-subtle, #5E6C84)',
            }}
          >
            <ChevronRightIcon label="" size="small" primaryColor="currentColor" />
          </span>
          {/* jira-compare 2026-05-03 (Council P3.2): inline H2 sized to
              Jira's measured "Description" label. Atlaskit's <Heading
              size="small"> renders 16/653 (variable axis), but Jira's
              section label is the smaller subtle 14/500 — see
              testid issue.views.issue-base.common.description.label.
              Wrapping in span isn't needed; render the H2 directly. */}
          <h2
            data-testid="catalyst-description-section.label"
            style={{
              margin: 0, padding: 0,
              fontSize: 14, fontWeight: 500, lineHeight: '19px',
              color: 'var(--ds-text-subtle, #505258)',
              /* Explicit family — parent context inherits Inter from
                 Catalyst's Tailwind body, but Jira's section labels use
                 Atlassian Sans. Don't rely on inheritance. */
              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
            }}
          >
            {label}
          </h2>
        </div>
        {/* Edit pencil — visible on hover, hidden when editing or collapsed */}
        {!collapsed && !editing && issue && (
          <button
            onClick={() => setEditing(true)}
            title="Edit description"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 4, color: 'var(--ds-text-subtlest, #6B778C)',
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
              e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)';
              prefetchEpicEditor();
            }}
            onFocus={() => { prefetchEpicEditor(); }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ds-text-subtlest, #6B778C)'; e.currentTarget.style.background = 'none'; }}
          >
            <EditIcon label="Edit description" />
          </button>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        editing && issue ? (
          /* ── Edit mode — canonical Atlaskit editor.
             No fallback editor (USER DIRECTIVE 2026-04-20). If the
             @atlaskit/editor-core chunk fails to load we do NOT render
             a TipTap replacement — only Atlaskit's ADF shape is
             accepted by this app. Suspense fallback shows "Loading…"
             until the chunk resolves. */
          <div style={{ paddingLeft: 20 }}>
            <Suspense fallback={<AtlaskitFallback minHeight={240} />}>
              <EpicDescriptionEditor
                initialContent={issue.description_adf ?? issue.description_text ?? null}
                onSave={handleSave}
                onCancel={handleCancel}
                workItemId={issue.id}
                placeholder="Add a description..."
              />
            </Suspense>
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
            onMouseEnter={e => { if (issue) e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Add a description...
          </div>
        ) : (
          /* ── Read-only ADF render — canonical Atlaskit renderer only.
             No error-boundary fallback (USER DIRECTIVE 2026-04-20). The
             Suspense fallback below is only for chunk-loading, not for
             error recovery — if the Atlaskit renderer throws at runtime
             the error propagates and is surfaced as a console error,
             rather than silently downgrading to a plaintext projection
             that obscures real renderer bugs. */
          <div
            role="button"
            tabIndex={0}
            style={{
              paddingLeft: 20, minHeight: 40, cursor: 'text', borderRadius: 4,
              position: 'relative',
              transition: 'background 0.15s',
            }}
            /* jira-compare 2026-05-02: prefetch the editor chunk as soon
               as the user hovers the description body — no spinner flash
               on click. mousedown so click handlers fire AFTER prefetch. */
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; prefetchEpicEditor(); }}
            onClick={() => { if (issue) setEditing(true); }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && issue) {
                e.preventDefault();
                setEditing(true);
              }
            }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            title="Click to edit"
          >
            <Suspense fallback={<AtlaskitRendererPlaceholder plain={plainText} />}>
              <EpicDescriptionRenderer content={descSource} issueKey={issue?.issue_key} />
            </Suspense>
          </div>
        )
      )}
    </div>
  );
}
