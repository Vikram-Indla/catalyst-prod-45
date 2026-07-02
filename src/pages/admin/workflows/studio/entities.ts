/** Workflow Studio shared entity taxonomy + display helpers. */

export interface EntityDef {
  key: string;
  label: string;
  readOnly?: boolean; // date-driven lifecycles render, never edit
}

export const ENTITY_GROUPS: { label: string; entities: EntityDef[] }[] = [
  {
    label: 'Standard',
    entities: [
      { key: 'story', label: 'Story' },
      { key: 'epic', label: 'Epic' },
      { key: 'feature', label: 'Feature' },
      { key: 'task', label: 'Task' },
    ],
  },
  {
    label: 'QA',
    entities: [
      { key: 'defect', label: 'Defect' },
      { key: 'incident', label: 'Incident' },
    ],
  },
  {
    label: 'Business',
    entities: [
      { key: 'business_request', label: 'Business Request' },
      { key: 'product_milestone', label: 'Milestone' },
      { key: 'release', label: 'Release' },
      { key: 'sprint', label: 'Sprint', readOnly: true },
    ],
  },
  {
    label: 'Subtasks',
    entities: [{ key: 'subtask', label: 'Sub-task' }],
  },
];

export const ENTITY_LABELS: Record<string, string> = Object.fromEntries(
  ENTITY_GROUPS.flatMap((g) => g.entities.map((e) => [e.key, e.label]))
);

export const LIFECYCLE_APPEARANCE: Record<string, 'success' | 'inprogress' | 'default' | 'removed'> = {
  published: 'success',
  draft: 'inprogress',
  superseded: 'default',
  archived: 'removed',
};

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Derive a stable status_key from a display label. */
export function statusKeyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
