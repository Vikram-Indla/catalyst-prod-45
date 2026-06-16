/**
 * incidentsBacklogDataSource — adapter that lets the canonical BacklogPage
 * render Production Incidents using the same chrome as
 * /project-hub/BAU/backlog: same JiraTable, same column picker, same column
 * filters, same toolbar.
 *
 * 2026-06-16 — incidents are Jira-sourced (read-only in Catalyst). Mutations
 * are no-ops that reject with a friendly message so BacklogPage's inline
 * edits / delete / create / drag-to-rank all surface the same "read-only"
 * warning. Per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT REIMPLEMENT".
 *
 * Source tag: we reuse BIZ_SOURCE ('biz') because BacklogPage's "adapter
 * routing" checks are all keyed on it. Override `onOpenItem` so clicking a
 * row opens the incident detail page (not the BR detail).
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LozengeAppearance, StatusOption } from '@/components/shared/JiraTable';
import { useIncidentListView } from '@/hooks/useIncidentHub';
import {
  BIZ_SOURCE,
  type BacklogDataSource,
} from '@/modules/project-work-hub/adapters/backlogDataSource';
import type { BacklogStory } from '@/modules/project-work-hub/types/backlog.types';

/* ── Incident status vocabulary ─────────────────────────────────────────
   Mirrors useIncidentListView.mapStatus output. Order = canonical workflow
   order (open → resolved). */
const INCIDENT_STATUSES = [
  'open', 'triage', 'in_progress', 'to_committee', 'resolved',
] as const;
type IncidentStatus = typeof INCIDENT_STATUSES[number];

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  triage: 'Triage',
  in_progress: 'In Progress',
  to_committee: 'Committee',
  resolved: 'Resolved',
};

function incidentStatusAppearance(s: string | null | undefined): LozengeAppearance {
  if (!s) return 'default';
  const k = String(s).toLowerCase();
  if (k === 'resolved' || k === 'closed' || k === 'done') return 'success';
  if (k === 'in_progress' || k === 'triage' || k === 'to_committee') return 'inprogress';
  if (k === 'open') return 'removed';
  return 'default';
}

const READ_ONLY_MSG =
  'Incidents are Jira-sourced. Use Jira to update incident fields. Read-only here.';

function incidentToBacklogStory(r: any): BacklogStory {
  return {
    id: r.incident_key ?? r.id,            // display key (e.g. 'BAU-1234')
    story_key: r.incident_key ?? r.id,
    title: r.title ?? '',
    name: r.title ?? null,
    description: r.description ?? null,
    status: r.status ?? 'open',
    feature_id: null,
    assignee_id: null,
    assignee_name: r.assignee_name ?? null,
    reporter_name: r.reporter_name ?? null,
    start_date: null,
    priority: r.priority ? String(r.priority).toLowerCase() : null,
    deleted_at: null,
    jira_created_at: r.created_at ?? null,
    jira_updated_at: r.updated_at ?? null,
    /* Use BIZ_SOURCE so BacklogPage routes mutations to this adapter and
       doesn't try to update ph_issues directly. */
    source: BIZ_SOURCE as any,
    issue_type: r.issue_type ?? 'Production Incident',
    parent_key: r.parent_key ?? null,
    parent_summary: r.parent_summary ?? null,
    labels: Array.isArray(r.labels) ? r.labels : null,
    sprint_release: null,
    rank_order: null,
    feature: null,
  } as any;
}

/**
 * useIncidentsBacklogSource — pass to <BacklogPage dataSource={...} />.
 * Returns null until the first incident fetch completes so BacklogPage
 * doesn't paint an empty grid mid-load.
 */
export function useIncidentsBacklogSource(): BacklogDataSource | null {
  const navigate = useNavigate();
  const { data: incidents = [], isLoading } = useIncidentListView();

  const extraStories: BacklogStory[] = useMemo(
    () => (incidents as any[]).map(incidentToBacklogStory),
    [incidents],
  );

  const statusOptions: StatusOption[] = useMemo(
    () => INCIDENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
    [],
  );

  return useMemo<BacklogDataSource | null>(() => ({
    sourceTag: BIZ_SOURCE,
    extraStories,
    extraEpics: [],
    isLoading,

    statusOptions,
    statusAppearance: incidentStatusAppearance,
    statusLabel: (s) => STATUS_LABEL[String(s ?? '').toLowerCase()] ?? String(s ?? '—'),
    allStatuses: [...INCIDENT_STATUSES],

    /* Click-through: open the incident detail page, not the BR detail. */
    onOpenItem: (key) => {
      if (key) navigate(`/incident-hub/${key}`);
    },

    /* All mutations are no-ops — incidents are Jira-sourced and read-only
       in Catalyst. The Promise rejects with a friendly message so the
       table can surface "Read-only" toasts when the user tries to edit. */
    onUpdate: async () => { throw new Error(READ_ONLY_MSG); },
    onDelete: async () => { throw new Error(READ_ONLY_MSG); },
    onBulkDelete: async () => { throw new Error(READ_ONLY_MSG); },
    onCreate: async () => { throw new Error(READ_ONLY_MSG); },
    onSetRank: async () => { throw new Error(READ_ONLY_MSG); },

    invalidationKeys: [['incident-hub-list']] as const,

    /* No chrome override — BacklogPage renders its default header chip.
       allowedColumnIds left undefined → all standard columns are pickable. */
    productId: 'incidents',
  }), [extraStories, isLoading, statusOptions, navigate]);
}
