/**
 * useProjectBriefing — Single data hook powering the entire landing page.
 * Fetches items, applies tier-based freshness gating, groups by project,
 * sorts by hierarchy, collapses Tier 5-6 items.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserContext } from './useUserContext';
import { getTierConfig, isWithinFreshness, sortByHierarchy, findCommonTitlePattern } from '../workItemHierarchy';

export interface BriefingItem {
  itemKey: string;
  title: string;
  status: string;
  type: string;
  projectKey: string;
  assignee: string | null;
  reporter: string | null;
  updatedAt: string;
  createdAt: string;
  priority: string;
  tier: number;
  tierLabel: string;
  tierColor: string;
  renderMode: 'individual' | 'collapsed';
  daysSinceUpdate: number;
  involvement: string;
}

export interface CollapsedGroup {
  tierLabel: string;
  tierColor: string;
  count: number;
  titleSummary: string;
  assignees: string[];
  latestActivity: string;
  items: BriefingItem[];
}

export interface ProjectGroup {
  projectKey: string;
  projectName: string;
  projectColor: string;
  individualItems: BriefingItem[];
  collapsedGroups: CollapsedGroup[];
  hasIncident: boolean;
}

export interface WeekNarrative {
  byType: Record<string, number>;
  teamTotal: number;
  myTotal: number;
  projectBreakdown: Record<string, number>;
  topAchievement: string | null;
}

const PROJECT_COLORS: Record<string, string> = {
  BAU: '#4C6EF5', SIMP: '#FA8C16', MDT: '#52C41A', MWR: '#13C2C2',
  IRP: '#EB2F96', ICP: '#722ED1', IP: '#36CFC9', TAH: '#2F54EB',
};

function getSaudiWeekStart(): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday = 0
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

export function useProjectBriefing(userCtx: UserContext | undefined) {
  return useQuery({
    queryKey: ['project-briefing', userCtx?.userId],
    queryFn: async (): Promise<{ projects: ProjectGroup[]; weekNarrative: WeekNarrative }> => {
      if (!userCtx) throw new Error('No user context');
      const now = Date.now();
      const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();

      // ═══ FETCH ALL ITEMS IN USER'S PROJECTS (last 14 days max window) ═══
      const { data: rawItems, error } = await supabase
        .from('ph_issues')
        .select(`
          issue_key, summary, status, issue_type, project_key, project_name,
          assignee_display_name, assignee_account_id, reporter_display_name, reporter_account_id,
          jira_updated_at, jira_created_at, priority
        `)
        .in('project_key', userCtx.projectKeys)
        .is('jira_removed_at', null)
        .gte('jira_updated_at', fourteenDaysAgo)
        .not('status', 'ilike', '%cancelled%')
        .order('jira_updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // ═══ APPLY TIER-BASED FRESHNESS FILTER ═══
      const freshItems: BriefingItem[] = (rawItems || [])
        .map(item => {
          const cfg = getTierConfig(item.issue_type);
          const daysSince = Math.ceil((now - new Date(item.jira_updated_at || item.jira_created_at || now).getTime()) / 86400000);
          const isAssignee = (item.assignee_display_name || '').toLowerCase() === userCtx.displayName.toLowerCase();
          const isReporter = (item.reporter_display_name || '').toLowerCase() === userCtx.displayName.toLowerCase();

          return {
            itemKey: item.issue_key,
            title: item.summary,
            status: item.status,
            type: item.issue_type,
            projectKey: item.project_key,
            assignee: item.assignee_display_name,
            reporter: item.reporter_display_name,
            updatedAt: item.jira_updated_at || item.jira_created_at || new Date().toISOString(),
            createdAt: item.jira_created_at || '',
            priority: item.priority || 'Medium',
            tier: cfg.tier,
            tierLabel: cfg.label,
            tierColor: cfg.color,
            renderMode: cfg.renderMode,
            daysSinceUpdate: daysSince,
            involvement: isAssignee ? 'Assigned to you' :
                        isReporter ? 'You reported this' : 'In your project',
          };
        })
        .filter(item => {
          const cfg = getTierConfig(item.type);
          return isWithinFreshness(item.updatedAt, cfg);
        });

      // ═══ GROUP BY PROJECT ═══
      const projectMap: Record<string, BriefingItem[]> = {};
      freshItems.forEach(item => {
        if (!projectMap[item.projectKey]) projectMap[item.projectKey] = [];
        projectMap[item.projectKey].push(item);
      });

      // ═══ BUILD PROJECT GROUPS ═══
      const projects: ProjectGroup[] = Object.entries(projectMap)
        .map(([projectKey, items]) => {
          const sorted = sortByHierarchy(items);
          const individualItems = sorted.filter(i => i.renderMode === 'individual');
          const collapsibleItems = sorted.filter(i => i.renderMode === 'collapsed');

          // Collapse Tier 5-6 by tierLabel
          const collapsedMap: Record<string, BriefingItem[]> = {};
          collapsibleItems.forEach(item => {
            if (!collapsedMap[item.tierLabel]) collapsedMap[item.tierLabel] = [];
            collapsedMap[item.tierLabel].push(item);
          });

          const collapsedGroups: CollapsedGroup[] = Object.entries(collapsedMap).map(([label, groupItems]) => {
            const titles = groupItems.map(i => i.title);
            const commonTitle = findCommonTitlePattern(titles);
            const assignees = [...new Set(groupItems.map(i => i.assignee).filter(Boolean))] as string[];

            return {
              tierLabel: label,
              tierColor: groupItems[0].tierColor,
              count: groupItems.length,
              titleSummary: commonTitle,
              assignees,
              latestActivity: groupItems[0].updatedAt,
              items: groupItems,
            };
          });

          const hasIncident = items.some(i =>
            getTierConfig(i.type).tier === 4 &&
            !(i.status || '').toLowerCase().match(/done|closed|resolved/)
          );

          // Get project name from first item
          const projName = (rawItems || []).find(r => r.project_key === projectKey)?.project_name || projectKey;

          return {
            projectKey,
            projectName: projName,
            projectColor: PROJECT_COLORS[projectKey] || '#8B8FA3',
            individualItems: individualItems.slice(0, 5),
            collapsedGroups,
            hasIncident,
          };
        })
        .sort((a, b) => {
          if (a.hasIncident && !b.hasIncident) return -1;
          if (!a.hasIncident && b.hasIncident) return 1;
          const aCount = a.individualItems.length + a.collapsedGroups.reduce((s, g) => s + g.count, 0);
          const bCount = b.individualItems.length + b.collapsedGroups.reduce((s, g) => s + g.count, 0);
          return bCount - aCount;
        })
        .filter(p => p.individualItems.length > 0 || p.collapsedGroups.length > 0);

      // ═══ WEEK NARRATIVE (hierarchy-aware) ═══
      const weekStart = getSaudiWeekStart();
      const { data: weekData } = await supabase
        .from('ph_issues')
        .select('issue_type, project_key, assignee_display_name')
        .in('project_key', userCtx.projectKeys)
        .is('jira_removed_at', null)
        .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
        .gte('jira_updated_at', weekStart);

      const byType: Record<string, number> = {};
      const projectBreakdown: Record<string, number> = {};
      let myTotal = 0;

      (weekData || []).forEach(item => {
        const cfg = getTierConfig(item.issue_type);
        // Exclude Sub-tasks from narrative
        if (cfg.tier < 6) {
          byType[cfg.label] = (byType[cfg.label] || 0) + 1;
        }
        const pk = item.project_key;
        projectBreakdown[pk] = (projectBreakdown[pk] || 0) + 1;
        if (item.assignee_display_name === userCtx.displayName) {
          myTotal++;
        }
      });

      // Top achievement = highest tier closed item
      const tierPriority = ['INITIATIVE', 'BUSINESS REQUEST', 'EPIC', 'STORY', 'PRODUCTION INCIDENT', 'DEFECT'];
      let topAchievement: string | null = null;
      for (const tp of tierPriority) {
        if (byType[tp] && byType[tp] > 0) {
          topAchievement = `${byType[tp]} ${tp.toLowerCase()}${byType[tp] > 1 ? 's' : ''} completed`;
          break;
        }
      }

      return {
        projects,
        weekNarrative: {
          byType,
          teamTotal: (weekData || []).length,
          myTotal,
          projectBreakdown,
          topAchievement,
        },
      };
    },
    enabled: !!userCtx,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 2 * 60_000,
  });
}
