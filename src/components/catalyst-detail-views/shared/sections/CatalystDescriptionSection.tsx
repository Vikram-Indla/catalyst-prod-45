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
import React, {
  Suspense,
  useState,
  useCallback,
  startTransition,
  lazy,
  useMemo,
  useEffect,
} from "react";
import { DescriptionTranslateBar } from "@/components/shared/title-translate/DescriptionTranslateBar";
import { useAuth } from "@/hooks/useAuth";
import type { AttachmentUploadMeta } from "@/components/shared/rich-text/atlaskit/AdfDescriptionField";
/* jira-compare 2026-05-03 (Council P3.2): lucide ChevronRight + Pencil
   removed — CLAUDE.md "ADS-only inside hub scope" violation. Swapped to
   Atlaskit equivalents. Heading wrapper also dropped in favour of an
   inline H2 styled to Jira's measured "Description" label values
   (testid issue.views.issue-base.common.description.label probed
   2026-05-03: H2 / 14px / weight 500 / rgb(80,82,88) / lh ~19). */
// eslint-disable-next-line no-restricted-imports
import EditIcon from "@atlaskit/icon/core/edit";
// eslint-disable-next-line no-restricted-imports
import Spinner from "@atlaskit/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  adfToPlainText,
  isAdfEmpty,
} from "@/components/shared/rich-text/atlaskit/adfHelpers";
import { prefetchEpicEditor } from "@/lib/atlaskitPrefetch";
import {
  AdfLightRenderer,
  hasComplexAdfNodes,
} from "@/components/shared/rich-text/atlaskit/adfLightRenderer";
/* Lazy import — editor-core is ~2MB. Keep it out of the initial bundle.
   prefetchEpicEditor() on hover pre-downloads the chunk so by the time
   the user clicks, the browser has it cached and mount is near-instant.
   startTransition around setEditing(true) lets React time-slice the
   ProseMirror init without blocking the main thread. */
const AdfDescriptionField = lazy(
  () => import("@/components/shared/rich-text/atlaskit/AdfDescriptionField"),
);
import EpicDescriptionRenderer from "@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer";
import { useCatyImprove } from "@/components/catalyst-detail-views/improve/catyImproveStore";
import { CatyStreamingOverlay } from "@/components/catalyst-detail-views/improve/CatyStreamingOverlay";
import { openImagePreview } from "@/lib/openImagePreview";
import type { PhIssue } from "../types";

/**
 * Minimal markdown → ADF converter for Caty's "Improve description"
 * stream output. Handles the four block types Caty actually emits:
 * `## Heading`, `- bullet`, `1. ordered`, plain paragraphs. Inline
 * marks (bold/italic/code) are NOT handled — the user can edit the
 * doc afterward to apply emphasis. Good enough for v1; a richer
 * pipeline (e.g. via remark/rehype + ADF) is a later upgrade.
 */
function catyMarkdownToAdf(md: string): {
  type: "doc";
  version: number;
  content: unknown[];
} {
  if (!md.trim()) {
    return { type: "doc", version: 1, content: [{ type: "paragraph" }] };
  }
  const lines = md.split("\n");
  const blocks: unknown[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      blocks.push({
        type: "heading",
        attrs: { level: hMatch[1].length },
        content: [{ type: "text", text: hMatch[2] }],
      });
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: unknown[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? "")) {
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: (lines[i] ?? "").replace(/^[-*]\s+/, ""),
                },
              ],
            },
          ],
        });
        i++;
      }
      blocks.push({ type: "bulletList", content: items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: unknown[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? "")) {
        items.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: (lines[i] ?? "").replace(/^\d+\.\s+/, ""),
                },
              ],
            },
          ],
        });
        i++;
      }
      blocks.push({ type: "orderedList", content: items });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^(#{1,6}\s|[-*]\s|\d+\.\s)/.test(lines[i] ?? "")
    ) {
      paraLines.push(lines[i] ?? "");
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        content: [{ type: "text", text: paraLines.join(" ") }],
      });
    }
  }
  return {
    type: "doc",
    version: 1,
    content: blocks.length > 0 ? blocks : [{ type: "paragraph" }],
  };
}

/* Atlaskit description — canonical across ALL issue types.
   2026-05-03 (Council verdict): Converted lazy imports to static imports
   to eliminate "Loading editor..." UX delay. The editor chunk (~2MB) now
   loads eagerly on page init (bundled into the main app chunk) rather than
   on Edit click. Trade-off: larger initial bundle, but instant edit experience
   matching Jira's behavior.

   The renderer chunk (~400–600KB) remains optimized.

   These imports target the component files directly, NOT the
   `@/components/shared/rich-text/atlaskit` barrel. Direct file imports
   keep the two graphs separate and let the renderer load alone on view.

   Data-contract shim: `parseStoredDescriptionToAdf` (inside the Atlaskit
   Editor/Renderer components) accepts ADF object, ADF JSON string, plain
   text, or null. Issue types that historically stored only plain text in
   `description_text` are transparently wrapped as a single ADF paragraph
   on first load. On save, the editor writes normalized ADF JSON back to
   `ph_issues.description_adf`, completing the lazy migration.

   File names still reference "Epic" for historical reasons; the files
   themselves are generic ADF editor/renderer pair. File renames are a
   separate follow-up task. */

function AtlaskitFallback({ minHeight = 80 }: { minHeight?: number }) {
  /* jira-compare follow-up (2026-05-02): replaced literal "Loading editor…"
     text with @atlaskit/spinner — matches Jira NIN's editor-chunk
     hydration pattern (subtle spinner, no visible English string). */
  return (
    <div
      style={{
        minHeight,
        paddingLeft: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
      }}
    >
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
function AtlaskitRendererPlaceholder({ plain }: { plain: string }) {
  return (
    <div
      className="cv-desc-body"
      // Jira-measured: body 14/400, line-height 1.5, #292A2E, Atlassian Sans
      style={{
        fontSize: 14,
        fontWeight: 400,
        color: "var(--ds-text, #292A2E)",
        lineHeight: "24px",
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
        whiteSpace: "pre-wrap",
      }}
    >
      {plain}
    </div>
  );
}

/* Build-ID marker so we can distinguish which deployed commit is running
   by looking at the console without checking chunk hashes. Update when
   the description surface changes materially. */
const DESC_BUILD_ID = "atlaskit-canonical-v218";

/* ── Scoped styles for ADF content inside CatalystView ── */
/* Bump this version when the style block changes — forces re-injection on HMR. */
const STYLE_ID = "cv-desc-styles-v36";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
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
    .cv-desc-body h1, .adf-description-content h1 { font-size: 24px; font-weight: 700; margin: 20px 0 8px; color: var(--ds-text, #292A2E); line-height: 1.3; }
    .cv-desc-body h2, .adf-description-content h2 { font-size: 20px; font-weight: 600; margin: 16px 0 8px; color: var(--ds-text, #292A2E); line-height: 1.3; }
    .cv-desc-body h3, .adf-description-content h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: var(--ds-text, #292A2E); line-height: 1.4; }
    .cv-desc-body h4, .adf-description-content h4 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; color: var(--ds-text, #292A2E); }
    .cv-desc-body h5, .adf-description-content h5 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; color: var(--ds-text, #292A2E); }
    .cv-desc-body h6, .adf-description-content h6 { font-size: 12px; font-weight: 600; margin: 8px 0 4px; color: var(--ds-text-subtle, #5E6C84); text-transform: uppercase; }
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
    .cv-desc-body th, .adf-description-content th { background: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)); font-weight: 600; text-align: left; }
    .cv-desc-body th, .cv-desc-body td,
    .adf-description-content th, .adf-description-content td { border: 1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))); padding: 8px 12px; font-size: 14px; vertical-align: top; }
    .cv-desc-body blockquote, .adf-description-content blockquote { border-left: 2px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))); padding: 8px 12px; margin: 8px 0; color: var(--ds-text-subtle, #5E6C84); }
    .cv-desc-body pre, .adf-description-content pre { background: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)); padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin: 4px 0 8px; font-family: var(--cp-font-mono); }
    .cv-desc-body code, .adf-description-content code { background: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)); padding: 2px 4px; border-radius: 3px; font-size: 12px; font-family: var(--cp-font-mono); }
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
      /* jira-compare 2026-05-05: Jira body line-height measured at 23.996px
         (≈24px). Previous override of 20px was under-measured. */
      line-height: 24px !important;
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
    /* 2026-05-16: Atlaskit renderer injects padding-left ~32px on its inner
       document div (.ak-renderer-document). This pushes body text 32px right
       of the "Description" h2 header (probed: header x=24, body x=56, delta=32).
       Zero it out so description body aligns with the section heading. */
    .atlaskit-renderer-wrapper [class*="ak-renderer-document"],
    .atlaskit-renderer-wrapper > div:first-child {
      padding-left: 0 !important;
      margin-left: 0 !important;
    }
    .cv-desc-body a, .adf-description-content a { color: var(--ds-link, var(--cp-primary-60, #0052CC)); text-decoration: none; }
    .cv-desc-body a:hover, .adf-description-content a:hover { text-decoration: underline; }
    .cv-desc-body hr, .adf-description-content hr { border: none; border-top: 1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))); margin: 16px 0; }
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

    /* jira-compare 2026-05-05 — Dark-theme leak fix (v2):
       The ~4px black bar before "None" in sidebar selects (Sprint/Iteration,
       Labels, Assignee, etc.) is caused by the Emotion CSS-in-JS class
       (e.g. css-bxfvr9) on the react-select __input-container div setting
       a near-black background. The container itself is the source, not the
       <input> child (which already has inline style transparent).

       Fix: target ALL cv-* __input-container divs directly (not just
       descendant inputs) plus their children. Using both class-contains
       approach and direct classname selectors for maximum specificity. */
    .cv-assignee-select__input-container,
    .cv-reporter-select__input-container,
    .cv-priority-select__input-container,
    .cv-labels-select__input-container,
    .cv-sprintrelease-select__input-container,
    [class*="cv-"][class*="-select__input-container"] {
      background-color: transparent !important;
      background: transparent !important;
    }
    [class*="cv-"][class*="-select__control"]:hover { background: transparent !important; }
    .cv-sprintrelease-select__menu,
    .cv-sprintrelease-select__menu *,
    .cv-sprintrelease-select__option,
    .cv-sprintrelease-select__option * { font-size: 14px !important; line-height: 20px !important; }
    .cv-sprintrelease-select__group-heading { font-size: 11px !important; }
    /* cv-rail-value idle border + hover + focus-within now owned by CatalystSidebarDetails (RAIL_BORDER_STYLE_ID). */
    /* v2 extra rule: the dark-mode global stylesheet has
       .dark [class*="Drawer"] input { background-color: rgb(10,10,10) !important; }
       with specificity 0,2,1 — beating our 0,1,1 plain rule. Add .dark prefix
       to match specificity, and since this style block is appended last in the
       head it wins source-order tiebreak for equal !important specificity. */
    .dark .cv-assignee-select__input-container input,
    .dark .cv-reporter-select__input-container input,
    .dark .cv-priority-select__input-container input,
    .dark .cv-labels-select__input-container input,
    .dark .cv-sprintrelease-select__input-container input,
    .dark [class*="cv-"][class*="-select__input-container"] input,
    .cv-assignee-select__input-container input,
    .cv-reporter-select__input-container input,
    .cv-priority-select__input-container input,
    .cv-labels-select__input-container input,
    .cv-sprintrelease-select__input-container input,
    [class*="cv-"][class*="-select__input-container"] input {
      background-color: transparent !important;
      background: transparent !important;
    }
    /* jira-compare 2026-05-10: Atlaskit comment-mode editor renders
       Save/Cancel with fw=400 by default; Jira measures fw=500.
       Target by Atlaskit's stable data-testid attributes. */
    [data-testid="editor-comment-save-button"],
    [data-testid="editor-comment-cancel-button"],
    [data-testid="comment-save-button"],
    [data-testid="comment-cancel-button"] {
      font-weight: 500 !important;
      cursor: pointer !important;
    }
    [data-testid="editor-comment-save-button"]:disabled,
    [data-testid="comment-save-button"]:disabled {
      cursor: not-allowed !important;
    }

    /* Toolbar-level CSS (compact T/H₁-H₆ trigger + separator removal)
       moved to EpicDescriptionEditor.tsx (TOOLBAR_STYLE_ID
       "cv-editor-toolbar-styles-v01") so it injects for every editor
       instance, including comments, create-modal, and business-request
       descriptions — not just surfaces that mount this section. */

    .assistive {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    [data-media-vc-wrapper] {
      position: relative !important;
      outline: none !important;
      border: none !important;
      background: transparent !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    [data-media-vc-wrapper] > *:not(img[data-catalyst-injected="true"]) {
      position: absolute !important;
      inset: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -1 !important;
    }
    [data-media-vc-wrapper] [data-testid="external-image-badge"],
    [data-media-vc-wrapper] [data-testid*="loading"],
    [data-media-vc-wrapper] [class*="CardLoading"] {
      display: none !important;
    }
    [data-media-vc-wrapper] img:not([data-catalyst-injected="true"]) {
      display: none !important;
    }

    [data-media-vc-wrapper][layout="center"] img[data-catalyst-injected="true"] {
      margin-left: auto !important;
      margin-right: auto !important;
    }
    [data-media-vc-wrapper][layout="align-start"] img[data-catalyst-injected="true"],
    [data-media-vc-wrapper][layout="wrap-left"] img[data-catalyst-injected="true"] {
      margin-left: 0 !important;
      margin-right: auto !important;
    }
    [data-media-vc-wrapper][layout="align-end"] img[data-catalyst-injected="true"],
    [data-media-vc-wrapper][layout="wrap-right"] img[data-catalyst-injected="true"] {
      margin-left: auto !important;
      margin-right: 0 !important;
    }
    [data-media-vc-wrapper][layout="wide"] img[data-catalyst-injected="true"],
    [data-media-vc-wrapper][layout="full-width"] img[data-catalyst-injected="true"] {
      width: 100% !important;
      max-width: 100% !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .atlaskit-renderer-wrapper,
    .adf-light-renderer {
      padding: 4px 16px !important;
      box-sizing: border-box !important;
    }

    /* 2026-05-24 — Atlaskit's native floating image toolbar (popper +
       portal-to-body) is completely hidden. We render our own custom
       toolbar inline inside the editor DOM, anchored as a sibling of
       the image's mediaSingle block (see imageToolbar/). The custom
       toolbar scrolls with the image, never gets clipped, and supports
       the full Jira action set (border / align / wrap / link / alt /
       resize / copy / delete) — none of which we could reliably wire
       through Atlaskit's floating-toolbar plugin API. */
    [data-testid="editor-floating-toolbar"] {
      display: none !important;
    }
    [data-testid="editor-floating-toolbar"] button {
      position: relative !important;
    }
    [data-testid="editor-floating-toolbar"] button[aria-label]:hover::after {
      content: attr(aria-label);
      position: absolute;
      top: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: rgb(23, 43, 77);
      color: #fff;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
      white-space: nowrap;
      z-index: 99999;
      pointer-events: none;
      box-shadow: 0 4px 8px -2px rgba(9,30,66,0.25);
    }

    /* Perf — pencil-icon hover affordance via pure CSS instead of a
       React useState(hovered) flip. Avoids a parent re-render on every
       mouse-enter / mouse-leave of the section header, which was
       reconciling through the entire editor subtree (cheap per render
       but multiplied by every mouse twitch). */
    .cv-desc-header .cv-desc-edit-btn {
      opacity: 0;
      transition:
        opacity 150ms cubic-bezier(0.15, 1, 0.3, 1),
        color 150ms cubic-bezier(0.15, 1, 0.3, 1),
        background 150ms cubic-bezier(0.15, 1, 0.3, 1);
    }
    .cv-desc-header:hover .cv-desc-edit-btn,
    .cv-desc-header:focus-within .cv-desc-edit-btn {
      opacity: 1;
    }
    .cv-desc-edit-btn:hover {
      color: #292A2E !important;
      background: var(--ds-surface-sunken, #F4F5F7) !important;
    }

    /* @-mention chip styling now lives EXCLUSIVELY in
       shared/rich-text/mentions/mentionStyles.ts (the canonical
       contract: 9999px pill, gray for other / brand-bold blue for
       current user, painted via data-mention-self attribute). The
       local block here used border-radius 3px + blue background and
       was loaded later in cascade order, so it silently flattened the
       canonical pill into a near-square chip everywhere a detail view
       had been mounted. Deleted on 2026-06-11. */

    .fabric-editor-typeahead,
    [class*="fabric-editor-typeahead"],
    [data-editor-popup-render-target],
    [data-editor-popup-render-target] > *,
    [data-editor-popup] {
      z-index: 2147483600 !important;
    }
  `;
  document.head.appendChild(s);
}

interface CatalystDescriptionSectionProps {
  issue: PhIssue | null;
  /** Override the section heading (default: "Description") */
  label?: string;
}

export function CatalystDescriptionSection({
  issue,
  label = "Description",
}: CatalystDescriptionSectionProps) {
  const [editing, setEditing] = useState(false);
  // Translation state — ephemeral, not persisted to DB.
  // translatedDesc holds plain-text result from CATY; when set the read-view
  // swaps ADF renderer for a plain-text display with a "Show original" revert.
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const isShowingTranslation = translatedDesc !== null;
  // Hover affordance moved to pure CSS (`.cv-desc-header:hover .cv-desc-edit-btn`).
  // Keeping a `useState(hovered)` here forced the whole section to
  // reconcile on every mouse twitch over the header band.
  const queryClient = useQueryClient();

  // Caty-improve store — when the dropdown fires, the payload becomes
  // truthy. We only render the overlay if the payload's issueKey
  // matches THIS section's issue (multiple detail views could be open
  // in tabs; each owns its own description).
  const catyPayload = useCatyImprove((s) => s.payload);
  const stopCatyImprove = useCatyImprove((s) => s.stop);
  const startCatyImprove = useCatyImprove((s) => s.start);
  const catyActiveForThisIssue =
    catyPayload != null &&
    issue?.issue_key != null &&
    catyPayload.issueKey === issue.issue_key;

  useEffect(() => {
    if (catyActiveForThisIssue) setEditing(true);
  }, [catyActiveForThisIssue]);

  const handleImproveFromToolbar = useCallback(async () => {
    if (!issue?.issue_key) return;
    let attachmentUrls: string[] = [];
    if (issue.id) {
      try {
        const { data } = await supabase
          .from("ph_attachments")
          .select("storage_path, mime_type")
          .eq("work_item_id", issue.id);
        const rows: Array<{ storage_path: string; mime_type: string | null }> =
          Array.isArray(data) ? data : [];
        attachmentUrls = rows
          .filter(
            (r) =>
              typeof r.mime_type === "string" &&
              r.mime_type.startsWith("image/"),
          )
          .map((r) => {
            const { data: pub } = supabase.storage
              .from("description-images")
              .getPublicUrl(r.storage_path);
            return pub?.publicUrl ?? "";
          })
          .filter((u) => u.length > 0);
      } catch {
        attachmentUrls = [];
      }
    }
    startCatyImprove({
      issueKey: issue.issue_key,
      issueType: issue.issue_type ?? null,
      issueSummary: issue.summary ?? null,
      currentDescription: issue.description_text ?? null,
      currentAcceptanceCriteria: issue.acceptance_criteria ?? null,
      attachmentUrls,
      improveSubType: "improve_clarify",
    });
  }, [issue, startCatyImprove]);

  // Idle-time prefetch: kick off editor chunk download after paint so that
  // by the time the user clicks to edit, the ~2MB chunk is already cached.
  useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => prefetchEpicEditor());
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(prefetchEpicEditor, 2000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const previewBtn = target.closest?.(
        '[data-testid="file-preview-toolbar-button"]',
      );
      if (!previewBtn) return;

      const selectedWrapper =
        document.querySelector<HTMLElement>(
          '[data-media-vc-wrapper="true"].ProseMirror-selectednode',
        ) ||
        document.querySelector<HTMLElement>(
          '.ProseMirror-selectednode [data-media-vc-wrapper="true"]',
        ) ||
        document.querySelector<HTMLElement>('[data-media-vc-wrapper="true"]');
      const imgEl = selectedWrapper?.querySelector<HTMLImageElement>("img");
      const src = imgEl?.src;
      if (!src) return;

      e.preventDefault();
      e.stopPropagation();
      openImagePreview(src);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

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
  // Tiered renderer: if the ADF has only prose nodes (no media, tables,
  // panels, expand, etc.) render it with the zero-chunk AdfLightRenderer.
  // Only complex docs pay the ~500KB @atlaskit/renderer download cost.
  const isComplex = useMemo(() => hasComplexAdfNodes(descSource), [descSource]);

  // Mutation to save description
  const saveDescriptionMutation = useMutation({
    mutationFn: async (adfJson: string) => {
      const parsed = adfJson ? JSON.parse(adfJson) : null;
      await supabase
        .from("ph_issues")
        .update({ description_adf: parsed })
        .eq("issue_key", issue!.issue_key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cv-issue-detail", issue?.issue_key],
      });
      setEditing(false);
    },
  });

  const handleSave = useCallback(
    (adfJson: string) => {
      if (!issue) return;
      saveDescriptionMutation.mutate(adfJson);
    },
    [issue, saveDescriptionMutation],
  );

  /**
   * Caty accept handler — converts the streamed markdown to ADF for
   * the description column and writes acceptance criteria as plain
   * text. Both writes go in one transaction-like call so the UI
   * doesn't flicker mid-save.
   */
  const handleCatyApply = useCallback(
    async (
      _fullMarkdown: string,
      parts: { description: string; acceptanceCriteria: string },
    ) => {
      if (!issue?.issue_key) return;
      const adfDoc = catyMarkdownToAdf(parts.description);
      const update: Record<string, unknown> = { description_adf: adfDoc };
      if (parts.acceptanceCriteria) {
        update.acceptance_criteria = parts.acceptanceCriteria;
      }
      const { error } = await supabase
        .from("ph_issues")
        .update(update as never)
        .eq("issue_key", issue.issue_key);
      if (error) {
        console.error("[CatalystDescriptionSection] Caty apply failed", error);
        return;
      }
      stopCatyImprove();
      setEditing(false);
      queryClient.invalidateQueries({
        queryKey: ["cv-issue-detail", issue.issue_key],
      });
    },
    [issue?.issue_key, queryClient, stopCatyImprove],
  );

  const handleCatyCancel = useCallback(() => {
    stopCatyImprove();
    setEditing(false);
  }, [stopCatyImprove]);

  const { user } = useAuth();

  /**
   * Body↔rail binding. When the editor uploads an inline image, register
   * a row in `ph_attachments` so the file appears in the Attachments rail
   * (CatalystAttachmentsPanel reads from this table). Both surfaces now
   * pull from the same source of truth — the same Jira pattern of
   * inline-image-and-rail-share-one-list.
   *
   * Failure here does NOT roll back the body insert. The image is still
   * in the bucket and visible inline; it just won't appear in the rail
   * until the next upload triggers a re-fetch. We surface a sonner toast
   * so the user knows. This is the same dual-action pattern the canonical
   * AttachmentsSection uses for storage+DB writes.
   */
  const handleInlineAttachmentUploaded = useCallback(
    async (meta: AttachmentUploadMeta) => {
      if (!issue?.id || !user?.id) return;
      const { error } = await supabase.from("ph_attachments").insert({
        work_item_id: issue.id,
        file_name: meta.fileName,
        file_size: meta.fileSize,
        mime_type: meta.mimeType,
        storage_path: meta.storagePath,
        uploaded_by: user.id,
      });
      if (error) {
        console.error(
          "[CatalystDescriptionSection] ph_attachments insert failed",
          error,
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["ph-attachments", issue.id] });
    },
    [issue?.id, user?.id, queryClient],
  );

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header — always visible, no collapse (jira-compare 2026-05-10:
          Jira never collapses the description section; chevron removed for parity).
          Pencil edit button appears on hover. */}
      <div
        className="cv-desc-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 8,
          userSelect: "none",
        }}
      >
        <h2
          data-testid="catalyst-description-section.label"
          style={{
            margin: 0,
            padding: "0 16px",
            flex: 1,
            /* jira-compare 2026-05-12 re-probe: Description h2 is 14px/500/rgb(80,82,88).
               TreeWalker text-node probe confirmed h2 is the direct parent of the "Description"
               text node at 14px/500. Differs from Key details/Subtasks/LWI/Activity (all 16px/653). */
            fontSize: 14,
            fontWeight: 500,
            lineHeight: "20px",
            color: "var(--ds-text-subtle, #505258)",
            fontFamily:
              '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
          }}
        >
          {label}
        </h2>
        {!editing && issue && (
          <button
            className="cv-desc-edit-btn"
            onClick={() => startTransition(() => setEditing(true))}
            title="Edit description"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: 4,
              color:
                "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))",
              display: "flex",
              alignItems: "center",
              transition:
                "opacity 150ms cubic-bezier(0.15,1,0.3,1), color 150ms cubic-bezier(0.15,1,0.3,1), background 150ms cubic-bezier(0.15,1,0.3,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ds-text, #292A2E)";
              e.currentTarget.style.background =
                "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
              prefetchEpicEditor();
            }}
            onFocus={() => {
              prefetchEpicEditor();
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color =
                "var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))";
              e.currentTarget.style.background = "none";
            }}
          >
            <EditIcon label="Edit description" />
          </button>
        )}
      </div>

      {(editing || catyActiveForThisIssue) && issue ? (
        <div>
          <Suspense fallback={<AtlaskitFallback minHeight={240} />}>
            <AdfDescriptionField
              initialContent={
                issue.description_adf ?? issue.description_text ?? null
              }
              onSave={handleSave}
              onCancel={catyActiveForThisIssue ? handleCatyCancel : handleCancel}
              workItemId={issue.id}
              placeholder="Add a description..."
              onAttachmentUploaded={handleInlineAttachmentUploaded}
              appearance="comment"
              onImprove={handleImproveFromToolbar}
              issue={issue}
              bodyOverlay={
                catyActiveForThisIssue && catyPayload ? (
                  <CatyStreamingOverlay
                    key={catyPayload.issueKey}
                    issueKey={catyPayload.issueKey}
                    issueType={catyPayload.issueType}
                    issueSummary={catyPayload.issueSummary}
                    currentDescription={catyPayload.currentDescription}
                    currentAcceptanceCriteria={catyPayload.currentAcceptanceCriteria}
                    attachmentUrls={catyPayload.attachmentUrls}
                    improveSubType={catyPayload.improveSubType}
                    onApply={handleCatyApply}
                    onCancel={handleCatyCancel}
                  />
                ) : undefined
              }
            />
          </Suspense>
        </div>
      ) : isEmpty ? (
        <div
          onClick={() => {
            if (issue) startTransition(() => setEditing(true));
          }}
          style={{
            fontSize: 14,
            color: "var(--ds-text-subtlest, #97A0AF)",
            fontStyle: "normal",
            minHeight: 40,
            cursor: issue ? "pointer" : "default",
            borderRadius: 4,
            padding: "8px 0",
            transition: "background 150ms cubic-bezier(0.15,1,0.3,1)",
          }}
          onMouseEnter={(e) => {
            if (issue) {
              e.currentTarget.style.background =
                "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
              prefetchEpicEditor();
            }
          }}
          onPointerDown={() => {
            if (issue) prefetchEpicEditor();
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Add a description...
        </div>
      ) : (
        <div>
          {/* Clickable read-view — click enters edit mode */}
          <div
            role="button"
            tabIndex={0}
            style={{
              minHeight: 40,
              cursor: "text",
              borderRadius: 4,
              position: "relative",
              transition: "background 150ms cubic-bezier(0.15,1,0.3,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))";
              prefetchEpicEditor();
            }}
            onPointerDown={() => {
              if (issue) prefetchEpicEditor();
            }}
            onClick={() => {
              if (issue) startTransition(() => setEditing(true));
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && issue) {
                e.preventDefault();
                startTransition(() => setEditing(true));
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title="Click to edit"
          >
            {isShowingTranslation ? (
              /* Translated view — plain text with bidi auto-detection */
              <div
                className="cv-desc-body"
                dir="auto"
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "var(--ds-text, #292A2E)",
                  lineHeight: "24px",
                  fontFamily:
                    '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
                  whiteSpace: "pre-wrap",
                  padding: "4px 16px",
                }}
              >
                {translatedDesc}
              </div>
            ) : isComplex ? (
              <Suspense
                fallback={<AtlaskitRendererPlaceholder plain={plainText} />}
              >
                <EpicDescriptionRenderer
                  content={descSource}
                  issueKey={issue?.issue_key}
                />
              </Suspense>
            ) : (
              <AdfLightRenderer adf={descSource} />
            )}
          </div>

          {/* Translate bar — only in read mode, only when not editing */}
          {issue && !editing && (
            <DescriptionTranslateBar
              plainText={plainText}
              issueKey={issue.issue_key}
              isTranslated={isShowingTranslation}
              onTranslated={(text) => setTranslatedDesc(text)}
              onRevert={() => setTranslatedDesc(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
