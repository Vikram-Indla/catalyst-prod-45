/**
 * adfHelpers — utilities for reasoning about ADF documents without
 * rendering them. Needed after the B1 retirement of `adfToHtml` —
 * previously the pattern `!adfToHtml(x).trim()` was (ab)used as an
 * empty-content check and the rendered HTML doubled as the synchronous
 * fallback for the `@atlaskit/renderer` chunk-load / error-boundary
 * paths. These helpers replace both uses.
 */
import type { ADFEntity } from '@atlaskit/adf-utils/types';

/* Node types that carry meaningful content even when they have no
   descendants — bare presence is non-empty. */
const LEAF_CONTENT_NODES = new Set<string>([
  'rule',
  'media',
  'mediaInline',
  'emoji',
  'mention',
  'inlineCard',
  'embedCard',
  'blockCard',
  'date',
  'status',
  'taskItem',
  'decisionItem',
  'codeBlock',
]);

/**
 * Returns true iff the ADF document has no visible, meaningful content.
 * An empty doc, a doc containing only empty paragraphs, or a doc whose
 * leaves are only whitespace are all considered empty.
 */
export function isAdfEmpty(input: unknown): boolean {
  if (input == null) return true;

  // Strings — treat as ADF JSON if it parses, else as plain text
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('{')) {
      try {
        return isAdfEmpty(JSON.parse(trimmed));
      } catch {
        // Plain text — non-empty after trim
        return false;
      }
    }
    return false;
  }

  if (typeof input !== 'object') return true;
  const node = input as ADFEntity;

  if (typeof node.type !== 'string') return true;
  if (LEAF_CONTENT_NODES.has(node.type)) return false;
  if (typeof node.text === 'string' && node.text.trim().length > 0) return false;
  if (Array.isArray(node.content)) {
    return node.content.every(isAdfEmpty);
  }
  return true;
}

/**
 * Extract plain text from an ADF document. Used as the synchronous
 * render fallback when `@atlaskit/renderer` is still loading or has
 * failed (ErrorBoundary). Preserves paragraph breaks and list bullets
 * roughly — it's a fallback, not a replacement for real rendering.
 */
export function adfToPlainText(input: unknown): string {
  if (input == null) return '';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{')) {
      try {
        return adfToPlainText(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof input !== 'object') return '';
  const node = input as ADFEntity;

  return walkNode(node, { depth: 0, insideListItem: false }).trim();
}

interface WalkCtx {
  depth: number;
  insideListItem: boolean;
}

function walkNode(node: ADFEntity, ctx: WalkCtx): string {
  if (!node || typeof node !== 'object') return '';
  const type = node.type;

  if (typeof node.text === 'string') return node.text;

  switch (type) {
    case 'hardBreak':
      return '\n';
    case 'rule':
      return '\n\n———\n\n';
    case 'emoji': {
      const shortName = (node.attrs as any)?.shortName;
      return typeof shortName === 'string' ? shortName : '';
    }
    case 'mention': {
      const txt = (node.attrs as any)?.text;
      return typeof txt === 'string' ? txt : '@';
    }
    case 'date':
    case 'status':
    case 'inlineCard':
    case 'embedCard':
    case 'blockCard':
    case 'media':
    case 'mediaInline':
      // No plain-text representation — skip silently.
      return '';
    default:
      break;
  }

  const children = Array.isArray(node.content) ? node.content : [];

  // Block-level nodes each get their own line (two, for paragraph spacing).
  const blockTypes = new Set([
    'paragraph', 'heading', 'blockquote', 'codeBlock',
    'listItem', 'taskItem', 'decisionItem', 'panel',
    'expand', 'nestedExpand',
  ]);

  const joiner = blockTypes.has(type as string) ? '' : '';
  let text = children.map((c) => walkNode(c as ADFEntity, {
    ...ctx,
    depth: ctx.depth + 1,
    insideListItem: type === 'listItem' || type === 'taskItem' || ctx.insideListItem,
  })).join(joiner);

  if (type === 'listItem') {
    const indent = '  '.repeat(Math.max(0, ctx.depth - 1));
    return `${indent}• ${text.trim()}\n`;
  }
  if (type === 'paragraph' || type === 'heading' || type === 'blockquote' || type === 'panel') {
    return text ? `${text}\n\n` : '';
  }
  if (type === 'codeBlock') {
    return text ? `\n${text}\n\n` : '';
  }
  return text;
}
