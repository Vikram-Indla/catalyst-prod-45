/**
 * Image-node operations against the Atlaskit ProseMirror view.
 *
 * The image toolbar (ImageToolbar.tsx) gets a DOM element — the
 * [data-media-vc-wrapper] div that wraps the inline image — and needs
 * to translate that into a ProseMirror document position so we can
 * dispatch transactions. All mutations go through the EditorView so
 * the doc stays in sync and cursor/selection aren't reset (unlike
 * actions.replaceDocument which forces a full re-render).
 *
 * Type-light by design: we don't import @atlaskit/editor-core's
 * EditorView type because it's heavy and version-sensitive. The
 * surface we use is documented in the MinimalEditorView shape below.
 */

export type MinimalEditorView = {
  state: {
    doc: {
      nodeAt: (pos: number) => PMNode | null;
      resolve: (pos: number) => {
        depth: number;
        before: (depth?: number) => number;
        after: (depth?: number) => number;
        node: (depth?: number) => PMNode;
      };
    };
    tr: PMTransaction;
  };
  dispatch: (tr: PMTransaction) => void;
  focus: () => void;
  posAtDOM: (node: Node, offset: number, bias?: number) => number;
};

type PMNode = {
  type: { name: string };
  attrs: Record<string, unknown>;
  content?: { firstChild?: PMNode | null };
  firstChild?: PMNode | null;
  nodeSize: number;
};

type PMTransaction = {
  setNodeMarkup: (
    pos: number,
    type: unknown,
    attrs: Record<string, unknown>,
  ) => PMTransaction;
  delete: (from: number, to: number) => PMTransaction;
};

/**
 * Given the DOM wrapper for an inline image, walk up to the
 * mediaSingle node in the document and return its position. Returns
 * null if the wrapper isn't actually inside the editor or the node
 * at that position isn't a mediaSingle (defensive — shouldn't happen
 * during normal use).
 */
export function findMediaSinglePos(
  view: MinimalEditorView | null | undefined,
  wrapperEl: HTMLElement | null,
): { node: PMNode; pos: number } | null {
  if (!view || !wrapperEl) return null;
  try {
    // bias=-1 → position just BEFORE the element, which lands on the
    // mediaSingle node itself (Atlaskit renders mediaSingle as a
    // single block node containing the inner media).
    const pos = view.posAtDOM(wrapperEl, 0, -1);
    if (pos == null || pos < 0) return null;
    const node = view.state.doc.nodeAt(pos);
    if (!node) return null;
    // Found mediaSingle directly.
    if (node.type.name === 'mediaSingle') return { node, pos };
    // Sometimes posAtDOM lands inside the mediaSingle (on the inner
    // media node). Walk up one level via resolved position.
    const $pos = view.state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 0; d--) {
      const parent = $pos.node(d);
      if (parent.type.name === 'mediaSingle') {
        return { node: parent, pos: $pos.before(d) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Merge new attrs into the mediaSingle node and dispatch. */
export function setMediaSingleAttrs(
  view: MinimalEditorView | null | undefined,
  wrapperEl: HTMLElement | null,
  patch: Record<string, unknown>,
): boolean {
  if (!view) return false;
  const found = findMediaSinglePos(view, wrapperEl);
  if (!found) return false;
  const nextAttrs = { ...found.node.attrs, ...patch };
  const tr = view.state.tr.setNodeMarkup(found.pos, null, nextAttrs);
  view.dispatch(tr);
  return true;
}

/**
 * Merge new attrs into the INNER media node (the child of mediaSingle).
 * Used for alt text, link, and any media-level attributes.
 */
export function setInnerMediaAttrs(
  view: MinimalEditorView | null | undefined,
  wrapperEl: HTMLElement | null,
  patch: Record<string, unknown>,
): boolean {
  if (!view) return false;
  const found = findMediaSinglePos(view, wrapperEl);
  if (!found) return false;
  const inner = found.node.firstChild ?? found.node.content?.firstChild ?? null;
  if (!inner) return false;
  // Inner media sits at pos+1 (just inside the mediaSingle).
  const innerPos = found.pos + 1;
  const nextAttrs = { ...inner.attrs, ...patch };
  const tr = view.state.tr.setNodeMarkup(innerPos, null, nextAttrs);
  view.dispatch(tr);
  return true;
}

/** Remove the mediaSingle node from the document. */
export function removeMediaSingle(
  view: MinimalEditorView | null | undefined,
  wrapperEl: HTMLElement | null,
): boolean {
  if (!view) return false;
  const found = findMediaSinglePos(view, wrapperEl);
  if (!found) return false;
  const from = found.pos;
  const to = from + found.node.nodeSize;
  const tr = view.state.tr.delete(from, to);
  view.dispatch(tr);
  return true;
}

/**
 * Read current attrs without mutating. Useful for toolbar buttons
 * that need to reflect active state (e.g. which alignment is current).
 */
export function readMediaSingleAttrs(
  view: MinimalEditorView | null | undefined,
  wrapperEl: HTMLElement | null,
): Record<string, unknown> | null {
  const found = findMediaSinglePos(view, wrapperEl);
  if (!found) return null;
  return { ...found.node.attrs };
}

/** Read attrs of the inner media node (alt, url, link). */
export function readInnerMediaAttrs(
  view: MinimalEditorView | null | undefined,
  wrapperEl: HTMLElement | null,
): Record<string, unknown> | null {
  const found = findMediaSinglePos(view, wrapperEl);
  if (!found) return null;
  const inner = found.node.firstChild ?? found.node.content?.firstChild ?? null;
  if (!inner) return null;
  return { ...inner.attrs };
}
