/**
 * Slash menu command registry — Jira's "Insert element" palette.
 *
 * Items match Jira's actual insert palette (toolbar + button + search).
 * Headings / lists are NOT here because they have their own toolbar
 * controls; the slash palette is for non-text blocks (tables, panels,
 * status, etc.).
 *
 * Icon rendering lives in SlashMenu — this file is pure data so the
 * scanner / tests don't pull React.
 */
import type { Editor } from '@tiptap/react';

export type SlashIconId =
  | 'task'
  | 'mention'
  | 'table'
  | 'panel'
  | 'quote'
  | 'decision'
  | 'divider'
  | 'expand'
  | 'date'
  | 'status'
  | 'attachment';

export type SlashIconColor =
  | 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'gray';

export interface SlashCommand {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  iconId: SlashIconId;
  iconColor: SlashIconColor;
  keywords?: string[];
  apply?: (editor: Editor) => void;
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

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'action-items',
    label: 'Action items',
    description: 'A list of action items',
    shortcut: 'Ctrl+Shift+9',
    iconId: 'task', iconColor: 'green',
    keywords: ['task', 'todo', 'action', 'checkbox'],
    apply: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'mention',
    label: 'Mention',
    description: 'Notify someone',
    shortcut: '@',
    iconId: 'mention', iconColor: 'green',
    keywords: ['mention', 'notify', 'user', 'at'],
    // Insert "@" so the inline mention picker opens at the caret.
    apply: (e) => e.chain().focus().insertContent('@').run(),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a table',
    shortcut: 'Shift+Alt+T',
    iconId: 'table', iconColor: 'orange',
    keywords: ['table', 'grid', 'rows', 'columns'],
    apply: (e) =>
      e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'info-panel',
    label: 'Info panel',
    description: 'Highlight information in a colored block',
    iconId: 'panel', iconColor: 'blue',
    keywords: ['panel', 'info', 'note', 'block'],
    apply: (e) => e.chain().focus().setPanel('info').run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Insert a quote or citation',
    shortcut: 'Ctrl+Shift+B',
    iconId: 'quote', iconColor: 'gray',
    keywords: ['quote', 'blockquote', 'citation'],
    apply: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'decision',
    label: 'Decision',
    description: 'Capture a decision',
    shortcut: '<>',
    iconId: 'decision', iconColor: 'purple',
    keywords: ['decision', 'decide', 'choice'],
    // No native Tiptap decisionList — insert as unsupportedBlock so the
    // ADF round-trips back to Jira's decisionList intact.
    apply: (e) =>
      e
        .chain()
        .focus()
        .insertContent({
          type: 'unsupportedBlock',
          attrs: {
            adf: JSON.stringify({
              type: 'decisionList',
              attrs: { localId: generateId() },
              content: [
                {
                  type: 'decisionItem',
                  attrs: { localId: generateId(), state: 'DECIDED' },
                  content: [{ type: 'text', text: 'Decision' }],
                },
              ],
            }),
          },
        })
        .run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Visual line separator',
    iconId: 'divider', iconColor: 'gray',
    keywords: ['divider', 'rule', 'hr', 'separator'],
    apply: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'expand',
    label: 'Expand',
    description: 'Insert an expandable section',
    iconId: 'expand', iconColor: 'blue',
    keywords: ['expand', 'collapse', 'toggle', 'accordion'],
    apply: (e) =>
      e
        .chain()
        .focus()
        .insertContent({
          type: 'unsupportedBlock',
          attrs: {
            adf: JSON.stringify({
              type: 'expand',
              attrs: { title: 'Click to expand' },
              content: [{ type: 'paragraph' }],
            }),
          },
        })
        .run(),
  },
  {
    id: 'date',
    label: 'Date',
    description: 'Insert a date',
    shortcut: '//',
    iconId: 'date', iconColor: 'orange',
    keywords: ['date', 'time', 'calendar'],
    apply: (e) =>
      e
        .chain()
        .focus()
        .insertContent({
          type: 'date',
          attrs: { timestamp: String(Date.now()) },
        })
        .run(),
  },
  {
    id: 'status',
    label: 'Status',
    description: 'Add a custom status label',
    iconId: 'status', iconColor: 'red',
    keywords: ['status', 'lozenge', 'badge', 'tag'],
    apply: (e) =>
      e
        .chain()
        .focus()
        .insertContent({
          type: 'status',
          attrs: { text: 'TO DO', color: 'neutral', localId: generateId() },
        })
        .run(),
  },
  {
    id: 'attachment',
    label: 'Attachments on this work item',
    description: 'Reference an attached file',
    iconId: 'attachment', iconColor: 'gray',
    keywords: ['attachment', 'file', 'upload'],
    // Attachments insertion needs the work-item id from context — wiring
    // deferred. v1 no-op so the item appears in the palette.
    apply: () => {},
  },
];

export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => {
    const hay = [c.label, c.description ?? '', ...(c.keywords ?? [])]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}
