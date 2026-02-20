export interface ChainMetrics {
  // Schedule
  scheduleDriftDays: number;
  scheduleStatus: 'ahead' | 'on_track' | 'behind';

  // Scope
  originalStoryCount: number;
  currentStoryCount: number;
  scopeChanges: { date: string; delta: number; description: string; actor: string }[];
  scopeClean: boolean;

  // Weakest link
  weakestNode: { key: string; progress: number; status: string; layer: string };

  // Confidence
  confidencePct: number;

  // Cycle times
  epicCycleDays: number;
  avgStoryCycleDays: number;
  avgDefectCycleDays: number;

  // Story pipeline
  storiesInProd: number;
  storiesDone: number;
  storiesInProgress: number;
  storiesBlocked: number;
  storiesBacklog: number;
  storiesTotal: number;

  // Velocity
  velocityPerWeek: number;
  neededVelocity: number;
  projectedCompletionDate: string;

  // Lags
  strategyToExecutionDays: number;
  linkageLagDays: number;

  // People
  owners: { name: string; role: string; entity: string; entityKey: string; level: string }[];
  concentrationRisk: { name: string; count: number } | null;
  lastActor: { name: string; action: string; date: string; entity: string };

  // Chain data refs for display
  themeKey: string;
  themeName: string;
  goalKey: string;
  goalTitle: string;
  goalProgress: number;
  goalHealth: number;
  goalTarget: string;
  initiativeKey: string | null;
  initiativeTitle: string | null;
  epicKey: string | null;
  epicTitle: string | null;
  krs: { key: string; title: string; status: string; progress: number; target: number; current: number; unit: string }[];
}

export function computeChainMetrics(
  chainData: any[],
  stories: any[],
  defects: any[],
  roleMap?: Record<string, string>,
  themeDisplayKey?: string
): ChainMetrics {
  if (!chainData || chainData.length === 0) {
    return getEmptyMetrics();
  }

  const first = chainData[0];

  // ─── Deduplicate KRs ───
  const krMap = new Map<string, any>();
  chainData.filter(r => r.kr_id).forEach(r => {
    if (!krMap.has(r.kr_id)) krMap.set(r.kr_id, r);
  });
  const krs = Array.from(krMap.values());

  const initiative = chainData.find(r => r.initiative_id);
  const epic = chainData.find(r => r.epic_id);

  // ─── Schedule ───
  const goalTargetDate = new Date(first.goal_target || '2026-12-31');
  const goalStartDate = new Date(first.goal_created_at);
  const today = new Date();
  const totalDuration = Math.max(1, (goalTargetDate.getTime() - goalStartDate.getTime()) / 86400000);
  const elapsed = (today.getTime() - goalStartDate.getTime()) / 86400000;
  const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
  const actualProgress = first.goal_progress || 0;
  const driftPct = actualProgress - expectedProgress;
  const scheduleDriftDays = Math.round(driftPct / 100 * totalDuration);
  const scheduleStatus = scheduleDriftDays > 5 ? 'ahead' : scheduleDriftDays < -5 ? 'behind' : 'on_track';

  // ─── Scope ───
  const epicCreatedAt = epic?.epic_created_at ? new Date(epic.epic_created_at) : null;
  const lateStories = epicCreatedAt
    ? stories.filter(s => new Date(s.story_created_at) > new Date(epicCreatedAt.getTime() + 7 * 86400000))
    : [];

  // ─── Weakest Link ───
  const allNodes = [
    { key: first.theme_key, progress: first.theme_progress || 0, status: first.theme_status || 'Draft', layer: 'Theme' },
    { key: first.goal_key, progress: first.goal_progress || 0, status: first.goal_status || 'Draft', layer: 'Goal' },
    ...krs.map(kr => ({
      key: kr.kr_key, progress: kr.kr_progress || 0,
      status: kr.kr_status || 'Draft', layer: 'Key Result',
    })),
    ...(initiative ? [{
      key: initiative.initiative_key, progress: initiative.initiative_progress || 0,
      status: initiative.initiative_status || 'Draft', layer: 'Initiative',
    }] : []),
    ...(epic ? [{
      key: epic.epic_key,
      progress: stories.length > 0
        ? Math.round(stories.filter(s => s.story_status === 'Done').length / stories.length * 100)
        : 0,
      status: epic.epic_status || 'Draft', layer: 'Epic',
    }] : []),
  ];
  const weakest = allNodes.reduce((min, n) => n.progress < min.progress ? n : min, allNodes[0]);

  // ─── Story Pipeline ───
  const inProd = stories.filter(s => s.story_status === 'Done' && s.release_status === 'Released').length;
  const done = stories.filter(s => s.story_status === 'Done').length;
  const inProgress = stories.filter(s => s.story_status === 'In Progress').length;
  const blocked = stories.filter(s => s.story_status === 'Blocked').length;
  const total = stories.length;
  const backlog = Math.max(0, total - done - inProgress - blocked);

  // ─── Cycle Times ───
  const epicCycleDays = epic
    ? Math.round((today.getTime() - new Date(epic.epic_created_at).getTime()) / 86400000)
    : 0;

  const completedStories = stories.filter(s => s.story_status === 'Done');
  const avgStoryCycle = completedStories.length > 0
    ? completedStories.reduce((sum: number, s: any) => sum + (s.cycle_days || 0), 0) / completedStories.length
    : 0;

  const resolvedDefects = defects.filter(d => d.status === 'Done' || d.status === 'Resolved');
  const avgDefectCycle = resolvedDefects.length > 0
    ? resolvedDefects.reduce((sum: number, d: any) => {
        return sum + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 86400000;
      }, 0) / resolvedDefects.length
    : 0;

  // ─── Velocity ───
  const fourWeeksAgo = new Date(today.getTime() - 28 * 86400000);
  const recentlyDone = completedStories.filter(s => new Date(s.story_updated_at) > fourWeeksAgo).length;
  const velocity = recentlyDone / 4;
  const remaining = Math.max(0, total - done);
  const epicDue = epic?.epic_due ? new Date(epic.epic_due) : goalTargetDate;
  const weeksLeft = Math.max(1, (epicDue.getTime() - today.getTime()) / (7 * 86400000));
  const needed = remaining / weeksLeft;
  const projectedWeeks = velocity > 0 ? remaining / velocity : 999;
  const projected = new Date(today.getTime() + projectedWeeks * 7 * 86400000);

  // ─── Lags ───
  const themeCreated = new Date(first.theme_created_at);
  const epicCreated = epic ? new Date(epic.epic_created_at) : null;
  const stratToExec = epicCreated
    ? Math.round((epicCreated.getTime() - themeCreated.getTime()) / 86400000)
    : -1;

  const firstKRDate = krs.length > 0
    ? new Date(Math.min(...krs.map((kr: any) => new Date(kr.kr_created_at).getTime())))
    : null;
  const firstLinkDate = chainData.find(r => r.kr_initiative_linked_at)?.kr_initiative_linked_at;
  const linkLag = firstKRDate && firstLinkDate
    ? Math.round((new Date(firstLinkDate).getTime() - firstKRDate.getTime()) / 86400000)
    : -1;

  // ─── Confidence ───
  const progressFactor = actualProgress / 100;
  const timeFactor = Math.max(0, 1 - (elapsed / totalDuration));
  const defectPenalty = defects.filter(d => d.status !== 'Done' && d.status !== 'Resolved').length * 0.05;
  const scopePenalty = lateStories.length * 0.03;
  const raw = (progressFactor * 40 + timeFactor * 30 + (1 - defectPenalty) * 15 + (1 - scopePenalty) * 15);
  const confidence = Math.round(Math.max(5, Math.min(99, raw * 100)));

  // ─── People ───
  // Resolve role from resource_inventory via roleMap, falling back to hardcoded labels
  const resolveRole = (id: string | null, fallback: string) => {
    if (id && roleMap && roleMap[id]) return roleMap[id];
    return fallback;
  };

  const owners: ChainMetrics['owners'] = [];
  if (first.theme_owner_name) owners.push({ name: first.theme_owner_name, role: resolveRole(first.theme_owner_id, 'Theme Owner'), entity: first.theme_name, entityKey: first.theme_key, level: 'Strategic' });
  if (first.goal_owner_name) owners.push({ name: first.goal_owner_name, role: resolveRole(first.goal_owner_id, 'Goal Owner'), entity: first.goal_title, entityKey: first.goal_key, level: 'Tactical' });
  krs.filter(kr => kr.kr_owner_name).forEach((kr: any) => {
    if (!owners.find(o => o.name === kr.kr_owner_name && o.level === 'Measurement')) {
      owners.push({ name: kr.kr_owner_name, role: resolveRole(kr.kr_owner_id, 'KR Owner'), entity: kr.kr_title, entityKey: kr.kr_key, level: 'Measurement' });
    }
  });
  if (initiative?.initiative_owner_name) owners.push({ name: initiative.initiative_owner_name, role: resolveRole(initiative.initiative_owner_id, 'Delivery Manager'), entity: initiative.initiative_title, entityKey: initiative.initiative_key, level: 'Delivery' });
  if (epic?.epic_owner_name) owners.push({ name: epic.epic_owner_name, role: resolveRole(epic.epic_owner_id, 'Tech Lead'), entity: epic.epic_title, entityKey: epic.epic_key, level: 'Execution' });

  const nameCounts = owners.reduce((acc, o) => { acc[o.name] = (acc[o.name] || 0) + 1; return acc; }, {} as Record<string, number>);
  const concentrated = Object.entries(nameCounts).find(([_, count]) => count > 1);

  return {
    scheduleDriftDays,
    scheduleStatus,
    originalStoryCount: total - lateStories.length,
    currentStoryCount: total,
    scopeChanges: lateStories.map((s: any) => ({
      date: s.story_created_at, delta: 1,
      description: s.story_title || 'Untitled story', actor: s.assignee_name || 'Unknown',
    })),
    scopeClean: lateStories.length === 0,
    weakestNode: weakest,
    confidencePct: confidence,
    epicCycleDays,
    avgStoryCycleDays: Math.round(avgStoryCycle * 10) / 10,
    avgDefectCycleDays: Math.round(avgDefectCycle * 10) / 10,
    storiesInProd: inProd,
    storiesDone: done,
    storiesInProgress: inProgress,
    storiesBlocked: blocked,
    storiesBacklog: backlog,
    storiesTotal: total,
    velocityPerWeek: Math.round(velocity * 10) / 10,
    neededVelocity: Math.round(needed * 10) / 10,
    projectedCompletionDate: projected.toISOString().split('T')[0],
    strategyToExecutionDays: stratToExec,
    linkageLagDays: linkLag,
    owners,
    concentrationRisk: concentrated ? { name: concentrated[0], count: concentrated[1] } : null,
    lastActor: { name: 'System', action: 'Chain analyzed', date: today.toISOString().split('T')[0], entity: '' },
    themeKey: themeDisplayKey || first.theme_key,
    themeName: first.theme_name,
    goalKey: first.goal_key,
    goalTitle: first.goal_title,
    goalProgress: first.goal_progress || 0,
    goalHealth: first.goal_health || 0,
    goalTarget: first.goal_target || '',
    initiativeKey: initiative?.initiative_key || null,
    initiativeTitle: initiative?.initiative_title || null,
    epicKey: epic?.epic_key || null,
    epicTitle: epic?.epic_title || null,
    krs: krs.map((kr: any) => ({
      key: kr.kr_key, title: kr.kr_title, status: kr.kr_status,
      progress: kr.kr_progress || 0, target: kr.kr_target || 100,
      current: kr.kr_current || 0, unit: kr.kr_unit || '%',
    })),
  };
}

function getEmptyMetrics(): ChainMetrics {
  return {
    scheduleDriftDays: 0, scheduleStatus: 'on_track',
    originalStoryCount: 0, currentStoryCount: 0, scopeChanges: [], scopeClean: true,
    weakestNode: { key: '—', progress: 0, status: 'Draft', layer: 'Unknown' },
    confidencePct: 0, epicCycleDays: 0, avgStoryCycleDays: 0, avgDefectCycleDays: 0,
    storiesInProd: 0, storiesDone: 0, storiesInProgress: 0, storiesBlocked: 0, storiesBacklog: 0, storiesTotal: 0,
    velocityPerWeek: 0, neededVelocity: 0, projectedCompletionDate: '—',
    strategyToExecutionDays: -1, linkageLagDays: -1,
    owners: [], concentrationRisk: null,
    lastActor: { name: '—', action: '—', date: '—', entity: '—' },
    themeKey: '', themeName: '', goalKey: '', goalTitle: '', goalProgress: 0, goalHealth: 0, goalTarget: '',
    initiativeKey: null, initiativeTitle: null, epicKey: null, epicTitle: null, krs: [],
  };
}
