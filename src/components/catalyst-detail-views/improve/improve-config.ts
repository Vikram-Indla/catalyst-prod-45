/**
 * Improve-config — per-issue-type config for the Improve menu.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2):
 *   Jira's "Improve {type}" dropdown menu has the SAME 5 items across
 *   all issue types (probed live on BAU-5711 / QA Bug and BAU-5470 /
 *   Story — both expose: Improve description / Link Confluence /
 *   Summarize comments / Suggest child work items / Link similar
 *   work items). What differs PER type is the AI prompt context
 *   (system prompt focus) and the trigger label ("Improve QA Bug"
 *   vs "Improve Story" vs "Improve Epic"). The backend
 *   `ai-improve-story` edge function takes an `issue_type` field
 *   and routes to a `PER_TYPE_FOCUS` map; this file owns the
 *   front-end side: trigger label, child-work-item label, and
 *   which menu items are visible per type (Subtask hides
 *   "Suggest child work items" since subtasks can't have children).
 *
 *   Confluence linking is omitted from Catalyst's menu — there is
 *   no Confluence integration yet in this codebase. The remaining
 *   four items map 1:1 to Jira's behaviour.
 */

export type ImproveIssueType =
  | 'Story'
  | 'Epic'
  | 'Feature'
  | 'Task'
  | 'QA Bug'
  | 'Bug'
  | 'Production Incident'
  | 'Incident'
  | 'Subtask'
  | 'Business Request'
  | 'Business Gap'
  | 'API Requirement'
  | 'Change Request'
  | string;

/**
 * Trigger label that appears on the dropdown button — "Improve QA Bug",
 * "Improve Story", etc. Matches Jira's pattern verbatim.
 */
export function improveTriggerLabel(issueType?: string | null): string {
  if (!issueType) return 'Improve';
  // Map a few legacy synonyms to canonical Jira-style labels.
  const canonical: Record<string, string> = {
    Bug: 'QA Bug',
    Incident: 'Production Incident',
  };
  const label = canonical[issueType] ?? issueType;
  return `Improve ${label}`;
}

/**
 * Whether the "Suggest child work items" menu item is visible for a
 * given type. Subtasks can't have children in any tracker we model.
 */
export function canSuggestChildren(issueType?: string | null): boolean {
  if (!issueType) return true;
  return issueType !== 'Subtask';
}

/**
 * Human-readable child-work-item label that appears in suggestion
 * dialogs ("Suggest Stories", "Suggest Tasks", etc.). The backend
 * decides the actual child issue_type — this is for display only.
 */
export function childWorkItemLabel(parentType?: string | null): string {
  const map: Record<string, string> = {
    Epic: 'Stories',
    Feature: 'Stories',
    Story: 'Tasks',
    Task: 'Subtasks',
    Subtask: 'Subtasks',
    'QA Bug': 'Linked tests',
    Bug: 'Linked tests',
    'Production Incident': 'Action items',
    Incident: 'Action items',
    'Business Request': 'Stories',
    'Business Gap': 'Stories',
    'API Requirement': 'Tasks',
    'Change Request': 'Tasks',
  };
  return map[parentType ?? ''] ?? 'Child work items';
}

/**
 * Improvement sub-types — these mirror the existing
 * `IMPROVE_INSTRUCTIONS` map in supabase/functions/ai-improve-story.
 * Default for the dropdown menu's "Improve description" click is
 * `improve_clarify` — the user can change focus via the text box
 * inside the dialog.
 */
export const IMPROVE_SUB_TYPES = [
  { id: 'improve_clarify', label: 'Clarify and rewrite for grammar' },
  { id: 'expand_detail', label: 'Expand into a fuller story' },
  { id: 'add_acceptance_criteria', label: 'Generate acceptance criteria (Given/When/Then)' },
  { id: 'convert_user_story', label: 'Convert to user-story form' },
  { id: 'shorten_focus', label: 'Shorten and sharpen' },
  { id: 'add_edge_cases', label: 'Add edge cases to acceptance criteria' },
] as const;

export type ImproveSubType = (typeof IMPROVE_SUB_TYPES)[number]['id'];

/**
 * Plain-text / lightweight-markdown → ADF (Atlassian Document
 * Format) doc. Catalyst's CatalystDescriptionSection writes the
 * description field as `description_adf` (a JSON ADF document). The
 * Improve pipeline emits plain text — but the LLM frequently uses
 * markdown-style structure (### headings, "- " bullets, "1. " numbered
 * lists, **bold** / *italic* spans) which would collapse to flat
 * paragraphs without parsing.
 *
 * Apr 28, 2026 (cycle 6 follow-up): upgraded from "split on blank
 * lines, wrap each as a paragraph" to a small line-based markdown
 * parser. Recognises:
 *   - `# Heading 1` / `## Heading 2` / `### Heading 3` → heading nodes
 *   - `- bullet` / `* bullet` → bulletList
 *   - `1. item` / `2. item` → orderedList
 *   - `**bold**` text mark "strong"
 *   - `*italic*` / `_italic_` text mark "em"
 *   - Plain lines → paragraph
 * Blank lines separate blocks. Nested lists, code blocks, and
 * tables are NOT parsed (kept simple — AI output rarely uses them
 * for description fields).
 */

type AdfNode = Record<string, unknown>;
type AdfDoc = { version: number; type: 'doc'; content: AdfNode[] };

/** Parse inline `**bold**` and `*italic*` / `_italic_` runs to ADF text nodes. */
function parseInlineMarks(line: string): AdfNode[] {
  const out: AdfNode[] = [];
  // Tokenise on bold / italic boundaries while preserving order.
  // Greedy-bold first (so **a *b* a** doesn't mis-tokenise), then italic.
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;
  let lastIdx = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIdx) {
      out.push({ type: 'text', text: line.slice(lastIdx, match.index) });
    }
    const tok = match[0];
    if (tok.startsWith('**') && tok.endsWith('**')) {
      out.push({ type: 'text', text: tok.slice(2, -2), marks: [{ type: 'strong' }] });
    } else if ((tok.startsWith('*') && tok.endsWith('*')) || (tok.startsWith('_') && tok.endsWith('_'))) {
      out.push({ type: 'text', text: tok.slice(1, -1), marks: [{ type: 'em' }] });
    } else {
      out.push({ type: 'text', text: tok });
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < line.length) {
    out.push({ type: 'text', text: line.slice(lastIdx) });
  }
  return out.length ? out : [{ type: 'text', text: line }];
}

export function plainTextToAdfDoc(text: string): AdfDoc {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { version: 1, type: 'doc', content: [{ type: 'paragraph' }] };
  }
  const lines = trimmed.split(/\r?\n/);
  const blocks: AdfNode[] = [];
  let i = 0;

  const isBullet = (s: string) => /^\s*[-*]\s+/.test(s);
  const isOrdered = (s: string) => /^\s*\d+\.\s+/.test(s);
  const stripBullet = (s: string) => s.replace(/^\s*[-*]\s+/, '');
  const stripOrdered = (s: string) => s.replace(/^\s*\d+\.\s+/, '');

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().length === 0) { i++; continue; }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineMarks(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Bullet list
    if (isBullet(line)) {
      const items: AdfNode[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineMarks(stripBullet(lines[i])) }],
        });
        i++;
      }
      blocks.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list
    if (isOrdered(line)) {
      const items: AdfNode[] = [];
      while (i < lines.length && isOrdered(lines[i])) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineMarks(stripOrdered(lines[i])) }],
        });
        i++;
      }
      blocks.push({ type: 'orderedList', content: items });
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-block-prefix lines.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !isBullet(lines[i]) &&
      !isOrdered(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length) {
      blocks.push({
        type: 'paragraph',
        content: parseInlineMarks(paraLines.join(' ')),
      });
    }
  }

  return { version: 1, type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] };
}
