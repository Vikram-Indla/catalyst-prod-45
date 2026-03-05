/**
 * R360 Criticality Service — Role-Aware Artifact Scoring
 * Pure SQL + math. No AI/LLM calls.
 * Reads affinity weights from r360_role_benchmarks (never hardcoded).
 * Caches result in r360_ai_profiles for 24 hours.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveRoleCode } from '@/constants/r360RoleMapping';

// ─── Types ──────────────────────────────────────────────────

export type CriticalityLabel =
  | 'Anchor Resource'
  | 'Critical Resource'
  | 'Core Contributor'
  | 'Active Contributor'
  | 'Developing';

export interface PrimaryMetric {
  artifactType: string;
  label: string;          // from r360_role_benchmarks.display_label
  unit: 'count' | 'pct' | 'hours' | 'ratio';
}

export interface PeerMetricValue {
  value: number;
  unit: string;
  label: string;
}

export interface PeerComparisonRow {
  peerId: string;
  peerName: string;
  totalScore: number;
  isCurrentResource: boolean;
  metrics: Record<string, PeerMetricValue>;
}

export interface ArtifactContribution {
  artifactType: string;
  displayLabel: string;
  count: number;
  affinityWeight: number;
  recencyDecay: number;
  weightedScore: number;
  release: string;
  project: string;
}

export interface CriticalityResult {
  rawScore: number;
  percentile: number;             // 0.0–1.0
  label: CriticalityLabel;
  irreplaceabilityRatio: number;
  isSinglePointOfFailure: boolean;
  primaryMetrics: PrimaryMetric[];
  peerComparison: PeerComparisonRow[];
  artifactBreakdown: ArtifactContribution[];
  computedAt: string;
}

// ─── Constants ──────────────────────────────────────────────

const RECENCY_MAP: Record<number, number> = { 0: 1.00, 1: 0.80, 2: 0.65, 3: 0.50 };
const RECENCY_OLD = 0.30;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SPOF_THRESHOLD = 0.40;

// ─── Helpers ────────────────────────────────────────────────

export function getCriticalityLabel(percentile: number): CriticalityLabel {
  // percentile is 0.0–1.0
  if (percentile >= 0.90) return 'Anchor Resource';
  if (percentile >= 0.75) return 'Critical Resource';
  if (percentile >= 0.55) return 'Core Contributor';
  if (percentile >= 0.35) return 'Active Contributor';
  return 'Developing';
}

function getRecencyDecay(fixVersions: any[] | null, rankedVersions: string[]): number {
  if (!fixVersions || fixVersions.length === 0) return RECENCY_OLD;
  const vName = typeof fixVersions[0] === 'string' ? fixVersions[0] : fixVersions[0]?.name;
  if (!vName) return RECENCY_OLD;
  const rank = rankedVersions.indexOf(vName);
  if (rank < 0) return RECENCY_OLD;
  return RECENCY_MAP[rank] ?? RECENCY_OLD;
}

// ─── Benchmark loader ───────────────────────────────────────

interface Benchmark {
  artifact_type: string;
  affinity_weight: number;
  is_primary: boolean;
  display_label: string | null;
  unit: string | null;
}

async function fetchBenchmarks(roleCode: string): Promise<Benchmark[]> {
  const { data, error } = await (supabase
    .from('r360_role_benchmarks' as any)
    .select('artifact_type, affinity_weight, is_primary, display_label, unit')
    .eq('role_code', roleCode) as any);
  if (error) {
    console.error('[R360 Criticality] fetchBenchmarks error:', error);
    return [];
  }
  return (data || []) as Benchmark[];
}

// ─── Ranked versions for recency decay ──────────────────────

async function getRankedVersions(): Promise<string[]> {
  const { data } = await (supabase
    .from('ph_issues')
    .select('fix_versions')
    .not('fix_versions', 'is', null)
    .order('jira_created_at', { ascending: false })
    .limit(2000) as any);

  if (!data) return [];
  const freq = new Map<string, number>();
  for (const row of data) {
    if (Array.isArray(row.fix_versions)) {
      for (const v of row.fix_versions) {
        const n = typeof v === 'string' ? v : v?.name;
        if (n) freq.set(n, (freq.get(n) || 0) + 1);
      }
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// ─── Artifact collection for one jira account ───────────────

interface ArtifactCounts {
  [type: string]: { count: number; versions: any[] };
}

async function collectArtifacts(
  jiraAccountId: string,
  profileId: string | null,
  sixMonthsAgo: string
): Promise<ArtifactCounts> {
  const counts: ArtifactCounts = {};
  const add = (type: string, c: number, versions: any[] = []) => {
    if (!counts[type]) counts[type] = { count: 0, versions: [] };
    counts[type].count += c;
    counts[type].versions.push(...versions);
  };

  // Initiatives (owned by profile UUID)
  if (profileId) {
    const { data: inits } = await supabase
      .from('ph_initiatives')
      .select('id')
      .eq('assignee_id', profileId)
      .gte('created_at', sixMonthsAgo);
    add('initiative', inits?.length || 0);
  }

  // Epics, Stories, Subtasks, Incidents, Bugs from ph_issues
  const { data: issues } = await (supabase
    .from('ph_issues')
    .select('issue_type, status_category, reporter_account_id, fix_versions, project_name, jira_created_at, resolved_at')
    .eq('assignee_account_id', jiraAccountId)
    .gte('jira_created_at', sixMonthsAgo) as any);

  if (issues) {
    for (const iss of issues) {
      const type = (iss.issue_type || '').toLowerCase();
      const isDone = iss.status_category === 'Done' || iss.status_category === 'Complete';
      const fv = iss.fix_versions || [];

      if (type === 'epic') {
        add('epic', 1, fv);
      } else if (type === 'story' || type === 'frontend' || type === 'backend') {
        add('story', 1, fv);
        if (isDone) add('story_closed', 1, fv);
      } else if (type === 'sub-task' || type === 'subtask') {
        if (isDone) add('subtask', 1, fv);
      } else if (type === 'production incident') {
        if (isDone) add('incident', 1, fv);
      } else if (type === 'qa bug' || type === 'bug' || type === 'defect') {
        if (isDone) add('qa_bug_closed', 1, fv);
      } else if (type === 'task' || type === 'brd task') {
        if (isDone) add('subtask', 1, fv);
      }
    }

    // Bugs raised (reporter)
    const bugsRaised = issues.filter((i: any) => {
      const t = (i.issue_type || '').toLowerCase();
      return (t === 'qa bug' || t === 'bug' || t === 'defect') &&
        i.reporter_account_id === jiraAccountId;
    });
    add('qa_bug_raised', bugsRaised.length);

    // Incident pickup speed (avg hours from created to first assignment)
    const incidents = issues.filter((i: any) =>
      (i.issue_type || '').toLowerCase() === 'production incident' &&
      i.resolved_at && i.jira_created_at
    );
    if (incidents.length > 0) {
      const totalHours = incidents.reduce((sum: number, inc: any) => {
        const created = new Date(inc.jira_created_at).getTime();
        const resolved = new Date(inc.resolved_at).getTime();
        return sum + Math.max(0, (resolved - created) / (1000 * 60 * 60));
      }, 0);
      const avgHours = totalHours / incidents.length;
      // Store as inverse: lower pickup = better score (cap at 72h)
      const pickupScore = Math.max(0, Math.min(incidents.length, 72 / Math.max(avgHours, 0.1)));
      add('incident_pickup', Math.round(pickupScore));
    }
  }

  // Planner tasks
  if (profileId) {
    const { data: tasks } = await supabase
      .from('planner_tasks')
      .select('id, status_id')
      .eq('assignee_id', profileId)
      .gte('created_at', sixMonthsAgo);

    if (tasks) {
      const { data: doneStatuses } = await (supabase
        .from('planner_statuses' as any)
        .select('id')
        .eq('is_done', true) as any);
      const doneIds = new Set((doneStatuses || []).map((s: any) => s.id));
      const doneTasks = tasks.filter(t => doneIds.has(t.status_id));
      add('task', doneTasks.length);
    }
  }

  return counts;
}

// ─── Score computation ──────────────────────────────────────

function computeScore(
  artifacts: ArtifactCounts,
  benchmarks: Benchmark[],
  rankedVersions: string[]
): { score: number; breakdown: ArtifactContribution[]; metricValues: Record<string, number> } {
  const breakdown: ArtifactContribution[] = [];
  const metricValues: Record<string, number> = {};
  let totalScore = 0;

  for (const bm of benchmarks) {
    const art = artifacts[bm.artifact_type];
    if (!art || art.count === 0 || bm.affinity_weight === 0) continue;

    const decay = getRecencyDecay(art.versions.length > 0 ? art.versions : null, rankedVersions);
    const weighted = art.count * bm.affinity_weight * decay;
    totalScore += weighted;
    metricValues[bm.artifact_type] = art.count;

    breakdown.push({
      artifactType: bm.artifact_type,
      displayLabel: bm.display_label || bm.artifact_type,
      count: art.count,
      affinityWeight: bm.affinity_weight,
      recencyDecay: decay,
      weightedScore: weighted,
      release: art.versions.length > 0
        ? (typeof art.versions[0] === 'string' ? art.versions[0] : art.versions[0]?.name || '—')
        : '—',
      project: '—',
    });
  }

  return { score: totalScore, breakdown, metricValues };
}

// ─── Main computation ───────────────────────────────────────

export async function computeCriticalityScore(
  resourceId: string,
  roleCode: string
): Promise<CriticalityResult> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Check cache
  const { data: cached } = await (supabase
    .from('r360_ai_profiles' as any)
    .select('criticality_raw_score, criticality_percentile, criticality_label, irreplaceability_ratio, is_single_point_of_failure, peer_comparison, artifact_breakdown, primary_artifact_labels, criticality_computed_at')
    .eq('resource_id', resourceId)
    .maybeSingle() as any);

  if (cached?.criticality_computed_at) {
    const age = now.getTime() - new Date(cached.criticality_computed_at).getTime();
    if (age < CACHE_TTL_MS && cached.criticality_label) {
      return {
        rawScore: Number(cached.criticality_raw_score) || 0,
        percentile: Number(cached.criticality_percentile) || 0,
        label: cached.criticality_label as CriticalityLabel,
        irreplaceabilityRatio: Number(cached.irreplaceability_ratio) || 0,
        isSinglePointOfFailure: cached.is_single_point_of_failure ?? false,
        primaryMetrics: (cached.primary_artifact_labels as PrimaryMetric[]) ?? [],
        peerComparison: (cached.peer_comparison as PeerComparisonRow[]) ?? [],
        artifactBreakdown: (cached.artifact_breakdown as ArtifactContribution[]) ?? [],
        computedAt: cached.criticality_computed_at,
      };
    }
  }

  // 2. Load benchmarks
  let benchmarks = await fetchBenchmarks(roleCode);
  if (benchmarks.length === 0) {
    console.warn(`[R360 Criticality] No benchmarks for ${roleCode}, falling back to R02`);
    benchmarks = await fetchBenchmarks('R02');
  }

  const affinityMap = Object.fromEntries(
    benchmarks.map(b => [b.artifact_type, { weight: b.affinity_weight, label: b.display_label || b.artifact_type, unit: b.unit || 'count' }])
  );

  // Primary metrics — drives dynamic column headers
  const primaryMetrics: PrimaryMetric[] = benchmarks
    .filter(b => b.is_primary && b.affinity_weight > 0)
    .slice(0, 3)
    .map(b => ({
      artifactType: b.artifact_type,
      label: b.display_label || b.artifact_type,
      unit: (b.unit || 'count') as PrimaryMetric['unit'],
    }));

  // 3. Get ranked versions
  const rankedVersions = await getRankedVersions();

  // 4. Get resource info
  const { data: resource } = await (supabase
    .from('resource_inventory' as any)
    .select('id, jira_account_id, profile_id')
    .eq('id', resourceId)
    .maybeSingle() as any);

  if (!resource?.jira_account_id) {
    return {
      rawScore: 0, percentile: 0, label: 'Developing',
      irreplaceabilityRatio: 0, isSinglePointOfFailure: false,
      primaryMetrics, peerComparison: [], artifactBreakdown: [],
      computedAt: now.toISOString(),
    };
  }

  // 5. Compute resource score
  const artifacts = await collectArtifacts(resource.jira_account_id, resource.profile_id, sixMonthsAgo);
  const { score: myScore, breakdown, metricValues: myMetrics } = computeScore(artifacts, benchmarks, rankedVersions);

  // 6. Find peers: same role from resource_inventory
  const { data: allResources } = await (supabase
    .from('resource_inventory' as any)
    .select('id, name, role_name, jira_account_id, profile_id')
    .not('jira_account_id', 'is', null) as any);

  const peers = (allResources || []).filter((r: any) =>
    r.jira_account_id !== resource.jira_account_id &&
    resolveRoleCode(r.role_name) === roleCode
  );

  // Get resource's project keys for peer filtering
  const { data: resourceProjects } = await (supabase
    .from('ph_issues')
    .select('project_key')
    .eq('assignee_account_id', resource.jira_account_id)
    .gte('jira_created_at', sixMonthsAgo) as any);
  const projectKeys = [...new Set((resourceProjects || []).map((r: any) => r.project_key).filter(Boolean))] as string[];

  // Score up to 20 peers sharing at least one project
  const peerResults: PeerComparisonRow[] = [];
  let teamPrimaryTotal = myScore;
  const peersToScore = peers.slice(0, 20);

  for (const peer of peersToScore) {
    // Check project overlap
    if (projectKeys.length > 0) {
      const { data: peerProjects } = await (supabase
        .from('ph_issues')
        .select('project_key')
        .eq('assignee_account_id', peer.jira_account_id)
        .in('project_key', projectKeys)
        .limit(1) as any);
      if (!peerProjects || peerProjects.length === 0) continue;
    }

    try {
      const peerArtifacts = await collectArtifacts(peer.jira_account_id, peer.profile_id, sixMonthsAgo);
      const { score: peerScore, metricValues: peerMetrics } = computeScore(peerArtifacts, benchmarks, rankedVersions);
      teamPrimaryTotal += peerScore;

      const metrics: Record<string, PeerMetricValue> = {};
      for (const pm of primaryMetrics) {
        metrics[pm.artifactType] = {
          value: peerMetrics[pm.artifactType] ?? 0,
          unit: pm.unit,
          label: pm.label,
        };
      }
      peerResults.push({
        peerId: peer.id,
        peerName: peer.name || 'Unknown',
        totalScore: Math.round(peerScore * 100) / 100,
        isCurrentResource: false,
        metrics,
      });
    } catch (_) { /* skip peers with no data */ }
  }

  // Add current resource row
  const myMetricValues: Record<string, PeerMetricValue> = {};
  for (const pm of primaryMetrics) {
    myMetricValues[pm.artifactType] = {
      value: myMetrics[pm.artifactType] ?? 0,
      unit: pm.unit,
      label: pm.label,
    };
  }

  const allRows: PeerComparisonRow[] = [
    { peerId: resourceId, peerName: 'You', totalScore: Math.round(myScore * 100) / 100,
      isCurrentResource: true, metrics: myMetricValues },
    ...peerResults.sort((a, b) => b.totalScore - a.totalScore),
  ];

  // 7. Percentile (0.0–1.0)
  const allScores = allRows.map(r => r.totalScore).sort((a, b) => a - b);
  const myRank = allScores.filter(s => s < myScore).length;
  const percentile = allScores.length > 1
    ? Math.round((myRank / (allScores.length - 1)) * 10000) / 10000
    : 0.50;

  const label = getCriticalityLabel(percentile);

  const irreplaceabilityRatio = teamPrimaryTotal > 0
    ? Math.round((myScore / teamPrimaryTotal) * 1000) / 1000
    : 0;

  const result: CriticalityResult = {
    rawScore: Math.round(myScore * 100) / 100,
    percentile,
    label,
    irreplaceabilityRatio,
    isSinglePointOfFailure: irreplaceabilityRatio > SPOF_THRESHOLD,
    primaryMetrics,
    peerComparison: allRows,
    artifactBreakdown: breakdown,
    computedAt: now.toISOString(),
  };

  // 8. Persist to cache
  await (supabase
    .from('r360_ai_profiles' as any)
    .update({
      criticality_raw_score: result.rawScore,
      criticality_percentile: result.percentile,
      criticality_label: result.label,
      irreplaceability_ratio: result.irreplaceabilityRatio,
      is_single_point_of_failure: result.isSinglePointOfFailure,
      peer_comparison: result.peerComparison,
      artifact_breakdown: result.artifactBreakdown,
      primary_artifact_labels: result.primaryMetrics,
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
