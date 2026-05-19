interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
}

interface MinimalProsemirrorView {
  state: {
    doc: {
      resolve: (pos: number) => {
        depth: number;
        before: (depth: number) => number;
        node: (depth: number) => { type: { name: string } };
      };
    };
    tr: {
      setSelection: (sel: unknown) => { setSelection: unknown };
    };
  };
  dispatch: (tr: unknown) => void;
  focus: () => void;
  posAtDOM: (node: Node, offset: number, bias?: number) => number;
}

interface ExternalMediaEntry {
  url: string;
  alt: string;
  width?: number;
}

export interface InjectionHandles {
  getView?: () => MinimalProsemirrorView | null | undefined;
  NodeSelection?: { create: (doc: unknown, pos: number) => unknown };
}

const INJECTED_FLAG = 'data-catalyst-injected';

function collectExternalMedia(node: AdfNode | undefined | null): ExternalMediaEntry[] {
  if (!node || typeof node !== 'object') return [];
  const out: ExternalMediaEntry[] = [];

  function walk(n: AdfNode): void {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'mediaSingle') {
      const media = n.content?.[0];
      if (
        media &&
        media.type === 'media' &&
        media.attrs?.type === 'external' &&
        typeof media.attrs?.url === 'string' &&
        (media.attrs.url as string).length > 0
      ) {
        out.push({
          url: media.attrs.url as string,
          alt: (media.attrs.alt as string | undefined) ?? '',
          width: typeof media.attrs.width === 'number' ? (media.attrs.width as number) : undefined,
        });
      }
      return;
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child);
    }
  }

  walk(node);
  return out;
}

function buildImg(entry: ExternalMediaEntry): HTMLImageElement {
  const img = document.createElement('img');
  img.src = entry.url;
  img.alt = entry.alt;
  img.setAttribute(INJECTED_FLAG, 'true');
  img.setAttribute('contenteditable', 'false');
  img.draggable = false;
  img.style.display = 'block';
  img.style.width = 'auto';
  img.style.height = 'auto';
  img.style.maxWidth = entry.width && entry.width > 0 ? `${entry.width}px` : '100%';
  img.style.borderRadius = '3px';
  img.style.userSelect = 'none';
  img.style.cursor = 'pointer';

  if (!entry.width || entry.width <= 0) {
    img.addEventListener('load', () => {
      if (img.naturalWidth > 0) {
        img.style.maxWidth = `${img.naturalWidth}px`;
      }
    });
  }
  return img;
}

function selectMediaSingleNode(
  view: MinimalProsemirrorView | null | undefined,
  wrapper: HTMLElement,
  NodeSelectionClass: { create: (doc: unknown, pos: number) => unknown } | null | undefined,
): boolean {
  if (!view || !NodeSelectionClass) return false;
  let posInside: number;
  try {
    posInside = view.posAtDOM(wrapper, 0);
  } catch {
    return false;
  }
  if (typeof posInside !== 'number' || posInside < 0) return false;

  let $pos: ReturnType<MinimalProsemirrorView['state']['doc']['resolve']>;
  try {
    $pos = view.state.doc.resolve(posInside);
  } catch {
    return false;
  }

  for (let depth = $pos.depth; depth >= 0; depth--) {
    let node;
    try {
      node = $pos.node(depth);
    } catch {
      continue;
    }
    if (node && node.type?.name === 'mediaSingle') {
      const nodePos = $pos.before(depth);
      try {
        const sel = NodeSelectionClass.create(view.state.doc, nodePos);
        const tr = view.state.tr.setSelection(sel);
        view.dispatch(tr);
        view.focus();
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

export function injectExternalMediaImages(
  rootEl: HTMLElement,
  adfDoc: unknown,
  handles?: InjectionHandles,
): void {
  const entries = collectExternalMedia(adfDoc as AdfNode | null);
  if (entries.length === 0) return;

  const wrappers = rootEl.querySelectorAll<HTMLElement>('[data-media-vc-wrapper="true"]');
  wrappers.forEach((wrapper, i) => {
    const entry = entries[i];
    if (!entry) return;

    const existing = wrapper.querySelector<HTMLImageElement>(`img[${INJECTED_FLAG}="true"]`);
    if (existing) {
      if (existing.src !== entry.url) {
        existing.src = entry.url;
        existing.alt = entry.alt;
      }
      return;
    }

    const img = buildImg(entry);
    if (handles) {
      img.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectMediaSingleNode(handles.getView?.(), wrapper, handles.NodeSelection);
      });
      img.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    }
    wrapper.appendChild(img);
  });
}

export function watchAndInjectExternalMedia(
  rootEl: HTMLElement,
  getCurrentAdf: () => unknown,
  handles?: InjectionHandles,
): () => void {
  injectExternalMediaImages(rootEl, getCurrentAdf(), handles);

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      injectExternalMediaImages(rootEl, getCurrentAdf(), handles);
    });
  });

  observer.observe(rootEl, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
