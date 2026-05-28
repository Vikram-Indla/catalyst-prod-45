/**
 * ViewMoreModal element registry — Jira "Browse elements" palette.
 *
 * Items grouped by tab (categories[]) so a single registry feeds all
 * five tabs. Apply functions are inline where the editor can handle
 * them locally; items that need external context (Ask Caty, Attachments,
 * Confluence integrations) have externalAction ids that the parent
 * component routes.
 */
import type { Editor } from '@tiptap/react';

export type ModalIconId =
  | 'caty' | 'task' | 'image' | 'mention' | 'emoji' | 'expand'
  | 'table' | 'code' | 'status' | 'panel' | 'date' | 'decision'
  | 'bullet-list' | 'link' | 'number-list' | 'divider'
  | 'heading' | 'help' | 'attachment' | 'confluence' | 'dropbox'
  | 'create-page' | 'assets';

export type ModalIconColor =
  | 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'gray' | 'pink' | 'brand';

export type ModalCategory =
  | 'all' | 'caty' | 'confluence' | 'external' | 'development';

export type ExternalAction = 'ask-caty' | 'help' | 'attachments' | 'confluence' | 'create-page';

export interface ModalElement {
  id: string;
  label: string;
  description: string;
  iconId: ModalIconId;
  iconColor: ModalIconColor;
  /** For the heading variant — passed to the heading icon. */
  iconText?: string;
  categories: ModalCategory[];
  /** Inline editor-only action. */
  apply?: (editor: Editor) => void;
  /** Action routed by the parent (needs more context than the editor). */
  externalAction?: ExternalAction;
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fallthrough */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const MODAL_ELEMENTS: ModalElement[] = [
  {
    id: 'ask-caty',
    label: 'Ask Caty',
    description: 'Draft or improve content with AI',
    iconId: 'caty', iconColor: 'brand',
    categories: ['all', 'caty'],
    externalAction: 'ask-caty',
  },
  {
    id: 'action-items',
    label: 'Action items',
    description: 'Capture work to be done',
    iconId: 'task', iconColor: 'green',
    categories: ['all'],
    apply: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Upload or embed an image',
    iconId: 'image', iconColor: 'orange',
    categories: ['all'],
    // Inline image insert via URL prompt — for full upload use the toolbar.
    apply: (e) => {
      const url = window.prompt('Image URL', 'https://');
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
  },
  {
    id: 'mention',
    label: 'Mention',
    description: 'Notify someone',
    iconId: 'mention', iconColor: 'green',
    categories: ['all'],
    apply: (e) => e.chain().focus().insertContent('@').run(),
  },
  {
    id: 'emoji',
    label: 'Emoji',
    description: 'Add an emoji',
    iconId: 'emoji', iconColor: 'orange',
    categories: ['all'],
    apply: (e) => e.chain().focus().insertContent(':').run(),
  },
  {
    id: 'expand',
    label: 'Expand',
    description: 'Add an expandable section',
    iconId: 'expand', iconColor: 'blue',
    categories: ['all'],
    apply: (e) =>
      e.chain().focus().insertContent({
        type: 'unsupportedBlock',
        attrs: {
          adf: JSON.stringify({
            type: 'expand',
            attrs: { title: 'Click to expand' },
            content: [{ type: 'paragraph' }],
          }),
        },
      }).run(),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a table',
    iconId: 'table', iconColor: 'orange',
    categories: ['all'],
    apply: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'code',
    label: 'Code snippet',
    description: 'Display code with syntax',
    iconId: 'code', iconColor: 'gray',
    categories: ['all', 'development'],
    apply: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'status',
    label: 'Status',
    description: 'Custom colored status label',
    iconId: 'status', iconColor: 'red',
    categories: ['all'],
    apply: (e) =>
      e.chain().focus().insertContent({
        type: 'status',
        attrs: { text: 'TO DO', color: 'neutral', localId: generateId() },
      }).run(),
  },
  {
    id: 'panel-info',
    label: 'Info panel',
    description: 'Blue informational block',
    iconId: 'panel', iconColor: 'blue',
    categories: ['all'],
    apply: (e) => e.chain().focus().setPanel('info').run(),
  },
  {
    id: 'date',
    label: 'Date',
    description: 'Insert a date',
    iconId: 'date', iconColor: 'orange',
    categories: ['all'],
    apply: (e) =>
      e.chain().focus().insertContent({
        type: 'date', attrs: { timestamp: String(Date.now()) },
      }).run(),
  },
  {
    id: 'decision',
    label: 'Decision',
    description: 'Capture a decision',
    iconId: 'decision', iconColor: 'purple',
    categories: ['all'],
    apply: (e) =>
      e.chain().focus().insertContent({
        type: 'unsupportedBlock',
        attrs: {
          adf: JSON.stringify({
            type: 'decisionList',
            attrs: { localId: generateId() },
            content: [{
              type: 'decisionItem',
              attrs: { localId: generateId(), state: 'DECIDED' },
              content: [{ type: 'text', text: 'Decision' }],
            }],
          }),
        },
      }).run(),
  },
  {
    id: 'panel-note',
    label: 'Note panel',
    description: 'Purple note block',
    iconId: 'panel', iconColor: 'purple',
    categories: ['all'],
    apply: (e) => e.chain().focus().setPanel('note').run(),
  },
  {
    id: 'panel-success',
    label: 'Success panel',
    description: 'Green success block',
    iconId: 'panel', iconColor: 'green',
    categories: ['all'],
    apply: (e) => e.chain().focus().setPanel('success').run(),
  },
  {
    id: 'panel-warning',
    label: 'Warning panel',
    description: 'Yellow warning block',
    iconId: 'panel', iconColor: 'orange',
    categories: ['all'],
    apply: (e) => e.chain().focus().setPanel('warning').run(),
  },
  {
    id: 'panel-error',
    label: 'Error panel',
    description: 'Red error block',
    iconId: 'panel', iconColor: 'red',
    categories: ['all'],
    apply: (e) => e.chain().focus().setPanel('error').run(),
  },
  {
    id: 'bullet-list',
    label: 'Bullet list',
    description: 'Unordered list',
    iconId: 'bullet-list', iconColor: 'gray',
    categories: ['all'],
    apply: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'link',
    label: 'Link',
    description: 'Add a link',
    iconId: 'link', iconColor: 'blue',
    categories: ['all'],
    apply: (e) => {
      const url = window.prompt('Enter URL', 'https://');
      if (url) e.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    },
  },
  {
    id: 'number-list',
    label: 'Numbered list',
    description: 'Ordered list',
    iconId: 'number-list', iconColor: 'gray',
    categories: ['all'],
    apply: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal line separator',
    iconId: 'divider', iconColor: 'gray',
    categories: ['all'],
    apply: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  ...([1, 2, 3, 4, 5, 6] as const).map((level): ModalElement => ({
    id: `h${level}`,
    label: `Heading ${level}`,
    description: `Level ${level} section heading`,
    iconId: 'heading', iconColor: 'gray',
    iconText: `H${level}`,
    categories: ['all'],
    apply: (e) => e.chain().focus().setHeading({ level }).run(),
  })),
  {
    id: 'help',
    label: 'Help',
    description: 'Open help & shortcuts',
    iconId: 'help', iconColor: 'gray',
    categories: ['all'],
    externalAction: 'help',
  },
  {
    id: 'attachment',
    label: 'Attachment on this work item',
    description: 'Reference an attached file',
    iconId: 'attachment', iconColor: 'gray',
    categories: ['all'],
    externalAction: 'attachments',
  },
  {
    id: 'confluence-content-list',
    label: 'Confluence content list',
    description: 'Embed a Confluence page list',
    iconId: 'confluence', iconColor: 'blue',
    categories: ['all', 'confluence'],
    externalAction: 'confluence',
  },
  {
    id: 'insert-confluence-list',
    label: 'Insert Confluence list',
    description: 'Insert a curated Confluence list',
    iconId: 'confluence', iconColor: 'blue',
    categories: ['all', 'confluence'],
    externalAction: 'confluence',
  },
  {
    id: 'create-confluence-page',
    label: 'Create Confluence page',
    description: 'Start a new Confluence doc',
    iconId: 'create-page', iconColor: 'blue',
    categories: ['all', 'confluence'],
    externalAction: 'create-page',
  },
  {
    id: 'dropbox',
    label: 'Dropbox',
    description: 'Embed a Dropbox file',
    iconId: 'dropbox', iconColor: 'blue',
    categories: ['all', 'external'],
    externalAction: 'confluence',
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'Insert from Atlassian Assets',
    iconId: 'assets', iconColor: 'gray',
    categories: ['all'],
    externalAction: 'confluence',
  },
];

export function filterModalElements(
  category: ModalCategory,
  query: string,
): ModalElement[] {
  const q = query.trim().toLowerCase();
  return MODAL_ELEMENTS.filter((el) => {
    if (!el.categories.includes(category)) return false;
    if (!q) return true;
    const hay = [el.label, el.description].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export const MODAL_TABS: { id: ModalCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'caty', label: 'Ask Caty' },
  { id: 'confluence', label: 'Confluence Content' },
  { id: 'external', label: 'External Content' },
  { id: 'development', label: 'Development' },
];
