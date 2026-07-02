/**
 * Sprint status vocabulary (CAT-SPRINTS-NATIVE-20260702-002 S0.3, D-005).
 *
 * DB CHECK on ph_jira_sprints.status (migration 20260703190000):
 *   planning | active | awaiting_approval | completed | canceled | archived
 *
 * The release vocabulary (in_progress/released/"unreleased") is dead on sprint
 * surfaces. Colors are owned by @atlaskit/lozenge appearances — never pass raw
 * colors from callers.
 */
import type { ReleaseStatus } from '@/types/phase3-releases';

export const SPRINT_STATUSES = [
  'planning',
  'active',
  'awaiting_approval',
  'completed',
  'canceled',
  'archived',
] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export function isSprintStatus(s: string | null | undefined): s is SprintStatus {
  return !!s && (SPRINT_STATUSES as readonly string[]).includes(s);
}

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  awaiting_approval: 'Awaiting approval',
  completed: 'Completed',
  canceled: 'Canceled',
  archived: 'Archived',
};

/** @atlaskit/lozenge appearance per status — the component owns the color. */
export const SPRINT_STATUS_LOZENGE: Record<
  SprintStatus,
  'default' | 'inprogress' | 'moved' | 'success' | 'removed' | 'new'
> = {
  planning: 'default',
  active: 'inprogress',
  awaiting_approval: 'moved',
  completed: 'success',
  canceled: 'removed',
  archived: 'default',
};

/**
 * Allowed lifecycle transitions (enforced in UI from S2.2; advisory before that).
 * planning -> active | canceled
 * active -> awaiting_approval | canceled
 * awaiting_approval -> completed (policy satisfied) | active (rejection reopens)
 * completed -> archived
 * canceled -> archived
 */
export const SPRINT_STATUS_TRANSITIONS: Record<SprintStatus, SprintStatus[]> = {
  planning: ['active', 'canceled'],
  active: ['awaiting_approval', 'canceled'],
  awaiting_approval: ['completed', 'active'],
  completed: ['archived'],
  canceled: ['archived'],
  archived: [],
};

/**
 * TRANSITIONAL (dies with S1.1a/S2.2): lossy bucket mapping into the shared
 * 3-value release cell pipeline (ReleasesTable / ReleaseSidePanel pill+menu
 * logic), which is typed to 'released' | 'unreleased' | 'archived' and is
 * forbidden to fork. Buckets drive menu/eligibility logic only — user-facing
 * labels should come from SPRINT_STATUS_LABEL wherever the call site allows.
 * Unknown values fall to 'unreleased' (the pipeline's historic catch-all).
 */
export function sprintStatusToReleaseBucket(s: string | null | undefined): ReleaseStatus {
  switch (s) {
    case 'completed':
      return 'released';
    case 'canceled':
    case 'archived':
      return 'archived';
    default:
      return 'unreleased'; // planning | active | awaiting_approval | unknown
  }
}
