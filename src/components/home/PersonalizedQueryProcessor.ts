/**
 * PersonalizedQueryProcessor — All queries filter by user's projects/identity.
 * Adapted to ph_issues schema: issue_key, summary, issue_type, jira_updated_at, jira_created_at.
 */
import { supabase } from '@/integrations/supabase/client';
import type { UserContext } from './hooks/useUserContext';

export interface QueryResult {
  type: 'items' | 'workload' | 'release' | 'workload-alert' | 'narrative' | 'help' | 'error';
  title: string;
  message?: string;
  items?: any[];
  members?: any[];
  releases?: any[];
  alerts?: any[];
  healthy?: any[];
  followUp?: string[];
}

const FIELDS = 'issue_key, summary, issue_type, status, status_category, project_key, assignee_display_name, reporter_display_name, jira_updated_at, jira_created_at, priority, due_date';

// ═══ ROLE PRESETS ═══
export const ROLE_PRESETS: Record<string, Array<{ label: string; query: string }>> = {
  'Delivery Manager': [
    { label: 'My blocked items', query: 'my-blocked' },
    { label: 'Team workload', query: 'team-workload' },
    { label: 'Aging items', query: 'aging-items' },
    { label: 'Release readiness', query: 'release-readiness' },
    { label: "Who's overloaded?", query: 'overloaded' },
    { label: 'Unassigned items', query: 'unassigned' },
  ],
  'Developer': [
    { label: 'My open items', query: 'my-open' },
    { label: 'My bugs', query: 'my-bugs' },
    { label: 'Items due soon', query: 'due-soon' },
    { label: 'My completed work', query: 'my-completed' },
    { label: "What's blocked?", query: 'my-blocked' },
    { label: 'Unassigned items', query: 'unassigned' },
  ],
  'Product Owner': [
    { label: 'My open items', query: 'my-open' },
    { label: 'My epics status', query: 'project-summary' },
    { label: 'Defects on my stories', query: 'my-bugs' },
    { label: 'Unassigned items', query: 'unassigned' },
    { label: "What's blocked?", query: 'my-blocked' },
    { label: 'Release readiness', query: 'release-readiness' },
  ],
  'QA Lead': [
    { label: 'Open defects', query: 'my-bugs' },
    { label: 'Reopened defects', query: 'reopened' },
    { label: "What's blocked?", query: 'my-blocked' },
    { label: 'Team workload', query: 'team-workload' },
    { label: 'Items due soon', query: 'due-soon' },
    { label: 'Project summary', query: 'project-summary' },
  ],
  'Team Lead': [
    { label: 'Team workload', query: 'team-workload' },
    { label: 'Blockers in my team', query: 'my-blocked' },
    { label: 'Aging items', query: 'aging-items' },
    { label: "Who's overloaded?", query: 'overloaded' },
    { label: 'Release readiness', query: 'release-readiness' },
    { label: 'Unassigned items', query: 'unassigned' },
  ],
  'Director': [
    { label: 'Portfolio health', query: 'project-summary' },
    { label: 'Top risks', query: 'my-blocked' },
    { label: 'Delivery trend', query: 'release-readiness' },
    { label: 'Team workload', query: 'team-workload' },
    { label: "Who's overloaded?", query: 'overloaded' },
    { label: 'Aging items', query: 'aging-items' },
  ],
  'Team Member': [
    { label: 'My open items', query: 'my-open' },
    { label: "What's blocked?", query: 'my-blocked' },
    { label: 'Due this week', query: 'due-soon' },
    { label: 'My completed work', query: 'my-completed' },
    { label: 'Unassigned items', query: 'unassigned' },
    { label: 'Project summary', query: 'project-summary' },
  ],
};

export function getPresetsForRole(role: string): Array<{ label: string; query: string }> {
  return ROLE_PRESETS[role] || ROLE_PRESETS['Team Member'];
}

// ═══ MAIN ENTRY POINT ═══
export async function processPersonalizedQuery(
  input: string,
  userCtx: UserContext
): Promise<QueryResult> {
  const trimmed = input.trim();
  if (!trimmed) return getHelpResponse(userCtx);

  // Check for specific item key
  const keyMatch = trimmed.match(/^([A-Z]+-\d+)$/i);
  if (keyMatch) return fetchItemByKey(keyMatch[1].toUpperCase(), userCtx);

  // Check for preset query IDs (from chip clicks)
  const presetMap: Record<string, (ctx: UserContext) => Promise<QueryResult>> = {
    'my-blocked': fetchMyBlocked,
    'team-workload': fetchTeamWorkload,
    'overloaded': fetchOverloaded,
    'aging-items': fetchAging,
    'release-readiness': fetchReleaseReadiness,
    'unassigned': fetchUnassigned,
    'my-open': fetchMyOpen,
    'my-completed': fetchMyClosed,
    'due-soon': fetchDueSoon,
    'my-bugs': fetchMyBugs,
    'project-summary': fetchProjectSummary,
    'reopened': fetchReopened,
  };

  if (presetMap[trimmed]) {
    try {
      return await presetMap[trimmed](userCtx);
    } catch (err) {
      return { type: 'error', title: 'Query failed', message: String(err) };
    }
  }

  const lower = trimmed.toLowerCase();

  try {
    if (/block|impediment|stuck/i.test(lower)) return fetchMyBlocked(userCtx);
    if (/workload|team load|distribution/i.test(lower)) return fetchTeamWorkload(userCtx);
    if (/overload|capacity|swamped/i.test(lower)) return fetchOverloaded(userCtx);
    if (/aging|stale|no update|dormant/i.test(lower)) return fetchAging(userCtx);
    if (/release|readiness|ship|deploy|go live/i.test(lower)) return fetchReleaseReadiness(userCtx);
    if (/unassign|no owner|nobody/i.test(lower)) return fetchUnassigned(userCtx);
    if (/my (work|item|task|open|assigned)/i.test(lower) || /working on/i.test(lower)) return fetchMyOpen(userCtx);
    if (/complet|closed|done|finish|resolved|my completed/i.test(lower)) return fetchMyClosed(userCtx);
    if (/due|deadline|upcoming|this week/i.test(lower)) return fetchDueSoon(userCtx);
    if (/bug|defect/i.test(lower)) return fetchMyBugs(userCtx);
    if (/overdue|past due|late|missed/i.test(lower)) return fetchOverdue(userCtx);
    if (/re.?open|bounc.*back/i.test(lower)) return fetchReopened(userCtx);
    if (/summary|overview|status|how.*going|happening|brief|health/i.test(lower)) return fetchProjectSummary(userCtx);

    // Person lookup
    const personMatch = lower.match(/(?:what(?:'s|s)?|show)\s+(\w+)\s+(?:working|doing|items|tasks)/i);
    if (personMatch) return fetchPersonItems(personMatch[1], userCtx);

    // Name-based lookup (any single word that matches a team member)
    const wordMatch = trimmed.match(/^(\w+)$/);
    if (wordMatch) {
      const name = wordMatch[1];
      if (userCtx.teamMemberNames.some(n => n.toLowerCase().includes(name.toLowerCase()))) {
        return fetchPersonItems(name, userCtx);
      }
    }

    return getHelpResponse(userCtx);
  } catch (err) {
    return {
      type: 'error', title: 'Something went wrong',
      message: err instanceof Error ? err.message : 'Unknown error',
      followUp: ['My blocked items', 'Team workload', 'Project summary'],
    };
  }
}

// ═══ HANDLERS ═══

async function fetchMyBlocked(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .or('status.ilike.%blocked%,status.ilike.%impediment%')
    .order('jira_updated_at', { ascending: true })
    .limit(20);

  if (error) return { type: 'error', title: 'Query Failed', message: error.message };
  if (!data?.length) return {
    type: 'narrative', title: 'No blocked items',
    message: `No blocked items across your ${ctx.projectKeys.length} projects right now.`,
    followUp: ['Team workload', 'Aging items', 'Release readiness'],
  };

  const items = data.map(item => {
    const days = Math.ceil((Date.now() - new Date(item.jira_updated_at || item.jira_created_at || Date.now()).getTime()) / 86400000);
    const isAssignee = item.assignee_display_name === ctx.displayName;
    const isReporter = item.reporter_display_name === ctx.displayName;
    return {
      ...item,
      reason: isAssignee ? `Assigned to you · Blocked ${days}d` :
              isReporter ? `You reported this · Blocked ${days}d` :
              `In ${item.project_key} · Blocked ${days}d`,
    };
  });

  return {
    type: 'items',
    title: `${items.length} blocked item${items.length !== 1 ? 's' : ''} in your projects`,
    items,
    followUp: ['Team workload', 'Aging items', 'Unassigned items'],
  };
}

async function fetchTeamWorkload(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select('assignee_display_name, status, project_key')
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .not('assignee_display_name', 'is', null)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .not('status', 'ilike', '%resolved%')
    .limit(500);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No open items', message: 'No open items found in your projects.',
  };

  const memberMap: Record<string, { open: number; blocked: number; project: string }> = {};
  data.forEach(item => {
    const name = item.assignee_display_name!;
    if (!memberMap[name]) memberMap[name] = { open: 0, blocked: 0, project: item.project_key };
    memberMap[name].open++;
    if ((item.status || '').toLowerCase().includes('block')) memberMap[name].blocked++;
  });

  const members = Object.entries(memberMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.open - a.open);

  return {
    type: 'workload',
    title: `Team workload — ${members.length} members across your projects`,
    members,
    followUp: ["Who's overloaded?", 'Show unassigned items', 'Aging items'],
  };
}

async function fetchOverloaded(ctx: UserContext): Promise<QueryResult> {
  const workload = await fetchTeamWorkload(ctx);
  if (workload.type !== 'workload' || !workload.members) return workload;

  const avg = workload.members.reduce((sum: number, m: any) => sum + m.open, 0) / workload.members.length;
  const alerts = workload.members
    .filter((m: any) => m.open > avg * 1.3 || m.open >= 6)
    .map((m: any) => ({
      ...m,
      severity: m.open >= 7 ? 'high' : 'medium',
      note: m.blocked > 0
        ? `${m.open} open items, ${m.blocked} blocked.`
        : `${m.open} open items — above team average of ${Math.round(avg)}.`,
    }));

  const healthy = workload.members.filter((m: any) => m.open <= avg && m.open < 5);

  return {
    type: 'workload-alert',
    title: 'Team capacity analysis',
    alerts,
    healthy,
    followUp: ['Show all unassigned', 'Team workload', 'Aging items'],
  };
}

async function fetchAging(ctx: UserContext): Promise<QueryResult> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .lt('jira_updated_at', twoWeeksAgo)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .not('status', 'ilike', '%resolved%')
    .order('jira_updated_at', { ascending: true })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No aging items',
    message: 'All items in your projects have been updated within the last 2 weeks.',
    followUp: ['My blocked items', 'Team workload', 'Release readiness'],
  };

  const items = data.map(item => ({
    ...item,
    reason: `${Math.ceil((Date.now() - new Date(item.jira_updated_at || Date.now()).getTime()) / 86400000)} days without update`,
  }));

  return {
    type: 'items',
    title: `${items.length} items aging over 2 weeks`,
    items,
    followUp: ['Team workload', 'My blocked items', 'Unassigned items'],
  };
}

async function fetchUnassigned(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .is('assignee_display_name', null)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .order('jira_created_at', { ascending: false })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No unassigned items',
    message: 'All open items in your projects have owners.',
    followUp: ['Team workload', 'My blocked items', 'Release readiness'],
  };

  const items = data.map(item => ({
    ...item,
    assignee_display_name: null,
    reason: `Created ${Math.ceil((Date.now() - new Date(item.jira_created_at || Date.now()).getTime()) / 86400000)}d ago · ${item.priority || 'Medium'} priority`,
  }));

  return {
    type: 'items',
    title: `${items.length} unassigned items in your projects`,
    items,
    followUp: ['Team workload', 'My blocked items', 'Aging items'],
  };
}

async function fetchMyOpen(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .is('jira_removed_at', null)
    .ilike('assignee_display_name', ctx.displayName)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .not('status', 'ilike', '%resolved%')
    .order('jira_updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No open items',
    message: 'You have no open items assigned to you right now.',
    followUp: ['Team workload', 'Project summary', 'Unassigned items'],
  };

  const items = data.map(item => ({
    ...item,
    reason: item.due_date ? `Due ${item.due_date} · ${item.priority || 'Medium'}` : `${item.priority || 'Medium'} priority`,
  }));

  return {
    type: 'items',
    title: `${items.length} open items assigned to you`,
    items,
    followUp: ['My bugs', 'Items due this week', 'My completed work'],
  };
}

async function fetchMyClosed(ctx: UserContext): Promise<QueryResult> {
  const weekStart = getSaudiWeekStart();
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .is('jira_removed_at', null)
    .ilike('assignee_display_name', ctx.displayName)
    .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
    .gte('jira_updated_at', weekStart)
    .order('jira_updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No closures this week',
    message: "You haven't closed any items this Saudi work week yet (Sun-Thu).",
    followUp: ['My open items', 'Team workload', 'Project summary'],
  };

  return {
    type: 'items',
    title: `You closed ${data.length} items this week`,
    items: data.map(item => ({ ...item, reason: `Closed ${formatRelative(item.jira_updated_at)}` })),
    followUp: ['My open items', 'Team workload', 'Release readiness'],
  };
}

async function fetchDueSoon(ctx: UserContext): Promise<QueryResult> {
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (4 - today.getDay() + 7) % 7);

  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .is('jira_removed_at', null)
    .ilike('assignee_display_name', ctx.displayName)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', endOfWeek.toISOString().split('T')[0])
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'Nothing due this week',
    message: 'No items with deadlines this week.',
    followUp: ['My open items', "What's overdue?", 'Team workload'],
  };

  return {
    type: 'items',
    title: `${data.length} items due this week`,
    items: data.map(item => ({ ...item, reason: `Due ${item.due_date}` })),
    followUp: ["What's overdue?", 'My open items', 'Release readiness'],
  };
}

async function fetchMyBugs(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .is('jira_removed_at', null)
    .in('project_key', ctx.projectKeys)
    .or('issue_type.ilike.%defect%,issue_type.ilike.%bug%')
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .order('jira_updated_at', { ascending: false })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No open defects',
    message: 'No open defects in your projects.',
    followUp: ['My open items', 'Team workload', 'Project summary'],
  };

  return {
    type: 'items',
    title: `${data.length} open defects in your projects`,
    items: data.map(item => ({ ...item, reason: `${item.priority || 'Medium'} priority` })),
    followUp: ['My open items', 'Team workload', 'Release readiness'],
  };
}

async function fetchOverdue(ctx: UserContext): Promise<QueryResult> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .lt('due_date', today)
    .not('due_date', 'is', null)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .order('due_date', { ascending: true })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'Nothing overdue',
    message: 'All items in your projects are within deadlines.',
    followUp: ['Due this week', 'Release readiness', 'Team workload'],
  };

  return {
    type: 'items',
    title: `${data.length} overdue items in your projects`,
    items: data.map(item => ({
      ...item,
      reason: `Due ${Math.ceil((Date.now() - new Date(item.due_date!).getTime()) / 86400000)} days ago`,
    })),
    followUp: ['My blocked items', 'Team workload', 'Aging items'],
  };
}

async function fetchReopened(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .or('status.ilike.%re-open%,status.ilike.%reopen%,status.ilike.%re open%')
    .order('jira_updated_at', { ascending: false })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No reopened items',
    message: 'No reopened items across your projects.',
    followUp: ['My blocked items', 'Team workload', 'Aging items'],
  };

  return {
    type: 'items',
    title: `${data.length} reopened items in your projects`,
    items: data.map(item => ({ ...item, reason: `Reopened · ${item.project_key}` })),
    followUp: ['My blocked items', 'Aging items', 'Team workload'],
  };
}

async function fetchReleaseReadiness(ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select('project_key, status, status_category')
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .not('status', 'ilike', '%cancelled%')
    .limit(500);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative', title: 'No release data', message: 'No items found for release analysis.',
  };

  const projectStats: Record<string, { total: number; done: number; inProgress: number; blocked: number }> = {};
  data.forEach(item => {
    const p = item.project_key;
    if (!projectStats[p]) projectStats[p] = { total: 0, done: 0, inProgress: 0, blocked: 0 };
    projectStats[p].total++;
    const s = (item.status || '').toLowerCase();
    if (item.status_category === 'Done' || s.includes('done') || s.includes('closed') || s.includes('resolved')) projectStats[p].done++;
    else if (s.includes('block') || s.includes('impediment')) projectStats[p].blocked++;
    else if (s.includes('progress') || s.includes('review') || s.includes('test')) projectStats[p].inProgress++;
  });

  const releases = Object.entries(projectStats).map(([project, stats]) => ({
    name: `${project} Release`,
    project,
    ...stats,
    health: stats.blocked > 0 ? 'at-risk' : (stats.done / stats.total > 0.6 ? 'on-track' : 'at-risk'),
  }));

  return {
    type: 'release',
    title: `Release readiness — ${releases.length} projects`,
    releases,
    followUp: ['My blocked items', 'Aging items', 'Team workload'],
  };
}

async function fetchProjectSummary(ctx: UserContext): Promise<QueryResult> {
  const weekStart = getSaudiWeekStart();
  const [totalR, blockedR, closedR, myOpenR] = await Promise.all([
    supabase.from('ph_issues').select('*', { count: 'exact', head: true }).in('project_key', ctx.projectKeys).is('jira_removed_at', null),
    supabase.from('ph_issues').select('*', { count: 'exact', head: true }).in('project_key', ctx.projectKeys).is('jira_removed_at', null)
      .or('status.ilike.%blocked%,status.ilike.%impediment%'),
    supabase.from('ph_issues').select('*', { count: 'exact', head: true }).in('project_key', ctx.projectKeys).is('jira_removed_at', null)
      .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status_category.eq.Done')
      .gte('jira_updated_at', weekStart),
    supabase.from('ph_issues').select('*', { count: 'exact', head: true }).is('jira_removed_at', null)
      .ilike('assignee_display_name', ctx.displayName)
      .not('status', 'ilike', '%done%').not('status', 'ilike', '%closed%'),
  ]);

  return {
    type: 'narrative',
    title: 'Your portfolio summary',
    message: `Across your ${ctx.projectKeys.length} projects (${ctx.projectKeys.join(', ')}): ${totalR.count || 0} total items, ${blockedR.count || 0} blocked, ${closedR.count || 0} closed this week. You have ${myOpenR.count || 0} open items assigned to you.`,
    followUp: ['My blocked items', 'Team workload', 'Release readiness', 'Aging items'],
  };
}

async function fetchItemByKey(key: string, ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .eq('issue_key', key)
    .is('jira_removed_at', null)
    .maybeSingle();

  if (error) return { type: 'error', title: 'Lookup failed', message: error.message };
  if (!data) return {
    type: 'narrative', title: `${key} not found`,
    message: `Could not find ${key}. It may not have been synced yet.`,
    followUp: ['My open items', 'Team workload'],
  };

  const isAssignee = data.assignee_display_name === ctx.displayName;
  const isReporter = data.reporter_display_name === ctx.displayName;

  return {
    type: 'items',
    title: `${data.issue_key}: ${data.summary}`,
    items: [{
      ...data,
      reason: isAssignee ? 'Assigned to you' : isReporter ? 'You reported this' :
              ctx.projectKeys.includes(data.project_key) ? `In your project ${data.project_key}` : 'Not in your projects',
    }],
    followUp: [`Show more in ${data.project_key}`, 'My blocked items', 'Team workload'],
  };
}

async function fetchPersonItems(name: string, ctx: UserContext): Promise<QueryResult> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(FIELDS)
    .in('project_key', ctx.projectKeys)
    .is('jira_removed_at', null)
    .ilike('assignee_display_name', `%${name}%`)
    .not('status', 'ilike', '%done%')
    .not('status', 'ilike', '%closed%')
    .order('jira_updated_at', { ascending: false })
    .limit(15);
  if (error) throw error;

  if (!data?.length) return {
    type: 'narrative',
    title: `No items for "${name}"`,
    message: `Could not find open items assigned to anyone matching "${name}" in your projects.`,
    followUp: ['Team workload', 'Unassigned items'],
  };

  const assigneeName = data[0].assignee_display_name;
  return {
    type: 'items',
    title: `${data.length} open items assigned to ${assigneeName}`,
    items: data.map(item => ({ ...item, reason: `${item.priority || 'Medium'} · ${item.project_key}` })),
    followUp: [`Is ${assigneeName} overloaded?`, 'Team workload'],
  };
}

// ═══ UTILITIES ═══
function getSaudiWeekStart(): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '';
  const days = Math.ceil((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.ceil(days / 7)}w ago`;
}

function getHelpResponse(ctx: UserContext): QueryResult {
  return {
    type: 'help',
    title: `What can I help with, ${ctx.displayName.split(' ')[0]}?`,
    message: `I have context on your ${ctx.projectKeys.length} projects: ${ctx.projectKeys.join(', ')}. Try asking:`,
    followUp: [
      'My blocked items',
      'Team workload',
      'Aging items',
      'Release readiness',
      "What's overdue?",
      'Unassigned items',
    ],
  };
}
