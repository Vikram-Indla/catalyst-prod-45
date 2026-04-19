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
function adfNodeToTiptap(node: any): any {
  // Special handling: ADF `mediaSingle` / `mediaGroup` → TipTap `image` nodes
  if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
    const mediaChildren = (node.content ?? []).filter((c: any) => c.type === 'media');
    if (mediaChildren.length > 0) {
      // Return an array of image nodes (flatted by caller)
      return mediaChildren.map((m: any) => ({
        type: 'image',
        attrs: {
          src: m.attrs?.url || '',
          alt: m.attrs?.alt || m.attrs?.filename || 'image',
        },
      }));
    }
    return null;
  }

  // ADF `media` node at top level (shouldn't happen often, but handle it)
  if (node.type === 'media') {
    return {
      type: 'image',
      attrs: {
        src: node.attrs?.url || '',
        alt: node.attrs?.alt || node.attrs?.filename || 'image',
      },
    };
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

// ─── ADF → HTML (for read-only rendering) ───────────────────
// Delegates to the canonical hardened converter in utils/adfToHtml.ts
import { adfToHtml as _adfToHtml } from '../../utils/adfToHtml';
export const adfToHtml = _adfToHtml;

// ─── Resolve content for TipTap editor ──────────────────────
// Returns either ADF JSON (for setContent) or HTML string, depending on stored format
export function resolveEditorContent(raw: string | null | undefined): string | object {
  if (!raw || raw.trim() === '') return '';
  const adf = parseAdfContent(raw);
  if (adf) return adfToTiptapJson(adf);
  return raw; // HTML — TipTap handles HTML content natively
}

// ─── Resolve content for read-only display ──────────────────
export function resolveDisplayHtml(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return '';
  const adf = parseAdfContent(raw);
  if (adf) return adfToHtml(adf);
  return raw; // Already HTML
}
