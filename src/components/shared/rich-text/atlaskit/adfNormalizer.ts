/**
 * adfNormalizer — Coerce stored Catalyst ADF into a shape that
 * `@atlaskit/editor-core` and `@atlaskit/renderer` can safely consume.
 *
 * Catalyst's existing ADF (produced by the TipTap → ADF converter at
 * `modules/project-work-hub/components/story-detail/adf-utils.ts`) places
 * the Supabase image URL on `mediaSingle > media.attrs.url` with
 * `attrs.type === 'file'`. Atlaskit's schema only treats this URL as
 * renderable when `media.attrs.type === 'external'` and the URL lives at
 * `attrs.url`. Anything else routes through the Atlassian Media client
 * and silently fails when no MediaProvider is registered.
 *
 * This normalizer:
 *   - guarantees the document is a `doc` with `version: 1`
 *   - rewrites `media` nodes with a `url` to `type: 'external'`
 *   - drops media nodes that have no usable URL (would otherwise crash)
 *   - drops unknown top-level node types we don't ship a renderer for
 *   - preserves every other node/mark unchanged
 */
import type { ADFEntity } from '@atlaskit/adf-utils/types';

const SUPPORTED_BLOCK_NODES = new Set<string>([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'codeBlock',
  'blockquote',
  'rule',
  'mediaSingle',
  'mediaGroup',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
  'panel',
  'taskList',
  'taskItem',
  'decisionList',
  'decisionItem',
  'expand',
  'nestedExpand',
  'layoutSection',
  'layoutColumn',
]);

const SUPPORTED_INLINE_NODES = new Set<string>([
  'text',
  'hardBreak',
  'emoji',
  'mention',
  'inlineCard',
  'date',
  'status',
  'mediaInline',
]);

const SUPPORTED_NODES = new Set<string>([
  ...SUPPORTED_BLOCK_NODES,
  ...SUPPORTED_INLINE_NODES,
  'media',
]);

function normalizeMedia(node: ADFEntity): ADFEntity | null {
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;
  const url = (attrs.url as string | undefined) ?? (attrs.src as string | undefined);

  if (typeof url === 'string' && url.length > 0) {
    return {
      type: 'media',
      attrs: {
        type: 'external',
        url,
        alt: (attrs.alt as string | undefined) ?? (attrs.filename as string | undefined) ?? '',
        width: typeof attrs.width === 'number' ? attrs.width : undefined,
        height: typeof attrs.height === 'number' ? attrs.height : undefined,
      },
    } as ADFEntity;
  }

  if (typeof attrs.id === 'string' && (attrs.id as string).length > 0 && (attrs.type === 'file' || attrs.type === 'link')) {
    return node;
  }

  return null;
}

function normalizeNode(node: ADFEntity): ADFEntity | null {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return null;

  if (node.type === 'media') {
    return normalizeMedia(node);
  }

  if (!SUPPORTED_NODES.has(node.type)) {
    return null;
  }

  const next: ADFEntity = { type: node.type };

  if (node.attrs && Object.keys(node.attrs).length > 0) {
    next.attrs = { ...node.attrs };
  }
  if (typeof node.text === 'string') {
    next.text = node.text;
  }
  if (Array.isArray(node.marks) && node.marks.length > 0) {
    next.marks = node.marks
      .filter((m): m is { type: string; attrs?: Record<string, unknown> } => !!m && typeof m.type === 'string')
      .map((m) => (m.attrs ? { type: m.type, attrs: { ...m.attrs } } : { type: m.type }));
  }

  if (Array.isArray(node.content)) {
    const children = node.content
      .map(normalizeNode)
      .filter((c): c is ADFEntity => c !== null);

    if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
      const mediaChildren = children.filter((c) => c.type === 'media');
      if (mediaChildren.length === 0) return null;
      next.content = mediaChildren;
    } else {
      next.content = children;
    }
  }

  if (node.type === 'paragraph' && !next.content) {
    next.content = [];
  }

  return next;
}

/**
 * Normalize an ADF document to a shape Atlaskit will accept.
 * Always returns a valid doc (empty paragraph if input is unusable).
 */
export function normalizeAdfForAtlaskit(input: unknown): ADFEntity {
  const empty: ADFEntity = {
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  };

  if (!input || typeof input !== 'object') return empty;
  const doc = input as ADFEntity;
  if (doc.type !== 'doc') return empty;

  const content = Array.isArray(doc.content)
    ? doc.content.map(normalizeNode).filter((c): c is ADFEntity => c !== null)
    : [];

  return {
    version: 1,
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  };
}

/**
 * Parse a stored description value (string | object | null) into a normalized ADF doc.
 * Handles three legacy storage shapes:
 *   - JSON string of ADF
 *   - JSON object of ADF (jsonb)
 *   - plain text or HTML — wrapped as a single paragraph
 */
export function parseStoredDescriptionToAdf(stored: unknown): ADFEntity {
  if (stored == null) {
    return normalizeAdfForAtlaskit(null);
  }

  if (typeof stored === 'object') {
    return normalizeAdfForAtlaskit(stored);
  }

  if (typeof stored === 'string') {
    const trimmed = stored.trim();
    if (!trimmed) return normalizeAdfForAtlaskit(null);
    if (trimmed.startsWith('{')) {
      try {
        return normalizeAdfForAtlaskit(JSON.parse(trimmed));
      } catch {
        // fall through to plain-text wrap
      }
    }
    return {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: trimmed }] }],
    };
  }

  return normalizeAdfForAtlaskit(null);
}
