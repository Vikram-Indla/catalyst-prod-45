import { supabase } from "@/integrations/supabase/client";
import type { ReplayJourney, ReplayLane, ReplayWorkItemType } from "./liveReplayTypes";
import { mapReplayStatusCategory } from "./mapReplayStatusCategory";
import type { ReplayCandidate } from "./selectReplayCandidates";

// Subtask types excluded from Replay lanes (mirrors replay-narrate/index.ts).
// BRD Task intentionally excluded from this set — MDT Business Requests use
// BRD Tasks as their primary child items (BR → BRD Task hierarchy), so they
// must appear as Replay lanes. All other micro-task types remain excluded.
const SUBTASK_TYPES = new Set([
  "Sub-task", "Backend", "Frontend", "Integration",
  "API Requirement",
]);

// Types the HTML engine renders with known colours
const RENDERABLE_TYPES = new Set<ReplayWorkItemType>([
  "Business Request", "Epic", "Story",
  "QA Bug", "Production Incident", "Change Request",
]);

function toReplayType(issueType: string): ReplayWorkItemType {
  if (RENDERABLE_TYPES.has(issueType as ReplayWorkItemType))
    return issueType as ReplayWorkItemType;
  // Map Catalyst types → nearest HTML engine type
  if (issueType === "Task" || issueType === "Feature") return "Story";
  if (issueType === "Defect") return "QA Bug";
  if (issueType === "Production Incident") return "Production Incident";
  return "Story";
}

interface PhIssueRow {
  id: string;
  issue_key: string;
  issue_type: string;
  summary: string | null;
  status: string | null;
  status_category: string | null;
  assignee_display_name: string | null;
  reporter_display_name: string | null;
  parent_key: string | null;
  sprint_name: string | null;
  jira_created_at: string | null;
}

interface TransitionRow {
  work_item_id: string;
  from_status: string | null;
  to_status: string;
  from_status_category: string | null;
  to_status_category: string;
  transitioned_by: string;
  transitioned_at: string;
}

/**
 * Build a live ReplayJourney from real DB data for the given root issue key.
 * Never fabricates history; uses silence (empty lane or omission) when data absent.
 */
export async function buildLiveReplayJourney(
  rootCandidate: ReplayCandidate,
): Promise<ReplayJourney> {
  const warnings: string[] = [];
  const sourceTables: string[] = ["ph_issues"];

  // 1. Collect hierarchy: root + all descendants (BFS, max depth 4)
  const rootKey = rootCandidate.issueKey;
  const visited = new Set<string>([rootKey]);
  const queue = [rootKey];
  const allKeys: string[] = [rootKey];

  for (let depth = 0; depth < 4 && queue.length > 0; depth++) {
    const batch = [...queue];
    queue.length = 0;
    const { data: children } = await supabase
      .from("ph_issues")
      .select("issue_key")
      .in("parent_key", batch)
      .not("issue_type", "in", `(${[...SUBTASK_TYPES].map((t) => `"${t}"`).join(",")})`)
      .limit(50);
    for (const c of children ?? []) {
      if (!visited.has(c.issue_key)) {
        visited.add(c.issue_key);
        queue.push(c.issue_key);
        allKeys.push(c.issue_key);
      }
    }
  }

  // 2. Fetch full issue rows
  const { data: issues } = await supabase
    .from("ph_issues")
    .select(
      "id, issue_key, issue_type, summary, status, status_category, " +
      "assignee_display_name, reporter_display_name, parent_key, " +
      "sprint_name, jira_created_at",
    )
    .in("issue_key", allKeys);

  const issueMap = new Map<string, PhIssueRow & { id: string }>();
  for (const i of issues ?? []) issueMap.set(i.issue_key, i as PhIssueRow & { id: string });

  // 3. Fetch transitions for all issues in hierarchy
  const issueIds = [...issueMap.values()].map((i) => i.id);
  const transitionsByIssueId = new Map<string, TransitionRow[]>();

  if (issueIds.length > 0) {
    const { data: transitions } = await supabase
      .from("work_item_transitions")
      .select(
        "work_item_id, from_status, to_status, from_status_category, " +
        "to_status_category, transitioned_by, transitioned_at",
      )
      .in("work_item_id", issueIds)
      .order("transitioned_at", { ascending: true });

    for (const t of transitions ?? []) {
      const arr = transitionsByIssueId.get(t.work_item_id) ?? [];
      arr.push(t as TransitionRow);
      transitionsByIssueId.set(t.work_item_id, arr);
    }
    if ((transitions ?? []).length > 0) sourceTables.push("work_item_transitions");
  }

  // 4. Check assignee history (work_item_changelogs)
  const { count: changelogCount } = await supabase
    .from("work_item_changelogs")
    .select("id", { count: "exact", head: true })
    .in("work_item_id", issueIds)
    .eq("field_name", "assignee");
  const missingAssigneeHistory = (changelogCount ?? 0) === 0;
  if (!missingAssigneeHistory) sourceTables.push("work_item_changelogs");

  // 5. Build lanes
  const lanes: ReplayLane[] = [];

  for (const key of allKeys) {
    const issue = issueMap.get(key);
    if (!issue) continue;
    if (SUBTASK_TYPES.has(issue.issue_type)) continue;

    const issueTransitions = transitionsByIssueId.get(issue.id) ?? [];
    const hasTransitions = issueTransitions.length > 0;

    // Build event list
    const ev: ReplayLane["ev"] = [];

    if (hasTransitions) {
      // Add creation event from first transition's from_status (if available)
      const firstT = issueTransitions[0];
      if (firstT.from_status && issue.jira_created_at) {
        ev.push([
          issue.jira_created_at,
          firstT.from_status,
          mapReplayStatusCategory(firstT.from_status, firstT.from_status_category),
          "Jira",
          undefined,
          issue.assignee_display_name ?? undefined,
        ]);
      }

      for (const t of issueTransitions) {
        ev.push([
          t.transitioned_at,
          t.to_status,
          mapReplayStatusCategory(t.to_status, t.to_status_category),
          t.transitioned_by || "Jira",
          t.from_status ?? undefined,
          undefined, // assignee history not available — missingAssigneeHistory = true
        ]);
      }
    } else {
      // No transition history: current-state-only lane
      if (issue.jira_created_at && issue.status) {
        ev.push([
          issue.jira_created_at,
          issue.status,
          mapReplayStatusCategory(issue.status, issue.status_category),
          issue.assignee_display_name ?? "Unknown",
          undefined,
          issue.assignee_display_name ?? undefined,
        ]);
        warnings.push(
          `No transition history for ${key}; current-state only.`,
        );
      } else {
        // Skip — no usable data at all
        continue;
      }
    }

    // Sprint: current snapshot only, no history
    const sprint = issue.sprint_name
      ? { name: issue.sprint_name }
      : undefined;

    lanes.push({
      key: issue.issue_key,
      type: toReplayType(issue.issue_type),
      parent: issue.parent_key,
      reporter: issue.reporter_display_name ?? undefined,
      sum: issue.summary ?? issue.issue_key,
      sprint,
      // release omitted — fix_versions column absent from live DB
      ev,
    });
  }

  // 6. Determine fidelity
  const totalIssues = allKeys.length;
  const issuesWithTransitions = [...issueMap.values()].filter(
    (i) => (transitionsByIssueId.get(i.id) ?? []).length > 0,
  ).length;

  let fidelity: ReplayJourney["dataQuality"]["fidelity"] = "not-eligible";
  if (issuesWithTransitions === 0) {
    fidelity = lanes.length > 0 ? "current-state-only" : "not-eligible";
  } else if (issuesWithTransitions === totalIssues) {
    fidelity = "full-history";
  } else {
    fidelity = "partial-history";
  }

  const eligible = lanes.length > 0;

  const root = issueMap.get(rootKey);

  return {
    mode: "live",
    rootKey,
    rootTitle: root?.summary ?? rootKey,
    projectKey: rootCandidate.projectKey,
    generatedAt: new Date().toISOString(),
    lanes,
    dataQuality: {
      eligible,
      fidelity,
      missingSprintHistory: true, // ph_issues has current sprint only
      missingReleaseData: true,   // fix_versions absent from live DB
      missingStatusHistory: issuesWithTransitions === 0,
      missingAssigneeHistory,
      warnings,
      sourceTables,
    },
  };
}
