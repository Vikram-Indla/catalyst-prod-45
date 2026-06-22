import { supabase } from "@/integrations/supabase/client";

export interface ReplayCandidate {
  issueKey: string;
  issueType: string;
  summary: string;
  status: string;
  projectKey: string;
  parentKey: string | null;
  sprintName: string | null;
  transitionCount: number;
  childCount: number;
  childrenWithTransitions: number;
  score: number;
}

/**
 * Score a candidate root by real available data.
 * Mirrors the scoring formula in the Phase 1 SQL probe.
 */
function scoreCandidateRow(row: {
  transition_count: number;
  child_count: number;
  children_with_transitions: number;
  sprint_name: string | null;
}): number {
  let s = 0;
  if (row.transition_count > 0) s += 20;
  if (row.child_count >= 4) s += 15;
  if (row.child_count >= 2) s += 20;
  if (row.children_with_transitions >= 2) s += 15;
  if (row.sprint_name) s += 10;
  return s;
}

/**
 * Check transition row count for a project.
 * Returns 0 if project has no issues with transition data.
 */
export async function getProjectTransitionCount(projectKey: string): Promise<number> {
  const { count } = await supabase
    .from("work_item_transitions")
    .select("id", { count: "exact", head: true })
    .in(
      "work_item_id",
      (await supabase
        .from("ph_issues")
        .select("id")
        .eq("project_key", projectKey)
      ).data?.map((r) => r.id) ?? [],
    );
  return count ?? 0;
}

/**
 * Find best live Replay candidate for a given project key.
 * Returns null if no eligible candidates exist.
 *
 * @param rootTypes — issue types to consider as root candidates.
 *   Default: Epic/Story/Feature (project hub).
 *   Product hub (MDT/BR-centric): pass ['Business Request', 'Epic', 'Story', 'Feature'].
 */
export async function selectBestReplayCandidate(
  projectKey: string,
  rootTypes: string[] = ["Epic", "Story", "Feature"],
): Promise<ReplayCandidate | null> {
  const { data: issues } = await supabase
    .from("ph_issues")
    .select("id, issue_key, issue_type, summary, status, project_key, parent_key, sprint_name")
    .eq("project_key", projectKey)
    .in("issue_type", rootTypes)
    .order("jira_created_at", { ascending: true })
    .limit(200);

  if (!issues || issues.length === 0) return null;

  const issueIds = issues.map((i) => i.id);

  // Transition counts per issue
  const { data: transRows } = await supabase
    .from("work_item_transitions")
    .select("work_item_id")
    .in("work_item_id", issueIds);

  const transMap = new Map<string, number>();
  for (const r of transRows ?? []) {
    transMap.set(r.work_item_id, (transMap.get(r.work_item_id) ?? 0) + 1);
  }

  // Child counts: for each issue, count children from ph_issues
  const issueKeys = issues.map((i) => i.issue_key);
  const { data: childRows } = await supabase
    .from("ph_issues")
    .select("id, parent_key")
    .in("parent_key", issueKeys);

  const childCountMap = new Map<string, number>();
  const childIdsByParent = new Map<string, string[]>();
  for (const c of childRows ?? []) {
    if (!c.parent_key) continue;
    childCountMap.set(c.parent_key, (childCountMap.get(c.parent_key) ?? 0) + 1);
    const arr = childIdsByParent.get(c.parent_key) ?? [];
    arr.push(c.id);
    childIdsByParent.set(c.parent_key, arr);
  }

  // Transitions among children
  const allChildIds = (childRows ?? []).map((c) => c.id);
  const childTransMap = new Map<string, number>();
  if (allChildIds.length > 0) {
    const { data: childTransRows } = await supabase
      .from("work_item_transitions")
      .select("work_item_id")
      .in("work_item_id", allChildIds);
    for (const r of childTransRows ?? []) {
      childTransMap.set(r.work_item_id, (childTransMap.get(r.work_item_id) ?? 0) + 1);
    }
  }

  // Score each candidate
  const candidates: ReplayCandidate[] = issues.map((i) => {
    const childIds = childIdsByParent.get(i.issue_key) ?? [];
    const childrenWithTransitions = childIds.filter((cid) => (childTransMap.get(cid) ?? 0) > 0).length;
    const row = {
      transition_count: transMap.get(i.id) ?? 0,
      child_count: childCountMap.get(i.issue_key) ?? 0,
      children_with_transitions: childrenWithTransitions,
      sprint_name: i.sprint_name,
    };
    return {
      issueKey: i.issue_key,
      issueType: i.issue_type,
      summary: i.summary ?? "",
      status: i.status ?? "",
      projectKey: i.project_key ?? projectKey,
      parentKey: i.parent_key,
      sprintName: i.sprint_name,
      transitionCount: row.transition_count,
      childCount: row.child_count,
      childrenWithTransitions,
      score: scoreCandidateRow(row),
    };
  });

  // Must have own transitions OR children with transitions
  const eligible = candidates.filter(
    (c) => c.transitionCount > 0 || c.childrenWithTransitions > 0,
  );
  if (eligible.length === 0) return null;

  // Highest score wins; ties broken by childrenWithTransitions then transitionCount
  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.childrenWithTransitions !== a.childrenWithTransitions)
      return b.childrenWithTransitions - a.childrenWithTransitions;
    return b.transitionCount - a.transitionCount;
  });

  return eligible[0];
}
