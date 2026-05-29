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
  TableHeader,
  TableCell,
} from '@tiptap/extension-table';

// Table extended with a numeric `width` attribute AND a custom
// NodeView that owns the table DOM. Without the NodeView, the
// underlying @tiptap/extension-table machinery rebuilds the <table>
// on every attribute change and strips our inline width. By owning
// the DOM we apply `width: Npx !important` directly on every update,
// so the user's resize survives every PM transaction and round-trip.
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
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tableWrapper';
      const table = document.createElement('table');
      // Apply the configured HTMLAttributes (dir="auto" etc.) once on
      // creation so the schema-level attrs land on the table tag.
      Object.entries(HTMLAttributes).forEach(([k, v]) => {
        if (k === 'style' || v == null) return;
        table.setAttribute(k, String(v));
      });

      const applyWidth = (n: { attrs: { width?: number | null } }) => {
        const w = n.attrs.width;
        if (typeof w === 'number' && w > 0) {
          table.style.setProperty('width', `${w}px`, 'important');
        } else {
          table.style.removeProperty('width');
        }
      };
      applyWidth(node);

      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      wrapper.appendChild(table);

      return {
        dom: wrapper,
        contentDOM: tbody,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) return false;
          applyWidth(updatedNode);
          return true;
        },
        ignoreMutation(mutation) {
          // Don't let PM see our width style mutations — we own them.
          return (
            mutation.type === 'attributes' &&
            (mutation.target === table || table.contains(mutation.target))
          );
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
import type { AdfDoc, TiptapDoc } from '../utils/adfToTiptap';
import { adfToTiptap } from '../utils/adfToTiptap';

export interface UseTiptapEditorOptions {
  initialAdf: AdfDoc | null | undefined;
  placeholder?: string;
  editable?: boolean;
  onUpdate?: (json: TiptapDoc) => void;
  autofocus?: boolean;
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
            color: '#0C66E4',
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
          codeBlock: { HTMLAttributes: { dir: 'auto' } },
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
          // Per-column resize disabled — it runs updateColumnsOnResize
          // on every transaction and forcibly resets table.style.width,
          // fighting our whole-table width attribute. Whole-table
          // resize via TableResizeBar is the supported affordance.
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
      },
    },
    [options.initialAdf],
  );

  return editor;
}
