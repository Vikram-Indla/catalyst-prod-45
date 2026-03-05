/**
 * R360 Criticality Service — Role-Aware Artifact Scoring
 * Pure SQL + math. No AI/LLM calls.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveRoleCode, ROLE_PRIMARY_ARTIFACTS } from '@/constants/r360RoleMapping';

// ─── Types ──────────────────────────────────────────────────

export interface ArtifactContribution {
  artifactType: string;
  count: number;
  affinityWeight: number;
  recencyDecay: number;
  weightedScore: number;
  release: string;
}

export interface PeerComparisonRow {
  peerId: string;
  peerName: string;
  totalScore: number;
  isCurrentResource: boolean;
  metricsByArtifact: Record<string, number>;
}

export interface CriticalityResult {
  rawScore: number;
  percentile: number;
  label: 'Anchor Resource' | 'Critical Resource' | 'Core Contributor' | 'Active Contributor' | 'Developing';
  irreplaceabilityRatio: number;
  isSinglePointOfFailure: boolean;
  artifactBreakdown: ArtifactContribution[];
  peerComparison: PeerComparisonRow[];
  primaryArtifacts: string[];
  computedAt: string;
}

// ─── Label logic ────────────────────────────────────────────

export function getCriticalityLabel(percentile: number): CriticalityResult['label'] {
  if (percentile >= 90) return 'Anchor Resource';
  if (percentile >= 75) return 'Critical Resource';
  if (percentile >= 55) return 'Core Contributor';
  if (percentile >= 35) return 'Active Contributor';
  return 'Developing';
}

// ─── Recency decay ─────────────────────────────────────────

function getRecencyDecay(fixVersions: any[] | null, allVersionsRanked: string[]): number {
  if (!fixVersions || fixVersions.length === 0) return 0.30;
  // Use the first version name
  const versionName = typeof fixVersions[0] === 'string' ? fixVersions[0] : fixVersions[0]?.name;
  if (!versionName) return 0.30;
  const rank = allVersionsRanked.indexOf(versionName);
  if (rank === 0) return 1.00; // Current/most recent
  if (rank === 1) return 0.80;
  if (rank === 2) return 0.65;
  if (rank === 3) return 0.50;
  return 0.30;
}

// ─── Fetch affinity weights ─────────────────────────────────

async function fetchBenchmarks(roleCode: string) {
  const { data, error } = await (supabase
    .from('r360_role_benchmarks' as any)
    .select('artifact_type, affinity_weight, is_primary')
    .eq('role_code', roleCode) as any);
  if (error) {
    console.error('[R360 Criticality] fetchBenchmarks error:', error);
    return [];
  }
  return (data || []) as { artifact_type: string; affinity_weight: number; is_primary: boolean }[];
}

// ─── Collect artifact counts for a jira account ─────────────

interface ArtifactCounts {
  [artifactType: string]: { count: number; versions: any[] };
}

async function collectArtifacts(
  jiraAccountId: string,
  profileId: string | null,
  sixMonthsAgo: string
): Promise<ArtifactCounts> {
  const counts: ArtifactCounts = {};
  const addCount = (type: string, c: number, versions: any[] = []) => {
    if (!counts[type]) counts[type] = { count: 0, versions: [] };
    counts[type].count += c;
    counts[type].versions.push(...versions);
  };

  // 1. Initiatives (owned by profile UUID)
  if (profileId) {
    const { data: inits } = await supabase
      .from('ph_initiatives')
      .select('id')
      .eq('assignee_id', profileId)
      .gte('created_at', sixMonthsAgo);
    addCount('initiative', inits?.length || 0);
  }

  // 2. Epics, Stories, Subtasks, Incidents, Bugs from ph_issues
  const { data: issues } = await (supabase
    .from('ph_issues')
    .select('issue_type, status_category, reporter_account_id, fix_versions')
    .eq('assignee_account_id', jiraAccountId)
    .gte('jira_created_at', sixMonthsAgo) as any);

  if (issues) {
    for (const iss of issues) {
      const type = (iss.issue_type || '').toLowerCase();
      const isDone = iss.status_category === 'Done' || iss.status_category === 'Complete';
      const fv = iss.fix_versions || [];

      if (type === 'epic') {
        addCount('epic', 1, fv);
      } else if (type === 'story' || type === 'frontend' || type === 'backend') {
        addCount('story', 1, fv);
        if (isDone) addCount('story_closed', 1, fv);
      } else if (type === 'sub-task' || type === 'subtask') {
        if (isDone) addCount('subtask', 1, fv);
      } else if (type === 'production incident') {
        if (isDone) addCount('incident', 1, fv);
      } else if (type === 'qa bug' || type === 'bug' || type === 'defect') {
        if (isDone) addCount('qa_bug_closed', 1, fv);
      } else if (type === 'task' || type === 'brd task') {
        if (isDone) addCount('subtask', 1, fv); // tasks map to subtask weight
      }
    }

    // Bugs raised (reporter_account_id matches)
    const bugsRaised = issues.filter((i: any) => {
      const t = (i.issue_type || '').toLowerCase();
      return (t === 'qa bug' || t === 'bug' || t === 'defect') &&
        i.reporter_account_id === jiraAccountId;
    });
    addCount('qa_bug_raised', bugsRaised.length);
  }

  // 3. Planner tasks
  if (profileId) {
    const { data: tasks } = await supabase
      .from('planner_tasks')
      .select('id, status_id')
      .eq('assignee_id', profileId)
      .gte('created_at', sixMonthsAgo);

    if (tasks) {
      // Fetch done status IDs
      const { data: doneStatuses } = await (supabase
        .from('planner_statuses' as any)
        .select('id')
        .eq('is_done', true) as any);
      const doneIds = new Set((doneStatuses || []).map((s: any) => s.id));
      const doneTasks = tasks.filter(t => doneIds.has(t.status_id));
      addCount('task', doneTasks.length);
    }
  }

  return counts;
}

// ─── Get all unique fix_versions for recency ranking ────────

async function getRankedVersions(): Promise<string[]> {
  // Get distinct fix_versions from recent issues, ordered by most recent usage
  const { data } = await (supabase
    .from('ph_issues')
    .select('fix_versions')
    .not('fix_versions', 'is', null)
    .order('jira_created_at', { ascending: false })
    .limit(2000) as any);

  if (!data) return [];
  const versionCount = new Map<string, number>();
  for (const row of data) {
    const fv = row.fix_versions;
    if (Array.isArray(fv)) {
      for (const v of fv) {
        const name = typeof v === 'string' ? v : v?.name;
        if (name) versionCount.set(name, (versionCount.get(name) || 0) + 1);
      }
    }
  }
  // Sort by frequency (most common = most recent release)
  return [...versionCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

// ─── Compute score for one resource ─────────────────────────

function computeScore(
  artifacts: ArtifactCounts,
  benchmarks: { artifact_type: string; affinity_weight: number }[],
  rankedVersions: string[]
): { score: number; breakdown: ArtifactContribution[] } {
  const breakdown: ArtifactContribution[] = [];
  let totalScore = 0;

  for (const bm of benchmarks) {
    const art = artifacts[bm.artifact_type];
    if (!art || art.count === 0) continue;

    const decay = getRecencyDecay(art.versions.length > 0 ? art.versions : null, rankedVersions);
    const weighted = art.count * bm.affinity_weight * decay;
    totalScore += weighted;

    breakdown.push({
      artifactType: bm.artifact_type,
      count: art.count,
      affinityWeight: bm.affinity_weight,
      recencyDecay: decay,
      weightedScore: weighted,
      release: art.versions.length > 0
        ? (typeof art.versions[0] === 'string' ? art.versions[0] : art.versions[0]?.name || '—')
        : '—',
    });
  }

  return { score: totalScore, breakdown };
}

// ─── Find peers (same role, overlapping projects) ───────────

async function findPeers(
  resourceJiraId: string,
  roleCode: string,
  sixMonthsAgo: string,
  benchmarks: { artifact_type: string; affinity_weight: number }[],
  rankedVersions: string[]
): Promise<PeerComparisonRow[]> {
  // Get project_keys the resource works in
  const { data: resourceProjects } = await (supabase
    .from('ph_issues')
    .select('project_key')
    .eq('assignee_account_id', resourceJiraId)
    .gte('jira_created_at', sixMonthsAgo) as any);

  const projectKeys = [...new Set((resourceProjects || []).map((r: any) => r.project_key).filter(Boolean))] as string[];
  if (projectKeys.length === 0) return [];

  // Get peers from resource_inventory with matching role
  const { data: allResources } = await (supabase
    .from('resource_inventory' as any)
    .select('id, name, role_name, jira_account_id, profile_id')
    .not('jira_account_id', 'is', null) as any);

  if (!allResources) return [];

  // Filter peers: same role, different person
  const peers = allResources.filter((r: any) =>
    r.jira_account_id !== resourceJiraId &&
    resolveRoleCode(r.role_name) === roleCode
  );

  // For up to 20 peers, compute scores
  const peerResults: PeerComparisonRow[] = [];
  const peersToScore = peers.slice(0, 20);

  for (const peer of peersToScore) {
    // Check if peer shares a project
    const { data: peerProjects } = await (supabase
      .from('ph_issues')
      .select('project_key')
      .eq('assignee_account_id', peer.jira_account_id)
      .in('project_key', projectKeys)
      .limit(1) as any);

    if (!peerProjects || peerProjects.length === 0) continue;

    const peerArtifacts = await collectArtifacts(peer.jira_account_id, peer.profile_id, sixMonthsAgo);
    const { score, breakdown } = computeScore(peerArtifacts, benchmarks, rankedVersions);

    const metricsByArtifact: Record<string, number> = {};
    for (const b of breakdown) {
      metricsByArtifact[b.artifactType] = b.count;
    }

    peerResults.push({
      peerId: peer.id,
      peerName: peer.name || 'Unknown',
      totalScore: Math.round(score * 100) / 100,
      isCurrentResource: false,
      metricsByArtifact,
    });
  }

  return peerResults;
}

// ─── Main computation ───────────────────────────────────────

export async function computeCriticalityScore(
  resourceId: string,
  roleCode: string
): Promise<CriticalityResult> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();

  // Check cache first
  const { data: cached } = await (supabase
    .from('r360_ai_profiles' as any)
    .select('criticality_raw_score, criticality_percentile, criticality_label, irreplaceability_ratio, peer_comparison, artifact_breakdown, criticality_computed_at')
    .eq('resource_id', resourceId)
    .maybeSingle() as any);

  if (cached?.criticality_computed_at) {
    const cacheAge = now.getTime() - new Date(cached.criticality_computed_at).getTime();
    if (cacheAge < 24 * 60 * 60 * 1000 && cached.criticality_label) {
      // Return cached result
      return {
        rawScore: Number(cached.criticality_raw_score) || 0,
        percentile: Number(cached.criticality_percentile) || 0,
        label: cached.criticality_label as CriticalityResult['label'],
        irreplaceabilityRatio: Number(cached.irreplaceability_ratio) || 0,
        isSinglePointOfFailure: Number(cached.irreplaceability_ratio) > 0.40,
        artifactBreakdown: cached.artifact_breakdown || [],
        peerComparison: cached.peer_comparison || [],
        primaryArtifacts: ROLE_PRIMARY_ARTIFACTS[roleCode] || [],
        computedAt: cached.criticality_computed_at,
      };
    }
  }

  // Get resource info
  const { data: resource } = await (supabase
    .from('resource_inventory' as any)
    .select('id, jira_account_id, profile_id')
    .eq('id', resourceId)
    .maybeSingle() as any);

  if (!resource?.jira_account_id) {
    return {
      rawScore: 0, percentile: 0, label: 'Developing',
      irreplaceabilityRatio: 0, isSinglePointOfFailure: false,
      artifactBreakdown: [], peerComparison: [],
      primaryArtifacts: ROLE_PRIMARY_ARTIFACTS[roleCode] || [],
      computedAt: now.toISOString(),
    };
  }

  // Fetch benchmarks for role
  const benchmarks = await fetchBenchmarks(roleCode);
  if (benchmarks.length === 0) {
    console.warn(`[R360 Criticality] No benchmarks found for role ${roleCode}, falling back to R02`);
    const fallback = await fetchBenchmarks('R02');
    benchmarks.push(...fallback);
  }

  // Get ranked versions for recency decay
  const rankedVersions = await getRankedVersions();

  // Compute resource score
  const artifacts = await collectArtifacts(resource.jira_account_id, resource.profile_id, sixMonthsAgo);
  const { score: rawScore, breakdown } = computeScore(artifacts, benchmarks, rankedVersions);

  // Find and score peers
  const peers = await findPeers(resource.jira_account_id, roleCode, sixMonthsAgo, benchmarks, rankedVersions);

  // Compute percentile
  const allScores = [...peers.map(p => p.totalScore), rawScore].sort((a, b) => a - b);
  const rank = allScores.indexOf(rawScore);
  const percentile = allScores.length > 1
    ? Math.round((rank / (allScores.length - 1)) * 100)
    : 50; // Solo resource defaults to 50th percentile

  const label = getCriticalityLabel(percentile);

  // Irreplaceability: resource contribution / total team contribution for primary artifacts
  const primaryTypes = benchmarks.filter(b => b.is_primary).map(b => b.artifact_type);
  const resourcePrimaryScore = breakdown
    .filter(b => primaryTypes.includes(b.artifactType))
    .reduce((sum, b) => sum + b.weightedScore, 0);
  const totalPrimaryScore = peers.reduce((sum, p) => {
    return sum + primaryTypes.reduce((s, t) => s + (p.metricsByArtifact[t] || 0), 0);
  }, 0) + resourcePrimaryScore;

  const irreplaceabilityRatio = totalPrimaryScore > 0
    ? Math.round((resourcePrimaryScore / totalPrimaryScore) * 1000) / 1000
    : 0;

  const result: CriticalityResult = {
    rawScore: Math.round(rawScore * 100) / 100,
    percentile,
    label,
    irreplaceabilityRatio,
    isSinglePointOfFailure: irreplaceabilityRatio > 0.40,
    artifactBreakdown: breakdown,
    peerComparison: [
      ...peers,
      {
        peerId: resourceId,
        peerName: 'You',
        totalScore: Math.round(rawScore * 100) / 100,
        isCurrentResource: true,
        metricsByArtifact: Object.fromEntries(breakdown.map(b => [b.artifactType, b.count])),
      },
    ].sort((a, b) => b.totalScore - a.totalScore),
    primaryArtifacts: ROLE_PRIMARY_ARTIFACTS[roleCode] || [],
    computedAt: now.toISOString(),
  };

  // Persist to r360_ai_profiles (upsert)
  await (supabase
    .from('r360_ai_profiles' as any)
    .update({
      criticality_raw_score: result.rawScore,
      criticality_percentile: result.percentile,
      criticality_label: result.label,
      irreplaceability_ratio: result.irreplaceabilityRatio,
      peer_comparison: result.peerComparison,
      artifact_breakdown: result.artifactBreakdown,
      criticality_computed_at: result.computedAt,
    })
    .eq('resource_id', resourceId) as any);

  return result;
}

export async function getPeerComparison(
  resourceId: string,
  roleCode: string
): Promise<PeerComparisonRow[]> {
  const result = await computeCriticalityScore(resourceId, roleCode);
  return result.peerComparison;
}
