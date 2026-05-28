/**
 * Tiptap → ADF adapter.
 *
 * Reverse of adfToTiptap. Writes ADF that Jira accepts on sync:
 *   - Always emits `version: 1` at the doc root.
 *   - Tiptap mark names map back: bold→strong, italic→em,
 *     subscript/superscript→subsup, textStyle→textColor.
 *   - Tiptap image nodes wrap as mediaSingle > media with type='external'.
 *   - Table nodes pass through with attrs intact.
 *   - Panel / Status / Date / SmartCard preserve attrs intact.
 *   - UnsupportedBlock / UnsupportedInline are UNWRAPPED — the stored ADF
 *     JSON is parsed and returned as-is, giving lossless round-trip for
 *     every ADF node type the editor doesn't natively understand.
 *   - Custom marks/nodes with no ADF analog (e.g. SmallText) degrade to
 *     their text content; not lossless on Jira sync but the body survives.
 */

import type {
  AdfDoc,
  AdfMark,
  AdfNode,
  TiptapDoc,
  TiptapMark,
  TiptapNode,
} from './adfToTiptap';

const TIPTAP_TO_ADF_MARK: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
  link: 'link',
};

const EMPTY_ADF_DOC: AdfDoc = {
  type: 'doc',
  version: 1,
  content: [{ type: 'paragraph' }],
};

function convertMark(tiptapMark: TiptapMark): AdfMark | null {
  if (tiptapMark.type === 'subscript') {
    return { type: 'subsup', attrs: { type: 'sub' } };
  }
  if (tiptapMark.type === 'superscript') {
    return { type: 'subsup', attrs: { type: 'sup' } };
  }
  if (tiptapMark.type === 'textStyle') {
    const color = (tiptapMark.attrs as { color?: string } | undefined)?.color;
    return color ? { type: 'textColor', attrs: { color } } : null;
  }
  // smallText and other custom marks have no ADF equivalent — drop the mark,
  // keep the text. The text content survives on Jira's side as plain text.
  const mapped = TIPTAP_TO_ADF_MARK[tiptapMark.type];
  if (!mapped) return null;
  if (mapped === 'link') {
    const href = (tiptapMark.attrs as { href?: string } | undefined)?.href ?? '';
    return { type: 'link', attrs: { href } };
  }
  return tiptapMark.attrs ? { type: mapped, attrs: tiptapMark.attrs } : { type: mapped };
}

function convertChildren(children: TiptapNode[] | undefined): AdfNode[] | undefined {
  if (!children || children.length === 0) return undefined;
  const out: AdfNode[] = [];
  for (const child of children) {
    const converted = convertNode(child);
    if (converted) out.push(converted);
  }
  return out.length > 0 ? out : undefined;
}

function withContent(node: AdfNode, content?: AdfNode[]): AdfNode {
  return content && content.length > 0 ? { ...node, content } : node;
}

function convertNode(tiptapNode: TiptapNode): AdfNode | null {
  switch (tiptapNode.type) {
    case 'paragraph':
      return withContent({ type: 'paragraph' }, convertChildren(tiptapNode.content));

    case 'heading': {
      const level = (tiptapNode.attrs as { level?: number } | undefined)?.level ?? 1;
      return withContent({ type: 'heading', attrs: { level } }, convertChildren(tiptapNode.content));
    }

    case 'text': {
      const node: AdfNode = { type: 'text', text: tiptapNode.text ?? '' };
      if (tiptapNode.marks?.length) {
        const marks = tiptapNode.marks
          .map(convertMark)
          .filter((m): m is AdfMark => m !== null);
        if (marks.length > 0) node.marks = marks;
      }
      return node;
    }

    case 'hardBreak':
      return { type: 'hardBreak' };

    case 'bulletList':
    case 'orderedList':
      return withContent({ type: tiptapNode.type }, convertChildren(tiptapNode.content));

    case 'listItem':
      return withContent({ type: 'listItem' }, convertChildren(tiptapNode.content));

    case 'taskList':
      return withContent({ type: 'taskList' }, convertChildren(tiptapNode.content));

    case 'taskItem': {
      const checked = (tiptapNode.attrs as { checked?: boolean } | undefined)?.checked;
      return withContent(
        { type: 'taskItem', attrs: { state: checked ? 'DONE' : 'TODO' } },
        convertChildren(tiptapNode.content),
      );
    }

    case 'codeBlock': {
      const language = (tiptapNode.attrs as { language?: string } | undefined)?.language;
      const base: AdfNode = language
        ? { type: 'codeBlock', attrs: { language } }
        : { type: 'codeBlock' };
      return withContent(base, convertChildren(tiptapNode.content));
    }

    case 'blockquote':
      return withContent({ type: 'blockquote' }, convertChildren(tiptapNode.content));

    case 'horizontalRule':
      return { type: 'rule' };

    case 'image': {
      const a = (tiptapNode.attrs ?? {}) as {
        src?: string;
        alt?: string;
        width?: number;
        height?: number;
      };
      const mediaAttrs: Record<string, unknown> = {
        type: 'external',
        url: a.src ?? '',
      };
      if (a.alt) mediaAttrs.alt = a.alt;
      if (typeof a.width === 'number') mediaAttrs.width = a.width;
      if (typeof a.height === 'number') mediaAttrs.height = a.height;
      return {
        type: 'mediaSingle',
        attrs: { layout: 'center' },
        content: [{ type: 'media', attrs: mediaAttrs }],
      };
    }

    case 'mention': {
      const a = (tiptapNode.attrs ?? {}) as { id?: string; label?: string };
      return {
        type: 'mention',
        attrs: { id: a.id ?? '', text: a.label ?? '' },
      };
    }

    case 'emoji': {
      const a = (tiptapNode.attrs ?? {}) as { shortName?: string; id?: string; text?: string };
      return {
        type: 'emoji',
        attrs: { shortName: a.shortName, id: a.id, text: a.text },
      };
    }

    /* ── Tables ── */
    case 'table': {
      const attrs = (tiptapNode.attrs ?? {}) as Record<string, unknown>;
      return withContent({ type: 'table', attrs }, convertChildren(tiptapNode.content));
    }
    case 'tableRow':
      return withContent({ type: 'tableRow' }, convertChildren(tiptapNode.content));
    case 'tableHeader':
    case 'tableCell': {
      const a = (tiptapNode.attrs ?? {}) as Record<string, unknown>;
      return withContent({ type: tiptapNode.type, attrs: a }, convertChildren(tiptapNode.content));
    }

    /* ── Panel ── */
    case 'panel': {
      const panelType = (tiptapNode.attrs as { panelType?: string } | undefined)?.panelType ?? 'info';
      return withContent({ type: 'panel', attrs: { panelType } }, convertChildren(tiptapNode.content));
    }

    /* ── Status pill ── */
    case 'status': {
      const a = (tiptapNode.attrs ?? {}) as {
        text?: string; color?: string; localId?: string; style?: string;
      };
      const attrs: Record<string, unknown> = {
        text: a.text ?? '',
        color: a.color ?? 'neutral',
        localId: a.localId ?? '',
      };
      if (a.style) attrs.style = a.style;
      return { type: 'status', attrs };
    }

    /* ── Date inline chip ── */
    case 'date': {
      const ts = (tiptapNode.attrs as { timestamp?: string } | undefined)?.timestamp ?? '';
      return { type: 'date', attrs: { timestamp: ts } };
    }

    /* ── Smart cards ── */
    case 'inlineCard': {
      const a = (tiptapNode.attrs ?? {}) as { url?: string; data?: unknown };
      const attrs: Record<string, unknown> = { url: a.url ?? '' };
      if (a.data) attrs.data = a.data;
      return { type: 'inlineCard', attrs };
    }
    case 'blockCard': {
      const a = (tiptapNode.attrs ?? {}) as { url?: string; data?: unknown };
      const attrs: Record<string, unknown> = { url: a.url ?? '' };
      if (a.data) attrs.data = a.data;
      return { type: 'blockCard', attrs };
    }

    /* ── Unwrap preserved unknown nodes ── */
    case 'unsupportedBlock':
    case 'unsupportedInline': {
      const raw = (tiptapNode.attrs as { adf?: string } | undefined)?.adf ?? '';
      if (!raw) return null;
      try {
        return JSON.parse(raw) as AdfNode;
      } catch {
        return null;
      }
    }

    default: {
      // Truly unknown node coming out of the editor — preserve its
      // convertible children to avoid silent data loss.
      const converted = convertChildren(tiptapNode.content);
      if (converted && converted.length > 0) {
        return { type: 'paragraph', content: converted };
      }
      return null;
    }
  }
}

export function tiptapToAdf(tiptap: TiptapDoc | null | undefined): AdfDoc {
  if (!tiptap || !tiptap.content || tiptap.content.length === 0) {
    return EMPTY_ADF_DOC;
  }
  const content = tiptap.content
    .map(convertNode)
    .filter((n): n is AdfNode => n !== null);
  if (content.length === 0) return EMPTY_ADF_DOC;
  return { type: 'doc', version: 1, content };
}
