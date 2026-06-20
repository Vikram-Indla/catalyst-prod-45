// Catalyst Replay — business rule engine.
// Pure functions: no I/O, no React, no Supabase. Fully unit-testable.

import type {
  WorkItemTransition,
  ReplayIssue,
  ReplaySegment,
  ReplayDetour,
  ReplayMilestone,
  ReplayAnnotation,
  ReplayLane,
  ReplayOptions,
  ReplayResult,
  StatusCategory,
} from './replayTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_OVERSIGHT_MS = 3_600_000; // 1 hour
const DEFAULT_SCOPE_CREEP_MS = 86_400_000; // 1 day
const DEFAULT_SUBTASK_TYPES = ['Sub-task', 'Backend', 'Frontend', 'Integration', 'API Requirement', 'BRD Task'];

// Canonical BAU status rank (lower = earlier in the workflow).
// Any status not listed falls back to category rank × 100.
const BUILTIN_STATUS_RANK: Record<string, number> = {
  // To Do tier
  'backlog': 10,
  'new': 11,
  'in requirements': 20,
  'intake': 21,
  'demand intake': 22,
  'demand validation': 23,
  // In Progress tier
  'in design': 30,
  'analysis & design': 31,
  'ready for development': 40,
  'in progress': 50,
  'implementation': 51,
  'in qa': 60,
  'ready for qa': 61,
  'review & qa': 62,
  'pending uat/beta': 63,
  'pending uat': 64,
  'beta': 65,
  'ready for production': 70,
  // Done tier
  'done': 100,
  'closed': 101,
  'resolved': 102,
  'released': 103,
  'cancelled': 104,
  'canceled': 104,
};

const CATEGORY_BASE_RANK: Record<string, number> = {
  'To Do': 0,
  'In Progress': 50,
  'Done': 100,
};

// Product hub project keys (vs project-hub project keys).
const PRODUCT_HUB_KEYS = new Set(['MDT', 'MIM', 'INV']);

// ─── Utilities ───────────────────────────────────────────────────────────────

function statusRank(
  statusName: string,
  category: string,
  overrides: Record<string, number>,
): number {
  const key = statusName.toLowerCase().trim();
  if (overrides[key] !== undefined) return overrides[key];
  if (BUILTIN_STATUS_RANK[key] !== undefined) return BUILTIN_STATUS_RANK[key];
  // Fallback: category base
  return (CATEGORY_BASE_RANK[category] ?? 50) + 5;
}

function normalizeCategory(raw: string | null | undefined): StatusCategory {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('done') || s === 'done') return 'Done';
  if (s.includes('to do') || s === 'todo' || s === 'to do') return 'To Do';
  return 'In Progress';
}

function moduleSource(projectKey: string): string {
  return PRODUCT_HUB_KEYS.has(projectKey)
    ? `Product · ${projectKey}`
    : `Project · ${projectKey}`;
}

function hierarchyLevel(issueType: string): number {
  const t = issueType.toLowerCase();
  if (t === 'business request') return 0;
  if (t === 'epic') return 0;
  if (t === 'feature') return 1;
  if (t === 'story') return 1;
  if (t === 'task') return 2;
  // sub-task family
  return 2;
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

function isoToMs(iso: string): number {
  return new Date(iso).getTime();
}

// ─── Core lane builder ────────────────────────────────────────────────────────

function buildLane(
  issue: ReplayIssue,
  transitions: WorkItemTransition[],
  opts: Required<ReplayOptions>,
  parentIssue: ReplayIssue | null,
): ReplayLane {
  // Sort transitions chronologically.
  const sorted = [...transitions].sort(
    (a, b) => isoToMs(a.transitioned_at) - isoToMs(b.transitioned_at),
  );

  const createdMs = issue.jira_created_at ? isoToMs(issue.jira_created_at) : null;
  const nowMs = Date.now();

  // ── Segments ──────────────────────────────────────────────────────────────
  const segments: ReplaySegment[] = [];

  if (sorted.length === 0) {
    // No transitions: single open segment in the issue's initial status.
    if (createdMs) {
      segments.push({
        status: 'Created',
        category: 'To Do',
        startAt: issue.jira_created_at!,
        endAt: null,
        durationMs: nowMs - createdMs,
        transitionedBy: null,
        transitionedByAvatar: null,
      });
    }
  } else {
    // Segment 0: from creation to first transition.
    const firstTransMs = isoToMs(sorted[0].transitioned_at);
    const seg0StartAt = createdMs ? issue.jira_created_at! : sorted[0].transitioned_at;
    const seg0StartMs = createdMs ?? firstTransMs;

    segments.push({
      status: sorted[0].from_status ?? 'Created',
      category: normalizeCategory(sorted[0].from_status_category ?? 'To Do'),
      startAt: seg0StartAt,
      endAt: sorted[0].transitioned_at,
      durationMs: firstTransMs - seg0StartMs,
      transitionedBy: sorted[0].transitioned_by ?? null,
      transitionedByAvatar: sorted[0].transitioned_by_avatar ?? null,
    });

    // Segments 1…n from the transitions.
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      const next = sorted[i + 1] ?? null;
      const segStartMs = isoToMs(t.transitioned_at);
      const segEndMs = next ? isoToMs(next.transitioned_at) : null;

      segments.push({
        status: t.to_status,
        category: normalizeCategory(t.to_status_category),
        startAt: t.transitioned_at,
        endAt: next?.transitioned_at ?? null,
        durationMs: segEndMs !== null ? segEndMs - segStartMs : nowMs - segStartMs,
        transitionedBy: t.transitioned_by ?? null,
        transitionedByAvatar: t.transitioned_by_avatar ?? null,
      });
    }
  }

  // ── Detour detection ──────────────────────────────────────────────────────
  // A detour is a backward move (rank decreases) that persists > oversightToleranceMs.
  const detours: ReplayDetour[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevRank = statusRank(
      prev.to_status,
      prev.to_status_category,
      opts.statusRankOverrides,
    );
    const currRank = statusRank(
      curr.to_status,
      curr.to_status_category,
      opts.statusRankOverrides,
    );

    if (currRank < prevRank) {
      // Backward move found. Find when (if ever) it returns to prevRank or higher.
      const regressionStartMs = isoToMs(curr.transitioned_at);
      let regressionEndMs: number | null = null;

      for (let j = i + 1; j < sorted.length; j++) {
        const futureRank = statusRank(
          sorted[j].to_status,
          sorted[j].to_status_category,
          opts.statusRankOverrides,
        );
        if (futureRank >= prevRank) {
          regressionEndMs = isoToMs(sorted[j].transitioned_at);
          break;
        }
      }

      const durationMs = regressionEndMs !== null
        ? regressionEndMs - regressionStartMs
        : nowMs - regressionStartMs;

      // Oversight tolerance: A→B→A within 1h = user error, not a real regression.
      if (durationMs > opts.oversightToleranceMs) {
        detours.push({
          fromStatus: prev.to_status,
          toStatus: curr.to_status,
          detourStartAt: curr.transitioned_at,
          detourEndAt: regressionEndMs !== null ? msToIso(regressionEndMs) : null,
          durationMs,
        });
      }
    }
  }

  // ── Milestones ────────────────────────────────────────────────────────────
  const milestones: ReplayMilestone[] = [];

  if (issue.release_date) {
    milestones.push({ type: 'release', at: issue.release_date, label: 'Release' });
  }
  if (issue.target_end) {
    milestones.push({ type: 'target_end', at: issue.target_end, label: 'Target end' });
  }
  if (issue.sprint_end_date) {
    milestones.push({ type: 'sprint_end', at: issue.sprint_end_date, label: 'Sprint end' });
  }
  if (
    issue.due_date &&
    !issue.release_date &&
    !issue.sprint_end_date
  ) {
    milestones.push({ type: 'due_date', at: issue.due_date, label: 'Due' });
  }

  // ── Handover annotations ──────────────────────────────────────────────────
  const annotations: ReplayAnnotation[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (
      prev.transitioned_by &&
      curr.transitioned_by &&
      prev.transitioned_by !== curr.transitioned_by
    ) {
      annotations.push({
        type: 'handover',
        at: curr.transitioned_at,
        label: `${prev.transitioned_by} → ${curr.transitioned_by}`,
        fromPerson: prev.transitioned_by,
        toPerson: curr.transitioned_by,
        avatarFrom: prev.transitioned_by_avatar,
        avatarTo: curr.transitioned_by_avatar,
      });
    }
  }

  // ── Scope creep ───────────────────────────────────────────────────────────
  let isScopeCreep = false;
  let scopeCreepDaysAfterParent: number | null = null;

  if (parentIssue && issue.jira_created_at && parentIssue.jira_created_at) {
    const issueCreatedMs = isoToMs(issue.jira_created_at);
    const parentCreatedMs = isoToMs(parentIssue.jira_created_at);
    const deltaMs = issueCreatedMs - parentCreatedMs;
    if (deltaMs > opts.scopeCreepThresholdMs) {
      isScopeCreep = true;
      scopeCreepDaysAfterParent = Math.floor(deltaMs / 86_400_000);
    }
  }

  // ── Overall span ──────────────────────────────────────────────────────────
  const overallStartAt = segments.length > 0 ? segments[0].startAt : issue.jira_created_at ?? null;
  const lastSeg = segments[segments.length - 1];
  const overallEndAt = lastSeg?.endAt ?? null;
  const overallStartMs = overallStartAt ? isoToMs(overallStartAt) : null;
  const overallEndMs = overallEndAt ? isoToMs(overallEndAt) : null;
  const totalDurationMs =
    overallStartMs !== null
      ? (overallEndMs ?? nowMs) - overallStartMs
      : null;

  return {
    issueKey: issue.issue_key,
    issueType: issue.issue_type,
    summary: issue.summary,
    parentKey: issue.parent_key,
    projectKey: issue.project_key,
    moduleSource: moduleSource(issue.project_key),
    hierarchyLevel: hierarchyLevel(issue.issue_type),
    segments,
    detours,
    milestones,
    annotations,
    isScopeCreep,
    scopeCreepDaysAfterParent,
    overallStartAt,
    overallEndAt,
    totalDurationMs,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildReplayResult(
  issues: ReplayIssue[],
  transitions: WorkItemTransition[],
  userOptions: ReplayOptions = {},
): ReplayResult {
  const opts: Required<ReplayOptions> = {
    oversightToleranceMs: userOptions.oversightToleranceMs ?? DEFAULT_OVERSIGHT_MS,
    scopeCreepThresholdMs: userOptions.scopeCreepThresholdMs ?? DEFAULT_SCOPE_CREEP_MS,
    subtaskTypes: userOptions.subtaskTypes ?? DEFAULT_SUBTASK_TYPES,
    statusRankOverrides: userOptions.statusRankOverrides ?? {},
  };

  // Group transitions by work_item_id for O(1) lookup.
  const transitionsByIssueId = new Map<string, WorkItemTransition[]>();
  for (const t of transitions) {
    const bucket = transitionsByIssueId.get(t.work_item_id) ?? [];
    bucket.push(t);
    transitionsByIssueId.set(t.work_item_id, bucket);
  }

  // Build issue lookup for parent resolution.
  const issueByKey = new Map<string, ReplayIssue>();
  for (const iss of issues) issueByKey.set(iss.issue_key, iss);

  // Build lanes — one per issue (sub-tasks per spec are excluded).
  const lanes: ReplayLane[] = [];

  for (const issue of issues) {
    if (opts.subtaskTypes.includes(issue.issue_type)) continue;

    const issueTransitions = transitionsByIssueId.get(issue.id) ?? [];
    const parentIssue = issue.parent_key ? (issueByKey.get(issue.parent_key) ?? null) : null;

    lanes.push(buildLane(issue, issueTransitions, opts, parentIssue));
  }

  // Sort lanes by hierarchy level then by overallStartAt.
  lanes.sort((a, b) => {
    if (a.hierarchyLevel !== b.hierarchyLevel) return a.hierarchyLevel - b.hierarchyLevel;
    const aStart = a.overallStartAt ? isoToMs(a.overallStartAt) : 0;
    const bStart = b.overallStartAt ? isoToMs(b.overallStartAt) : 0;
    return aStart - bStart;
  });

  // Compute overall timeline bounds.
  let minMs = Infinity;
  let maxMs = -Infinity;
  const nowMs = Date.now();

  for (const lane of lanes) {
    if (lane.overallStartAt) minMs = Math.min(minMs, isoToMs(lane.overallStartAt));
    const end = lane.overallEndAt ? isoToMs(lane.overallEndAt) : nowMs;
    maxMs = Math.max(maxMs, end);
  }

  const timelineStart = Number.isFinite(minMs) ? msToIso(minMs) : new Date().toISOString();
  const timelineEnd = Number.isFinite(maxMs) ? msToIso(maxMs) : new Date().toISOString();

  return { lanes, timelineStart, timelineEnd, options: opts };
}

// ─── Convenience: single-issue preview ───────────────────────────────────────
// Used by the detail-view hover entry point (Replay chip → full-screen).

export function buildSingleIssueLane(
  issue: ReplayIssue,
  transitions: WorkItemTransition[],
  userOptions: ReplayOptions = {},
): ReplayLane {
  const opts: Required<ReplayOptions> = {
    oversightToleranceMs: userOptions.oversightToleranceMs ?? DEFAULT_OVERSIGHT_MS,
    scopeCreepThresholdMs: userOptions.scopeCreepThresholdMs ?? DEFAULT_SCOPE_CREEP_MS,
    subtaskTypes: userOptions.subtaskTypes ?? DEFAULT_SUBTASK_TYPES,
    statusRankOverrides: userOptions.statusRankOverrides ?? {},
  };
  return buildLane(issue, transitions, opts, null);
}
