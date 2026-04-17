/**
 * Parent → allowed-child-type rules.
 *
 * Mirrors Jira's creation rules so an Epic can no longer create a Sub-task
 * from our inline "+" / ⇧C flow. Called by SubtasksPanel before the TypeSelector
 * is rendered.
 *
 * Source: Jira Cloud documentation, confirmed by reviewer feedback on the
 * Epic → Sub-task business-rule failure seen in BAU-4771 screenshots.
 */

const ALL_TYPES = [
  'Epic',
  'Story',
  'Feature',
  'New Feature',
  'Task',
  'Improvement',
  'Bug',
  'QA Bug',
  'Business Request',
  'Business Gap',
  'Incident',
  'Production Incident',
  'Problem',
  'Change Request',
  'Question',
  'Issue',
  'Sub-task',
  'Backend',
  'Frontend',
  'Figma',
  'Integration',
  'API Requirement',
] as const;

export type WorkItemType = typeof ALL_TYPES[number];

const SUBTASK_FAMILY: WorkItemType[] = [
  'Sub-task',
  'Backend',
  'Frontend',
  'Figma',
  'Integration',
  'API Requirement',
];

const STORY_LEVEL: WorkItemType[] = [
  'Story',
  'Feature',
  'New Feature',
  'Task',
  'Improvement',
  'Bug',
  'QA Bug',
];

const EPIC_CHILDREN: WorkItemType[] = STORY_LEVEL;

const BR_CHILDREN: WorkItemType[] = ['Story', 'Task', 'Feature', 'New Feature'];

const INCIDENT_CHILDREN: WorkItemType[] = ['Task', ...SUBTASK_FAMILY];

/**
 * Return the ordered list of allowed child issue types for a given parent type.
 * Empty array means "creation is blocked" (e.g. Sub-task → no further children).
 * The first element (if any) is the sensible default selection.
 */
export function allowedChildTypes(parentType: string | null | undefined): WorkItemType[] {
  const p = (parentType ?? '').trim().toLowerCase();
  if (!p) return STORY_LEVEL.concat(SUBTASK_FAMILY); // unknown parent — permissive

  if (p === 'epic') return EPIC_CHILDREN;
  if (p === 'business request' || p === 'business gap') return BR_CHILDREN;
  if (p.includes('incident') || p === 'problem') return INCIDENT_CHILDREN;

  // Sub-task family → no further children (Jira blocks this)
  if (SUBTASK_FAMILY.some(t => t.toLowerCase() === p)) return [];

  // Story / Task / Bug / Feature / Improvement → sub-task family
  if (STORY_LEVEL.some(t => t.toLowerCase() === p)) return SUBTASK_FAMILY;

  // Fallback — treat unknown story-level as story-level
  return SUBTASK_FAMILY;
}

/**
 * Panel title — Jira uses "Child work items" under Epics and "Subtasks"
 * under story-level items.
 */
export function panelTitleFor(parentType: string | null | undefined): string {
  const p = (parentType ?? '').trim().toLowerCase();
  if (p === 'epic') return 'Child work items';
  return 'Subtasks';
}

/**
 * Is creation of any child allowed under this parent?
 */
export function canCreateChild(parentType: string | null | undefined): boolean {
  return allowedChildTypes(parentType).length > 0;
}
