/**
 * ADF Utilities — Atlassian Document Format ↔ TipTap/ProseMirror JSON conversion
 *
 * ADF is a structured JSON format used by Atlassian products (Jira, Confluence).
 * TipTap is ProseMirror-based and uses a nearly identical JSON schema.
 * This module maps between the two and handles legacy HTML content.
 */

// ─── Mark type mappings ──────────────────────────────────────
const TIPTAP_TO_ADF_MARKS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  strike: 'strike',
  code: 'code',
  underline: 'underline',
  link: 'link',
};

const ADF_TO_TIPTAP_MARKS: Record<string, string> = Object.fromEntries(
  Object.entries(TIPTAP_TO_ADF_MARKS).map(([k, v]) => [v, k])
);

// ─── Node type mappings ─────────────────────────────────────
const TIPTAP_TO_ADF_NODES: Record<string, string> = {
  doc: 'doc',
  paragraph: 'paragraph',
  heading: 'heading',
  bulletList: 'bulletList',
  orderedList: 'orderedList',
  listItem: 'listItem',
  codeBlock: 'codeBlock',
  blockquote: 'blockquote',
  hardBreak: 'hardBreak',
  horizontalRule: 'rule',
  text: 'text',
};

const ADF_TO_TIPTAP_NODES: Record<string, string> = Object.fromEntries(
  Object.entries(TIPTAP_TO_ADF_NODES).map(([k, v]) => [v, k])
);

// ─── TipTap JSON → ADF ─────────────────────────────────────
function tiptapNodeToAdf(node: any): any {
  // Special handling: TipTap `image` → ADF `mediaSingle > media`
  if (node.type === 'image') {
    const src = node.attrs?.src || '';
    const alt = node.attrs?.alt || '';
    return {
      type: 'mediaSingle',
      attrs: { layout: 'center' },
      content: [{
        type: 'media',
        attrs: {
          type: 'file',
          url: src,
          alt: alt,
          filename: alt || 'image',
        },
      }],
    };
  }

  const adfType = TIPTAP_TO_ADF_NODES[node.type] || node.type;
  const result: any = { type: adfType };

  if (node.attrs && Object.keys(node.attrs).length > 0) {
    result.attrs = { ...node.attrs };
  }

  if (node.text !== undefined) {
    result.text = node.text;
  }

  if (node.marks && node.marks.length > 0) {
    result.marks = node.marks.map((mark: any) => {
      const mapped: any = { type: TIPTAP_TO_ADF_MARKS[mark.type] || mark.type };
      if (mark.attrs && Object.keys(mark.attrs).length > 0) {
        mapped.attrs = { ...mark.attrs };
      }
      return mapped;
    });
  }

  if (node.content && node.content.length > 0) {
    result.content = node.content.map(tiptapNodeToAdf);
  }

  return result;
}

export function tiptapJsonToAdf(json: any): any {
  return {
    version: 1,
    ...tiptapNodeToAdf(json),
  };
}

// ─── ADF → TipTap JSON ─────────────────────────────────────
/* Build a readable placeholder node for a media attachment that has no
   resolvable URL in the current document (e.g. Jira-imported ADF that
   only carries `id` + `collection` — the actual URL lives behind an
   Atlassian media proxy our edit-path TipTap editor can't reach).
   Previously we emitted `{ type: 'image', attrs: { src: '' } }` which
   rendered as the browser's broken-image icon + bare alt text, making
   descriptions look corrupt in edit mode (see ICP-411). We now emit
   a paragraph with the filename wrapped in 📎 brackets so users can at
   least tell what's referenced without visual breakage. The view-path
   renderer resolves these via `ph_issue_attachments` → `local_public_url`
   (see atlaskitMediaOverrides.tsx) — this is strictly the edit-side
   fallback. */
function mediaPlaceholderParagraph(filename: string): any {
  const label = filename && filename.trim().length > 0 ? filename : 'attachment';
  return {
    type: 'paragraph',
    content: [{ type: 'text', text: `📎 ${label}`, marks: [{ type: 'italic' }] }],
  };
}

function adfMediaToTiptap(m: any): any {
  const src = m?.attrs?.url || '';
  const filename = m?.attrs?.alt || m?.attrs?.filename || 'image';
  if (!src) {
    return mediaPlaceholderParagraph(filename);
  }
  return {
    type: 'image',
    attrs: { src, alt: filename },
  };
}

function adfNodeToTiptap(node: any): any {
  // Special handling: ADF `mediaSingle` / `mediaGroup` → TipTap `image` nodes
  if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
    const mediaChildren = (node.content ?? []).filter((c: any) => c.type === 'media');
    if (mediaChildren.length > 0) {
      // Return an array of image nodes (flatted by caller). Media nodes
      // without a resolvable URL are converted to a filename placeholder
      // paragraph instead of a broken <img>.
      return mediaChildren.map(adfMediaToTiptap);
    }
    return null;
  }

  // ADF `media` node at top level (shouldn't happen often, but handle it)
  if (node.type === 'media') {
    return adfMediaToTiptap(node);
  }

  const tiptapType = ADF_TO_TIPTAP_NODES[node.type] || node.type;
  const result: any = { type: tiptapType };

  if (node.attrs && Object.keys(node.attrs).length > 0) {
    result.attrs = { ...node.attrs };
  }

  if (node.text !== undefined) {
    result.text = node.text;
  }

  if (node.marks && node.marks.length > 0) {
    result.marks = node.marks.map((mark: any) => {
      const mapped: any = { type: ADF_TO_TIPTAP_MARKS[mark.type] || mark.type };
      if (mark.attrs && Object.keys(mark.attrs).length > 0) {
        mapped.attrs = { ...mark.attrs };
      }
      return mapped;
    });
  }

  if (node.content && node.content.length > 0) {
    // Flatten any arrays returned by mediaSingle/mediaGroup conversion
    result.content = node.content
      .map(adfNodeToTiptap)
      .filter((n: any) => n != null)
      .flat();
  }

  return result;
}

export function adfToTiptapJson(adf: any): any {
  const { version: _v, ...rest } = adf;
  return adfNodeToTiptap(rest);
}

// 2026-04-20 — `tiptapJsonHasText` / `adfToPlainTextFallback` were an
// earlier attempt at a plaintext-fallback safety net when TipTap was a
// primary composer. They have been removed along with the fallback
// mechanism: detail surfaces now use the Atlaskit editor exclusively
// (see CatalystDescriptionSection / IssueContentView / StoryDetailModal).

// ─── Content detection ──────────────────────────────────────
export type ContentType = 'adf' | 'html' | 'empty';

export function detectContentType(raw: string | null | undefined): ContentType {
  if (!raw || raw.trim() === '') return 'empty';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'doc' && parsed.version !== undefined) return 'adf';
    } catch { /* not JSON */ }
  }
  return 'html';
}

export function parseAdfContent(raw: string | null | undefined): any | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'doc') return parsed;
    } catch { /* not JSON */ }
  }
  return null;
}

// ─── Resolve content for TipTap editor ──────────────────────
// Returns either ADF JSON (for setContent) or HTML string, depending on stored format.
// Consumers: StoryRichTextEditor, CatalystRichTextEditor (edit-path TipTap content).
//
// Note: `adfToHtml` and `resolveDisplayHtml` formerly lived here as read-path
// helpers. They were retired in the B1 @atlaskit/renderer rollout — read paths
// now go through `EpicDescriptionRenderer` / `adfHelpers`. `adfToHtml` itself
// is still imported directly from `@/modules/project-work-hub/utils/adfToHtml`
// by the 3 legacy TipTap edit-initial-content sites; that call site will be
// removed when those editors migrate to Atlaskit (B2 scope).
export function resolveEditorContent(
  raw: string | null | undefined,
): string | object {
  if (!raw || raw.trim() === '') return '';
  const adf = parseAdfContent(raw);
  if (adf) return adfToTiptapJson(adf);
  return raw; // HTML — TipTap handles HTML content natively
}
