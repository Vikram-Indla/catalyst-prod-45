/**
 * ADF → Tiptap JSON adapter.
 *
 * Jira's Atlassian Document Format and Tiptap/ProseMirror JSON are
 * structurally near-identical because Atlaskit's editor is also ProseMirror
 * under the hood. The differences this adapter normalizes:
 *   - ADF has `version` at the doc root; Tiptap does not.
 *   - ADF mark names differ: strong→bold, em→italic, subsup→subscript|
 *     superscript, textColor→textStyle.
 *   - ADF nests images as mediaSingle > media; Tiptap uses a flat image.
 *   - Tables: ADF and Tiptap differ only in attr presence (colwidth /
 *     colspan / rowspan); the structural shape is identical.
 *   - Unknown nodes are wrapped in unsupportedBlock / unsupportedInline
 *     extensions that stash the original ADF JSON in attrs — so the
 *     reverse adapter can unwrap them losslessly on save.
 *
 * Contract: pure function, no side effects. Input is an ADF doc object
 * (already JSON-parsed). Caller is responsible for JSON.parse and for
 * wrapping plain-text-only inputs before calling.
 */

export type AdfMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type AdfNode = {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
};

export type AdfDoc = {
  type: 'doc';
  version?: number;
  content?: AdfNode[];
};

export type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
};

export type TiptapDoc = {
  type: 'doc';
  content?: TiptapNode[];
};

export const EMPTY_TIPTAP_DOC: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const ADF_TO_TIPTAP_MARK: Record<string, string> = {
  strong: 'bold',
  em: 'italic',
  underline: 'underline',
  strike: 'strike',
  code: 'code',
  link: 'link',
};

/* ADF inline node types — everything else is treated as block. */
const INLINE_TYPES = new Set([
  'text', 'hardBreak', 'mention', 'emoji', 'status', 'date', 'inlineCard',
  'unsupportedInline',
]);

function convertMark(adfMark: AdfMark): TiptapMark | null {
  if (adfMark.type === 'subsup') {
    const t = (adfMark.attrs as { type?: string } | undefined)?.type;
    return { type: t === 'sup' ? 'superscript' : 'subscript' };
  }
  if (adfMark.type === 'textColor') {
    const color = (adfMark.attrs as { color?: string } | undefined)?.color;
    return color ? { type: 'textStyle', attrs: { color } } : null;
  }
  const mapped = ADF_TO_TIPTAP_MARK[adfMark.type];
  if (!mapped) return null;
  if (mapped === 'link') {
    const href = (adfMark.attrs as { href?: string } | undefined)?.href ?? '';
    return { type: 'link', attrs: { href } };
  }
  return adfMark.attrs ? { type: mapped, attrs: adfMark.attrs } : { type: mapped };
}

function convertChildren(adfChildren: AdfNode[] | undefined): TiptapNode[] | undefined {
  if (!adfChildren || adfChildren.length === 0) return undefined;
  const out: TiptapNode[] = [];
  for (const child of adfChildren) {
    const converted = convertNode(child);
    if (converted) out.push(converted);
  }
  return out.length > 0 ? out : undefined;
}

function withContent(node: TiptapNode, content?: TiptapNode[]): TiptapNode {
  return content && content.length > 0 ? { ...node, content } : node;
}

/* Wrap an unsupported ADF node so the original survives the round-trip.
   Routes to inline vs block based on the ADF node's type. */
function preserveUnsupported(adfNode: AdfNode): TiptapNode {
  const adfJson = JSON.stringify(adfNode);
  const isInline = INLINE_TYPES.has(adfNode.type);
  return {
    type: isInline ? 'unsupportedInline' : 'unsupportedBlock',
    attrs: { adf: adfJson },
  };
}

function convertNode(adfNode: AdfNode): TiptapNode | null {
  switch (adfNode.type) {
    case 'paragraph':
      return withContent({ type: 'paragraph' }, convertChildren(adfNode.content));

    case 'heading': {
      const level = (adfNode.attrs as { level?: number } | undefined)?.level ?? 1;
      return withContent({ type: 'heading', attrs: { level } }, convertChildren(adfNode.content));
    }

    case 'text': {
      const node: TiptapNode = { type: 'text', text: adfNode.text ?? '' };
      if (adfNode.marks?.length) {
        const marks = adfNode.marks
          .map(convertMark)
          .filter((m): m is TiptapMark => m !== null);
        if (marks.length > 0) node.marks = marks;
      }
      return node;
    }

    case 'hardBreak':
      return { type: 'hardBreak' };

    case 'bulletList':
    case 'orderedList':
      return withContent({ type: adfNode.type }, convertChildren(adfNode.content));

    case 'listItem':
      return withContent({ type: 'listItem' }, convertChildren(adfNode.content));

    case 'taskList':
      return withContent({ type: 'taskList' }, convertChildren(adfNode.content));

    case 'taskItem': {
      const state = (adfNode.attrs as { state?: string } | undefined)?.state;
      return withContent(
        { type: 'taskItem', attrs: { checked: state === 'DONE' } },
        convertChildren(adfNode.content),
      );
    }

    case 'codeBlock': {
      const language = (adfNode.attrs as { language?: string } | undefined)?.language;
      const base: TiptapNode = language
        ? { type: 'codeBlock', attrs: { language } }
        : { type: 'codeBlock' };
      return withContent(base, convertChildren(adfNode.content));
    }

    case 'blockquote':
      return withContent({ type: 'blockquote' }, convertChildren(adfNode.content));

    case 'rule':
      return { type: 'horizontalRule' };

    case 'mediaSingle': {
      const media = adfNode.content?.find((n) => n.type === 'media');
      if (!media) return preserveUnsupported(adfNode);
      const a = (media.attrs ?? {}) as {
        url?: string;
        alt?: string;
        width?: number;
        height?: number;
      };
      const ms = (adfNode.attrs ?? {}) as {
        layout?: string;
        borderColor?: string;
        borderSize?: string;
      };
      const attrs: Record<string, unknown> = {
        src: a.url ?? '',
        alt: a.alt ?? '',
        alignment: ms.layout ?? 'center',
        borderColor: ms.borderColor ?? null,
        borderSize: ms.borderSize ?? 'medium',
      };
      if (typeof a.width === 'number') attrs.width = a.width;
      if (typeof a.height === 'number') attrs.height = a.height;
      return { type: 'image', attrs };
    }

    case 'mention': {
      const a = (adfNode.attrs ?? {}) as { id?: string; text?: string };
      return { type: 'mention', attrs: { id: a.id ?? '', label: a.text ?? '' } };
    }

    case 'emoji': {
      const a = (adfNode.attrs ?? {}) as { shortName?: string; id?: string; text?: string };
      return {
        type: 'emoji',
        attrs: { shortName: a.shortName, id: a.id, text: a.text },
      };
    }

    /* ── Tables ──
       ADF and Tiptap structures match. Attrs (colwidth, colspan, rowspan,
       background, isHeader) pass through directly. */
    case 'table': {
      const attrs = (adfNode.attrs ?? {}) as Record<string, unknown>;
      return withContent({ type: 'table', attrs }, convertChildren(adfNode.content));
    }
    case 'tableRow':
      return withContent({ type: 'tableRow' }, convertChildren(adfNode.content));
    case 'tableHeader':
    case 'tableCell': {
      const a = (adfNode.attrs ?? {}) as Record<string, unknown>;
      return withContent({ type: adfNode.type, attrs: a }, convertChildren(adfNode.content));
    }

    /* ── Panel (info/warning/success/error/note) ── */
    case 'panel': {
      const panelType = (adfNode.attrs as { panelType?: string } | undefined)?.panelType ?? 'info';
      return withContent({ type: 'panel', attrs: { panelType } }, convertChildren(adfNode.content));
    }

    /* ── Status pill ── */
    case 'status': {
      const a = (adfNode.attrs ?? {}) as {
        text?: string; color?: string; localId?: string; style?: string;
      };
      return {
        type: 'status',
        attrs: {
          text: a.text ?? '',
          color: a.color ?? 'neutral',
          localId: a.localId ?? '',
          style: a.style ?? '',
        },
      };
    }

    /* ── Date inline chip ── */
    case 'date': {
      const ts = (adfNode.attrs as { timestamp?: string | number } | undefined)?.timestamp ?? '';
      return { type: 'date', attrs: { timestamp: String(ts) } };
    }

    /* ── Smart cards ── */
    case 'inlineCard': {
      const a = (adfNode.attrs ?? {}) as { url?: string; data?: unknown };
      return { type: 'inlineCard', attrs: { url: a.url ?? '', data: a.data ?? null } };
    }
    case 'blockCard': {
      const a = (adfNode.attrs ?? {}) as { url?: string; data?: unknown };
      return { type: 'blockCard', attrs: { url: a.url ?? '', data: a.data ?? null } };
    }

    default:
      /* Anything else: preserve losslessly via the unsupported wrapper.
         This includes expand, layoutSection, decisionList, embedCard,
         extension, bodiedExtension, inlineExtension, taskItem inside
         non-taskList contexts, and any future ADF additions. */
      return preserveUnsupported(adfNode);
  }
}

export function adfToTiptap(adf: AdfDoc | null | undefined): TiptapDoc {
  if (!adf || !adf.content || adf.content.length === 0) {
    return EMPTY_TIPTAP_DOC;
  }
  const content = adf.content
    .map(convertNode)
    .filter((n): n is TiptapNode => n !== null);
  if (content.length === 0) return EMPTY_TIPTAP_DOC;
  return { type: 'doc', content };
}
