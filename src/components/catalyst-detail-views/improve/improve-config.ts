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
 * Minimal plain-text → ADF (Atlassian Document Format) paragraph
 * doc. Catalyst's CatalystDescriptionSection writes the description
 * field as `description_adf` (a JSON ADF document). The Improve
 * pipeline emits plain text, so consumers wrap with this helper
 * before calling `supabase.from('ph_issues').update({
 * description_adf: ... })`. Splits on blank lines so multi-paragraph
 * AI output becomes multiple ADF paragraphs.
 */
export function plainTextToAdfDoc(text: string): {
  version: number;
  type: 'doc';
  content: Array<{
    type: 'paragraph';
    content?: Array<{ type: 'text'; text: string }>;
  }>;
} {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { version: 1, type: 'doc', content: [{ type: 'paragraph' }] };
  }
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
  return {
    version: 1,
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text: p }],
    })),
  };
}
