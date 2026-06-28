/**
 * useTiptapEditor — configures a Tiptap editor with the extension set the
 * Catalyst Description needs. Returns the live Editor instance.
 *
 * Coverage matrix vs Jira ADF:
 *   - Prose / marks: paragraph, heading 1-6, bold, italic, underline,
 *     strike, code, subscript, superscript, link, color (textStyle)
 *   - Lists: bullet, ordered, task (nested + checkbox)
 *   - Blocks: blockquote, code block, horizontal rule, hard break, image
 *   - Tables: full Tiptap Table suite — table, row, header, cell
 *   - Panel: custom info/warning/success/error/note block
 *   - Status, Date, InlineCard, BlockCard: round-trip preserving display
 *   - Mention: custom @-chip
 *   - SmallText: custom mark (no ADF — degrades to text on Jira sync)
 *   - UnsupportedBlock / UnsupportedInline: lossless preservation of any
 *     other ADF node (expand, decisionList, layoutSection, etc.)
 */
import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { CatalystImage } from '../extensions/CatalystImage';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import {
  Table as BaseTable,
  TableRow,
  TableHeader as BaseTableHeader,
  TableCell as BaseTableCell,
} from '@tiptap/extension-table';
import { CodeBlock as BaseCodeBlock } from '@tiptap/extension-code-block';

/**
 * CodeBlock with a built-in line-number gutter — same UX as a code
 * editor. The NodeView wraps PM's <code> contentDOM with a sibling
 * gutter <div> (contentEditable=false so PM ignores it) and rewrites
 * the gutter's contents on every transaction that touches the node.
 *
 * No borders — just a darker gray strip on the left for the gutter,
 * the existing sunken background on the right for the code area.
 */
const CodeBlockWithGutter = BaseCodeBlock.extend({
  /**
   * Extra attributes beyond StarterKit's `language`:
   *   - `wrapped` — soft-wrap toggle from the CodeBlockToolbar. Persists
   *     to ADF as a non-Jira attribute (Jira ignores unknown attrs on
   *     read-back) so the wrap preference survives save / reload.
   */
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      wrapped: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-wrapped') === 'true',
        renderHTML: (attrs: { wrapped?: boolean }) =>
          attrs.wrapped ? { 'data-wrapped': 'true' } : {},
      },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'catalyst-code-block';

      const gutter = document.createElement('div');
      gutter.className = 'catalyst-code-block-gutter';
      gutter.contentEditable = 'false';
      wrapper.appendChild(gutter);

      const pre = document.createElement('pre');
      pre.className = 'catalyst-code-block-pre';
      const code = document.createElement('code');
      pre.appendChild(code);
      wrapper.appendChild(pre);

      const renderGutter = (text: string) => {
        // Always show at least one number even for an empty block.
        const lineCount = Math.max(1, text.split('\n').length);
        const frag = document.createDocumentFragment();
        for (let i = 1; i <= lineCount; i++) {
          const ln = document.createElement('span');
          ln.className = 'catalyst-code-block-ln';
          ln.textContent = String(i);
          frag.appendChild(ln);
        }
        gutter.replaceChildren(frag);
      };

      const applyAttrs = (n: {
        attrs: { language?: string | null; wrapped?: boolean };
      }) => {
        const wrapped = !!n.attrs.wrapped;
        wrapper.setAttribute('data-wrapped', wrapped ? 'true' : 'false');
        const lang = n.attrs.language ?? '';
        if (lang) wrapper.setAttribute('data-language', lang);
        else wrapper.removeAttribute('data-language');
      };

      renderGutter(node.textContent);
      applyAttrs(node);

      return {
        dom: wrapper,
        contentDOM: code,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) return false;
          renderGutter(updatedNode.textContent);
          applyAttrs(updatedNode);
          return true;
        },
        ignoreMutation(mutation) {
          // Anything on or under the gutter is OUR DOM — PM never
          // touches it, so PM should ignore the mutation.
          if (
            mutation.target === gutter ||
            gutter.contains(mutation.target as Node)
          ) {
            return true;
          }
          // Our own data-* attribute writes on the wrapper come from
          // applyAttrs and must not trigger PM reconciliation.
          if (
            mutation.type === 'attributes' &&
            mutation.target === wrapper &&
            (mutation.attributeName === 'data-wrapped' ||
              mutation.attributeName === 'data-language')
          ) {
            return true;
          }
          return false;
        },
      };
    };
  },
});

// TableCell + TableHeader extended with a `background` attribute the
// column/row color picker writes. Rendered as inline
// `background-color` with !important so it beats both the default
// cell rule and the sunken-bg rule for <th>.
const CELL_BG_ATTR = {
  background: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.style.backgroundColor || null,
    renderHTML: (attrs: { background?: string | null }) =>
      attrs.background
        ? { style: `background-color: ${attrs.background} !important` }
        : {},
  },
};
const TableCell = BaseTableCell.extend({
  addAttributes() {
    return { ...(this.parent?.() ?? {}), ...CELL_BG_ATTR };
  },
});
const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return { ...(this.parent?.() ?? {}), ...CELL_BG_ATTR };
  },
});

// Table extended with a numeric `width` attribute AND a custom
// NodeView that owns the table DOM. Without the NodeView, the
// underlying @tiptap/extension-table machinery rebuilds the <table>
// on every attribute change and strips our inline width. By owning
// the DOM we apply `width: Npx !important` directly on every update,
// so the user's resize survives every PM transaction and round-trip.
// Minimal PM-node shape we walk for column widths — keeps the
// NodeView free of a direct @tiptap/pm/model dependency.
interface PMNodeShape {
  attrs: Record<string, unknown>;
  firstChild: PMNodeShape | null;
  forEach: (fn: (child: PMNodeShape) => void) => void;
}

type TableViewAttrs = {
  width?: number | null;
  headerRow?: boolean;
  headerColumn?: boolean;
  numberedRows?: boolean;
  alignment?: 'left' | 'center' | 'right';
};

const Table = BaseTable.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const styleW = (el as HTMLElement).style.width;
          if (styleW) {
            const m = styleW.match(/(\d+)/);
            if (m) return parseInt(m[1], 10);
          }
          const attrW = (el as HTMLElement).getAttribute('width');
          if (attrW) {
            const n = parseInt(attrW, 10);
            return Number.isFinite(n) ? n : null;
          }
          return null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width || typeof attrs.width !== 'number') return {};
          return { style: `width: ${attrs.width}px !important` };
        },
      },
      // Toolbar toggles. CSS in editorStyles keys off the data-*
      // attributes set by the NodeView for visual rendering (gray
      // header bg, numbered column, alignment shift).
      headerRow: {
        default: true,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-header-row') !== 'false',
        renderHTML: () => ({}),
      },
      headerColumn: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-header-column') === 'true',
        renderHTML: () => ({}),
      },
      numberedRows: {
        default: false,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-numbered-rows') === 'true',
        renderHTML: () => ({}),
      },
      alignment: {
        default: 'left' as 'left' | 'center' | 'right',
        parseHTML: (el) =>
          ((el as HTMLElement).getAttribute('data-alignment') as
            | 'left'
            | 'center'
            | 'right') ?? 'left',
        renderHTML: () => ({}),
      },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tableWrapper';

      const table = document.createElement('table');
      Object.entries(HTMLAttributes).forEach(([k, v]) => {
        if (k === 'style' || v == null) return;
        table.setAttribute(k, String(v));
      });
      // <colgroup> + <col> per column — the column-resize plugin
       // updates cell `colwidth` attrs, and we mirror those into the
       // <col> widths here so the visual column actually resizes when
       // the user drags the boundary. (prosemirror-tables' default
       // TableView does this; since we replace it with our own
       // NodeView, we have to do it ourselves.)
      const colgroup = document.createElement('colgroup');
      table.appendChild(colgroup);
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      wrapper.appendChild(table);

      const updateColumns = (n: { firstChild: PMNodeShape | null }) => {
        const firstRow = n.firstChild as PMNodeShape | null;
        if (!firstRow) {
          while (colgroup.firstChild)
            colgroup.removeChild(colgroup.firstChild);
          return;
        }
        const widths: (number | null)[] = [];
        firstRow.forEach((cell: PMNodeShape) => {
          const colspan = (cell.attrs.colspan as number) || 1;
          const colwidth = cell.attrs.colwidth as number[] | null;
          for (let i = 0; i < colspan; i++) {
            widths.push(colwidth?.[i] ?? null);
          }
        });
        // Reconcile <col> elements with the desired widths.
        while (colgroup.children.length > widths.length) {
          colgroup.removeChild(colgroup.lastChild!);
        }
        while (colgroup.children.length < widths.length) {
          colgroup.appendChild(document.createElement('col'));
        }
        widths.forEach((w, i) => {
          const col = colgroup.children[i] as HTMLElement;
          col.style.width = w ? `${w}px` : '';
        });
      };

      const applyAttrs = (n: {
        attrs: TableViewAttrs;
        firstChild: PMNodeShape | null;
      }) => {
        updateColumns(n);
        const a = n.attrs;
        if (typeof a.width === 'number' && a.width > 0) {
          table.style.setProperty('width', `${a.width}px`, 'important');
        } else {
          table.style.removeProperty('width');
        }
        table.setAttribute('data-header-row', a.headerRow ? 'true' : 'false');
        table.setAttribute(
          'data-header-column',
          a.headerColumn ? 'true' : 'false',
        );
        table.setAttribute(
          'data-numbered-rows',
          a.numberedRows ? 'true' : 'false',
        );
        table.setAttribute('data-alignment', a.alignment || 'left');
      };
      applyAttrs(node);

      return {
        dom: wrapper,
        contentDOM: tbody,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) return false;
          applyAttrs(updatedNode);
          return true;
        },
        ignoreMutation(mutation) {
          if (mutation.type !== 'attributes') return false;
          if (mutation.target === table || mutation.target === wrapper) {
            return true;
          }
          // TableInteractions writes inline styles + the
          // data-catalyst-cell-selected attr on <td>/<th> elements to
          // drive the column/row highlight. PM would otherwise revert
          // those marks on the next render.
          if (mutation.attributeName === 'data-catalyst-cell-selected') {
            return true;
          }
          const tgt = mutation.target as HTMLElement;
          if (
            mutation.attributeName === 'style' &&
            (tgt.tagName === 'TD' || tgt.tagName === 'TH') &&
            table.contains(tgt)
          ) {
            return true;
          }
          // ColumnResizeHandles writes inline width on <col> (and
          // touches <colgroup>) during live column drag. Without this
          // guard, every mousemove that mutates <col>.style.width is
          // observed by PM's MutationObserver and triggers a
          // re-render that runs updateColumns(), which RESETS col
          // widths from the pre-drag cell.colwidth. The visible
          // symptom is "only resizes once" + "shifts from both sides"
          // — PM is fighting the drag tick-by-tick.
          if (
            mutation.attributeName === 'style' &&
            (tgt.tagName === 'COL' || tgt.tagName === 'COLGROUP') &&
            table.contains(tgt)
          ) {
            return true;
          }
          return false;
        },
      };
    };
  },
});
import Placeholder from '@tiptap/extension-placeholder';
import { SmallText } from '../extensions/SmallText';
import { Mention } from '../extensions/Mention';
import { Panel } from '../extensions/Panel';
import { Status } from '../extensions/Status';
import { DateNode } from '../extensions/DateNode';
import { InlineCard, BlockCard } from '../extensions/SmartCard';
import { UnsupportedBlock, UnsupportedInline } from '../extensions/UnsupportedNode';
import { SelectionDragCursor } from '../extensions/SelectionDragCursor';
import { TableSelection } from '../extensions/TableSelection';
import { TableShortcuts } from '../extensions/TableShortcuts';
import { CodeBlockHighlight } from '../extensions/CodeBlockHighlight';
import { Direction } from '../extensions/Direction';
import { AutoDirection } from '../extensions/AutoDirection';
import type { AdfDoc, TiptapDoc } from '../utils/adfToTiptap';
import { adfToTiptap } from '../utils/adfToTiptap';

export interface UseTiptapEditorOptions {
  initialAdf: AdfDoc | null | undefined;
  placeholder?: string;
  editable?: boolean;
  onUpdate?: (json: TiptapDoc) => void;
  autofocus?: boolean;
  /**
   * 2026-06-17: handles pasted (Ctrl+V) and dropped image files. When
   * supplied, the editor intercepts ClipboardEvent / DragEvent items
   * with `kind === 'file'` and `type.startsWith('image/')`, calls this
   * function to upload, then inserts an `image` node at the cursor.
   * When omitted, pasting an image is a no-op (default Tiptap behaviour
   * drops the file silently because allowBase64=false on CatalystImage).
   */
  onImageUpload?: (file: File) => Promise<string>;
}

export const DEFAULT_PLACEHOLDER =
  'Type /ai to Ask Caty or @ to mention and notify someone';

export function useTiptapEditor(options: UseTiptapEditorOptions): Editor | null {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          link: false,
          // Drop indicator shown while dragging a block via the
          // BlockDragHandle. Color/width are applied as INLINE styles
          // by prosemirror-dropcursor — passing them here is the only
          // reliable way to override the default black/1px line, since
          // the cursor element is appended to view.dom.offsetParent
          // (outside the editor DOM) so CSS scoping is brittle.
          dropcursor: {
            color: 'var(--ds-link)',
            width: 1,
            class: 'catalyst-drop-line',
          },
          // dir="auto" on every block makes the browser detect text
          // direction per-block from its first strong character.
          // Arabic blocks → RTL flow + right alignment + bullets on
          // the right. English blocks → LTR flow. Mixed descriptions
          // (post-translation) render each block correctly.
          paragraph: { HTMLAttributes: { dir: 'auto' } },
          heading: { HTMLAttributes: { dir: 'auto' } },
          blockquote: { HTMLAttributes: { dir: 'auto' } },
          bulletList: { HTMLAttributes: { dir: 'auto' } },
          orderedList: { HTMLAttributes: { dir: 'auto' } },
          listItem: { HTMLAttributes: { dir: 'auto' } },
          // Disable StarterKit's built-in code block — we register
          // CodeBlockWithGutter below which adds line numbers.
          codeBlock: false,
        }),
        CodeBlockWithGutter.configure({
          HTMLAttributes: { dir: 'auto' },
          // Never auto-exit on N empty lines. The block stays as
          // long as the user types in it, no matter how many empty
          // lines they add — they exit explicitly (Shift+Enter out,
          // arrow-down at the end, or click outside).
          exitOnTripleEnter: false,
        }),
        Underline,
        Subscript,
        Superscript,
        TextStyle,
        Color,
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer nofollow',
            target: '_blank',
          },
        }),
        CatalystImage.configure({ inline: false, allowBase64: false }),
        TaskList.configure({ HTMLAttributes: { dir: 'auto' } }),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: { dir: 'auto' },
        }),
        // Tables — full Jira parity via Tiptap's official Table suite.
        // resizable:true enables column-resize handles; the default
        // header-row layout mirrors Jira's "first row is header" behavior.
        Table.configure({
          // prosemirror-tables' built-in column-resize plugin is
          // RELEASE-ONLY (commits the width on mouseup). For live /
          // real-time column resize like the TableResizeBar, we use
          // our own implementation in TableInteractions instead.
          resizable: false,
          allowTableNodeSelection: true,
          HTMLAttributes: { dir: 'auto' },
        }),
        TableRow,
        TableHeader.configure({ HTMLAttributes: { dir: 'auto' } }),
        TableCell.configure({ HTMLAttributes: { dir: 'auto' } }),
        // Jira-ADF specific node types.
        Panel,
        Status,
        DateNode,
        InlineCard,
        BlockCard,
        // Catch-all fallbacks for any ADF node the editor doesn't
        // natively support — preserved on save via stored adf attr.
        UnsupportedBlock,
        UnsupportedInline,
        Placeholder.configure({
          placeholder: options.placeholder ?? DEFAULT_PLACEHOLDER,
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
        }),
        SmallText,
        Mention,
        SelectionDragCursor,
        TableSelection,
        TableShortcuts,
        CodeBlockHighlight,
        Direction,
        AutoDirection,
      ],
      content: adfToTiptap(options.initialAdf),
      editable: options.editable ?? true,
      autofocus: options.autofocus ?? false,
      onUpdate: ({ editor }) => {
        options.onUpdate?.(editor.getJSON() as TiptapDoc);
      },
      editorProps: {
        attributes: {
          class: 'catalyst-tiptap-editor',
          'data-testid': 'catalyst-description-editor',
        },
        /* 2026-06-17: paste-image support. Walk clipboardData.items for
           files of type image/*, upload via options.onImageUpload, then
           insert each as an image node. Returning true tells ProseMirror
           we handled the event so the default (which drops the binary
           silently because allowBase64=false) is skipped. */
        handlePaste: (view, event) => {
          const upload = options.onImageUpload;
          if (!upload) return false;
          const items = event.clipboardData?.items;
          if (!items || items.length === 0) return false;
          const images: File[] = [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.kind === 'file' && it.type.startsWith('image/')) {
              const f = it.getAsFile();
              if (f) images.push(f);
            }
          }
          if (images.length === 0) return false;
          event.preventDefault();
          (async () => {
            for (const file of images) {
              try {
                const url = await upload(file);
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url, alt: file.name }),
                  ),
                );
              } catch (err) {
                console.error('[Description] paste image upload failed', err);
              }
            }
          })();
          return true;
        },
        /* 2026-06-17: drop-image support — same pipeline as paste so
           dragging a screenshot from the OS into the editor uploads it.
           Mirrors handlePaste so the two surfaces stay in sync. */
        handleDrop: (view, event) => {
          const upload = options.onImageUpload;
          if (!upload) return false;
          const dt = (event as DragEvent).dataTransfer;
          if (!dt || !dt.files || dt.files.length === 0) return false;
          const images: File[] = [];
          for (let i = 0; i < dt.files.length; i++) {
            const f = dt.files[i];
            if (f.type.startsWith('image/')) images.push(f);
          }
          if (images.length === 0) return false;
          event.preventDefault();
          const coords = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY });
          (async () => {
            for (const file of images) {
              try {
                const url = await upload(file);
                const node = view.state.schema.nodes.image.create({ src: url, alt: file.name });
                const tr = coords
                  ? view.state.tr.insert(coords.pos, node)
                  : view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              } catch (err) {
                console.error('[Description] drop image upload failed', err);
              }
            }
          })();
          return true;
        },
      },
    },
    [options.initialAdf],
  );

  return editor;
}
