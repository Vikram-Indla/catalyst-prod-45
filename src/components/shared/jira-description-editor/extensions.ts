import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Highlight from '@tiptap/extension-highlight';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// ── Panel node (info / note / warning / success / error) ──────────────────────
export const Panel = Node.create({
  name: 'panel',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      panelType: {
        default: 'info',
        parseHTML: el => el.getAttribute('data-panel-type'),
        renderHTML: attrs => ({ 'data-panel-type': attrs.panelType }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-panel-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `jde-panel jde-panel--${HTMLAttributes['data-panel-type'] || 'info'}`,
      }),
      0,
    ];
  },
});

// ── Expand node (collapsible section) ─────────────────────────────────────────
export const Expand = Node.create({
  name: 'expand',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: el => el.getAttribute('data-title'),
        renderHTML: attrs => ({ 'data-title': attrs.title }),
      },
      open: {
        default: false,
        parseHTML: el => el.getAttribute('data-open') === 'true',
        renderHTML: attrs => ({ 'data-open': attrs.open ? 'true' : 'false' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-expand]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-expand': '', class: 'jde-expand' }),
      ['div', { class: 'jde-expand__title' }, HTMLAttributes['data-title'] || 'Expand'],
      ['div', { class: 'jde-expand__content' }, 0],
    ];
  },
});

// ── Paste-image plugin (captures paste events with image data) ─────────────────
export function createPasteImagePlugin(onUpload: (file: File) => void) {
  return Extension.create({
    name: 'pasteImage',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('pasteImage'),
          props: {
            handlePaste(_, event) {
              const items = event.clipboardData?.items;
              if (!items) return false;
              for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (file) { onUpload(file); return true; }
                }
              }
              return false;
            },
            handleDrop(_, event) {
              const files = event.dataTransfer?.files;
              if (!files?.length) return false;
              const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
              if (!imgs.length) return false;
              event.preventDefault();
              imgs.forEach(f => onUpload(f));
              return true;
            },
          },
        }),
      ];
    },
  });
}

export function buildExtensions(placeholder: string, onImageUpload: (file: File) => void) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      code: {},
      codeBlock: {},
      blockquote: {},
      horizontalRule: {},
      bulletList: {},
      orderedList: {},
      listItem: {},
      strike: {},
      bold: {},
      italic: {},
      history: {},
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', class: 'jde-link' },
    }),
    Image.configure({ HTMLAttributes: { class: 'jde-media' } }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Panel,
    Expand,
    Placeholder.configure({ placeholder }),
    createPasteImagePlugin(onImageUpload),
  ];
}
