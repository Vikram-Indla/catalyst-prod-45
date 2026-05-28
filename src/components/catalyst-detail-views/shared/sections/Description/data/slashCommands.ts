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
  | 'attachment'
  | 'caty';

export type SlashIconColor =
  | 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'gray' | 'brand';

export type SlashExternalAction = 'ask-caty';

export interface SlashCommand {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  iconId: SlashIconId;
  iconColor: SlashIconColor;
  keywords?: string[];
  /** Editor-only inline action. */
  apply?: (editor: Editor) => void;
  /** Parent-handled action (Ask Caty etc.) that needs context outside the editor. */
  externalAction?: SlashExternalAction;
}

const ASK_CATY: SlashCommand = {
  id: 'ask-caty',
  label: 'Ask Caty',
  description: 'Draft or improve with AI',
  iconId: 'caty',
  iconColor: 'brand',
  keywords: ['ai', 'caty', 'improve'],
  externalAction: 'ask-caty',
};

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
  // `/ai` (or anything starting with "ai") promotes Ask Caty to the top
  // of the list. Ask Caty is NOT in the default list when query is empty.
  const promoteCaty = q.length > 0 && 'ai'.startsWith(q.slice(0, 2)) === false
    ? q.startsWith('ai')
    : q.startsWith('a');
  // Simplified: just show Ask Caty whenever the typed query is a prefix
  // of 'ai' / 'ask' / 'caty' (so a single `a`, `ai`, `as`, `c`, etc.
  // all surface it).
  const surfaceCaty =
    q.length > 0 &&
    ('ai'.startsWith(q) || 'ask'.startsWith(q) || 'caty'.startsWith(q));

  const base = SLASH_COMMANDS.filter((c) => {
    if (!q) return true;
    const hay = [c.label, c.description ?? '', ...(c.keywords ?? [])]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  // Silence the unused vars from the experiment branch above.
  void promoteCaty;

  return surfaceCaty ? [ASK_CATY, ...base] : base;
}
