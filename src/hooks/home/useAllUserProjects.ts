/**
 * useAllUserProjects — lightweight, standalone fetch of the user's spaces
 * (Catalyst projects + Jira-only projects the user has issues in).
 *
 * Why this exists (perf — 2026-06-17)
 * ───────────────────────────────────
 * `allUserProjects` was previously a by-product of the heavy `for-you-data`
 * mega query (work items + mentions + comments + starred + attachments, ~20
 * fetches across 3 waves, limit-200 ph_issues SELECTs). The Recommended strip
 * fed off it, so its project cards only painted after that whole aggregate
 * resolved — while the strip's own tiny `products` query (cached 5min) painted
 * the product card first. Result: a visible two-wave stagger on every
 * navigation back to Home.
 *
 * This hook isolates JUST the project-relevant fetches into a separate, fast
 * query (2 parallel waves, all small). It resolves in parallel with — and at
 * comparable speed to — the products query, so all Recommended cards paint
 * together. The mega query is left untouched.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/hooks/useForYouData';

interface CatalystProjectRow {
  id: string;
  key: string;
  name?: string | null;
  avatar_url?: string | null;
  color?: string | null;
}
interface PhIconRow {
  key: string;
  icon: string | null;
  color: string | null;
}
interface JiraNameRow {
  project_key: string;
  name: string;
}

interface BuildAllUserProjectsInput {
  catalystProjects: CatalystProjectRow[];
  phIcons: PhIconRow[];
  jiraNames: JiraNameRow[];
  userIssueProjectKeys: string[];
}

/**
 * Pure merge: Catalyst projects (with ph_projects icon/color overlay) +
 * Jira-only project keys (named via ph_jira_projects), deduped by key,
 * sorted alphabetically by name. Mirrors the contract previously inlined in
 * useForYouData.fetchForYouRawData (lines ~663-680, 1045-1076).
 */
export function buildAllUserProjects({
  catalystProjects,
  phIcons,
  jiraNames,
  userIssueProjectKeys,
}: BuildAllUserProjectsInput): Project[] {
  const phIconMap = new Map<string, { icon: string | null; color: string | null }>();
  phIcons.forEach(r => phIconMap.set(r.key, { icon: r.icon, color: r.color }));

  const nameMap = new Map<string, string>();
  jiraNames.forEach(p => nameMap.set(p.project_key, p.name));

  const stableProjects: Project[] = [];
  const existingKeys = new Set<string>();

  catalystProjects.forEach(p => {
    if (!p.key) return;
    const ph = phIconMap.get(p.key);
    stableProjects.push({
      id: p.id,
      key: p.key,
      name: p.name || p.key,
      avatar_url: p.avatar_url ?? null,
      icon: ph?.icon ?? null,
      color: ph?.color ?? p.color ?? null,
    });
    existingKeys.add(p.key);
  });

  for (const key of [...new Set(userIssueProjectKeys.filter(Boolean))]) {
    if (existingKeys.has(key)) continue;
    stableProjects.push({
      id: key,
      key,
      name: nameMap.get(key) || key,
      avatar_url: null,
      icon: null,
      color: null,
    });
    existingKeys.add(key);
  }

  return stableProjects.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve the user's Jira account IDs (for scoping the ph_issues project-key
 * lookup) the same way useForYouData does: ph_user_mapping → name fallback →
 * profiles.jira_account_id.
 */
async function resolveJiraAccountIds(userId: string): Promise<string[]> {
  const [profileResult, mappingsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, jira_account_id').eq('id', userId).single(),
    supabase.from('ph_user_mapping').select('jira_account_id').eq('catalyst_profile_id', userId).eq('is_mapped', true),
  ]);
  const profileData = profileResult.data as { full_name?: string | null; jira_account_id?: string | null } | null;

  let ids: string[] = [];
  if (mappingsResult.data && mappingsResult.data.length > 0) {
    ids = mappingsResult.data.map((m: any) => m.jira_account_id).filter(Boolean);
  } else if (profileData?.full_name) {
    const { data: nameMatches } = await supabase
      .from('ph_user_mapping')
      .select('jira_account_id')
      .ilike('jira_display_name', `%${profileData.full_name}%`)
      .eq('is_mapped', true);
    if (nameMatches && nameMatches.length > 0) {
      ids = nameMatches.map((m: any) => m.jira_account_id).filter(Boolean);
    }
  }
  if (ids.length === 0 && profileData?.jira_account_id) {
    ids = [profileData.jira_account_id];
  }
  return ids;
}

async function fetchAllUserProjects(userId: string): Promise<Project[]> {
  // ── Wave 1: catalyst projects + jira project names + user's jira account ids ──
  const [{ data: catalystProjects }, { data: jiraNames }, jiraAccountIds] = await Promise.all([
    supabase.from('projects').select('id, key, name, avatar_url, color'),
    supabase.from('ph_jira_projects').select('project_key, name'),
    resolveJiraAccountIds(userId),
  ]);

  const catalystKeys = (catalystProjects ?? []).map((p: any) => p.key).filter(Boolean);

  // ── Wave 2: ph_projects icons (catalyst keys) + ph_issues project keys (jira) ──
  const [{ data: phIcons }, { data: userIssueProjects }] = await Promise.all([
    catalystKeys.length > 0
      ? supabase.from('ph_projects').select('key, icon, color').in('key', catalystKeys)
      : Promise.resolve({ data: [] as PhIconRow[] }),
    jiraAccountIds.length > 0
      ? supabase.from('ph_issues').select('project_key').in('assignee_account_id', jiraAccountIds).is('deleted_at', null)
      : Promise.resolve({ data: [] as Array<{ project_key: string }> }),
  ]);

  return buildAllUserProjects({
    catalystProjects: (catalystProjects ?? []) as CatalystProjectRow[],
    phIcons: (phIcons ?? []) as PhIconRow[],
    jiraNames: (jiraNames ?? []) as JiraNameRow[],
    userIssueProjectKeys: (userIssueProjects ?? []).map((r: any) => r.project_key).filter(Boolean),
  });
}

export function useAllUserProjects(userId: string | undefined) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['all-user-projects', userId ?? ''],
    queryFn: () => fetchAllUserProjects(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  return { allUserProjects: data, isLoading };
}
