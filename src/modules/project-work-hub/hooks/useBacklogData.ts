import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/hooks/useProjects';
import type { BacklogEpic, BacklogFeature, BacklogStory } from '../types/backlog.types';

const YEAR_2026_START = '2026-01-01T00:00:00Z';

/**
 * Request row shape — pulled from `ph_backlog_initiatives_view` which
 * pre-joins initiative type styling (icon + color) onto ph_requests.
 * This is the "Business Request" layer in Catalyst's hierarchy, sitting
 * one level above Epic. Source of truth per the ProductBacklog ERD
 * (2026-04-18 upload).
 */
export interface RequestRow {
  id: string;
  initiative_key: string;
  title: string;
}

/**
 * useRequestsByKeys — resolves initiative_key values (found as parent_key
 * on Jira issues) to their full Request rows with pre-joined type styling.
 *
 * Per the ProductBacklog ERD (uploaded 2026-04-18):
 *   ph_requests ||--o{ ph_issues : "parent_key = initiative_key"
 *
 * ph_backlog_initiatives_view is a Supabase view that pre-joins
 * ph_requests with initiative_types so icon + color resolve in a single
 * query — no client-side mapping required.
 *
 * Usage: pass the union of parent_keys collected from stories + epics.
 * Any that resolve to an initiative become top-level rows in the backlog.
 * Zero-cost when `keys` is empty (hook is disabled).
 */
export function useRequestsByKeys(keys: string[]) {
  const stableKey = keys.slice().sort().join('|');
  return useQuery({
    queryKey: ['backlog-initiatives-by-keys', stableKey],
    enabled: keys.length > 0,
    queryFn: async (): Promise<Map<string, RequestRow>> => {
      const out = new Map<string, RequestRow>();
      if (keys.length === 0) return out;
      const { data, error } = await supabase
        .from('ph_backlog_initiatives_view')
        .select('id, initiative_key, title')
        .in('initiative_key', keys);
      if (error) throw error;
      for (const row of (data || []) as any[]) {
        out.set(row.initiative_key, row as RequestRow);
      }
      return out;
    },
  });
}

/**
 * useRequestLinksByEpicKeys — resolves epic→initiative associations that
 * live in `ph_issue_links` (the canonical link table written by the Apr 2026
 * InitiativeLinkedItemsTab). This is the SECOND hierarchy path alongside
 * `ph_issues.parent_key`. Returns a Map<epic_issue_key, initiative_key>.
 *
 * Without this, a Product Hub initiative (MIM-* / MDT-*) linked to an Epic
 * never surfaces in the Project backlog tree because `parent_key` on the
 * epic stays NULL.
 */
export function useRequestLinksByEpicKeys(epicKeys: string[]) {
  const stableKey = epicKeys.slice().sort().join('|');
  return useQuery({
    queryKey: ['backlog-initiative-links-by-epic-keys', stableKey],
    enabled: epicKeys.length > 0,
    queryFn: async (): Promise<Map<string, string>> => {
      const out = new Map<string, string>();
      if (epicKeys.length === 0) return out;
      const { data, error } = await supabase
        .from('ph_issue_links')
        .select('source_id, target_id')
        .or(
          `source_id.in.(${epicKeys.join(',')}),target_id.in.(${epicKeys.join(',')})`,
        );
      if (error) return out;
      const epicSet = new Set(epicKeys);
      for (const row of (data || []) as any[]) {
        const s = String(row.source_id ?? '');
        const t = String(row.target_id ?? '');
        const sIsInit = s.startsWith('MIM-') || s.startsWith('MDT-');
        const tIsInit = t.startsWith('MIM-') || t.startsWith('MDT-');
        if (sIsInit && epicSet.has(t)) out.set(t, s);
        else if (tIsInit && epicSet.has(s)) out.set(s, t);
      }
      return out;
    },
  });
}
/**
 * Epic Backlog — pulls from ph_issues where issue_type = 'Epic',
 * project_key resolved from project UUID, filtered to 2026.
 */
export function useEpicBacklog(projectId: string) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? null;

  return useQuery({
    queryKey: ['backlog-epics', projectId, projectKey],
    queryFn: async (): Promise<BacklogEpic[]> => {
      if (!projectKey) return [];
      // F-iter9 unification: ph_issues now holds BOTH Jira-synced and
      // Catalyst-native rows (distinguished by `source` column). Single
      // query replaces the previous two-table parallel + JS merge.
      // Apr 28, 2026: removed `comment_count` from the SELECT. The column
      // does NOT exist on ph_issues — including it caused PostgREST 400
      // (PG error 42703) and React Query treated `epics` as []. Visible
      // symptom: Parent picker on every BAU row showed only "No parent"
      // + "No matches" even though BAU has 13 epics. See CLAUDE.md §9 +
      // §13 FP-012 for the forbidden columns list.
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, assignee_display_name, due_date, priority, parent_key, parent_summary, issue_type, jira_created_at, jira_updated_at, source')
        .eq('project_key', projectKey)
        .eq('issue_type', 'Epic')
        .or(`source.eq.catalyst,jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .order('jira_updated_at', { ascending: false });
      if (error) throw error;

      const epics: BacklogEpic[] = (data || []).map((row: any) => ({
        // F-iter9 PK fix: ph_issues PK is issue_key (text), not id. We populate
        // BacklogItem.id with the issue_key so all downstream lookups (panel,
        // mutations) match the actual DB key.
        id: row.issue_key,
        epic_key: row.issue_key,
        name: row.summary,
        description: null,
        status: row.status,
        assignee_id: null,
        assignee_name: row.assignee_display_name,
        end_date: row.due_date,
        health: null,
        deleted_at: null,
        primary_program_id: null,
        jira_created_at: row.jira_created_at,
        jira_updated_at: row.jira_updated_at,
        source: (row.source === 'catalyst' ? 'catalyst' : 'jira') as 'jira' | 'catalyst',
        priority: row.priority ?? null,
        parent_key: row.parent_key ?? null,
        parent_summary: row.parent_summary ?? null,
        issue_type: row.issue_type ?? 'Epic',
        comment_count: typeof row.comment_count === 'number' ? row.comment_count : null,
      })) as BacklogEpic[];

      return epics;
    },
    enabled: !!projectId && !!projectKey,
  });
}

/**
 * Feature Backlog — not available in Jira for BAU, kept as empty for now.
 */
export function useFeatureBacklog(projectId: string) {
  return useQuery({
    queryKey: ['backlog-features', projectId],
    queryFn: async (): Promise<BacklogFeature[]> => {
      return [];
    },
    enabled: !!projectId,
  });
}

/**
 * Story Backlog — pulls from ph_issues where issue_type = 'Story',
 * project_key resolved from project UUID, filtered to 2026.
 * Parent epic resolved via parent_key lookup.
 */
export function useStoryBacklog(projectId: string) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? null;

  return useQuery({
    // Apr 27, 2026 (L68): bumped query key 'backlog-stories' →
    // 'backlog-stories-v2' so PersistQueryClient discards the stale
    // cached payload that didn't include `issue_type` (added on parent
    // lookups + leaf-row mapping today). Without this bump, the cached
    // localStorage entry rehydrates with `parent_issue_type: undefined`
    // and the Parent column falls back to the 'Story' icon for every
    // row regardless of actual parent type. Per skill L29.
    queryKey: ['backlog-stories-v2', projectId, projectKey],
    queryFn: async (): Promise<BacklogStory[]> => {
      if (!projectKey) return [];
      // F-iter9 unification: single query against ph_issues — Catalyst-native
      // rows are filtered by `source='catalyst'` (year-window OR'd so Jira-
      // synced rows still respect the YEAR_2026_START boundary).
      // Apr 27, 2026 — Backlog scope expansion: include QA Bug + Production
      // Incident alongside Story. The hook is named useStoryBacklog for
      // historical reasons but now serves the unified leaf-item set
      // ('story' | 'bug' | 'incident' in BacklogItem.type). Epics and
      // Features remain in their dedicated hooks.
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category, assignee_display_name, reporter_display_name, due_date, priority, parent_key, parent_summary, jira_created_at, jira_updated_at, source, issue_type')
        .eq('project_key', projectKey)
        .in('issue_type', ['Story', 'QA Bug', 'Production Incident'])
        .or(`source.eq.catalyst,jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .order('jira_updated_at', { ascending: false });
      if (error) throw error;

      const jiraRows = data || [];
      const catRows: any[] = [];  // F-iter9: legacy catalyst_issues fetch removed (table consolidated into ph_issues with source='catalyst')

      // Resolve parent epic keys to get epic info for ParentEpicChip AND
      // for the unified Backlog view's synthesized epic rows.
      //
      // 2026-04 expansion: the old select only pulled id/issue_key/summary,
      // so when BacklogPage synthesizes an epic row from a story's
      // parent_key the epic's Jira status/priority/assignee were blank.
      // We now also select status, priority, assignee_display_name, and the
      // jira timestamps so BacklogPage can render the epic row with its
      // real Jira state (no more "Set status" ghosts on every epic).
      // This is additive — consumers that only read { id, epic_key, name }
      // continue to work.
      const parentKeys = [...new Set(jiraRows.map((s: any) => s.parent_key).filter(Boolean))];
      // Apr 27, 2026 (L54): renamed map values to track ALL parent types
      // (Epic, Feature, Story — anything that can be a parent). Backlog
      // scope expansion brought Defects + Incidents which are commonly
      // parented to Features or Stories, NOT Epics. The old assumption
      // "parent is always an Epic" caused BAU-4466 to render with a
      // hardcoded purple Epic icon in the Parent column even when its
      // actual issue_type is Feature.
      const epicMap: Record<string, {
        id: string;
        epic_key: string | null;
        name: string;
        status: string | null;
        priority: string | null;
        assignee_name: string | null;
        reporter_name: string | null;
        jira_created_at: string | null;
        jira_updated_at: string | null;
        issue_type: string | null;
      }> = {};
      if (parentKeys.length > 0) {
        const { data: epics } = await supabase
          .from('ph_issues')
          .select('issue_key, summary, status, priority, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at, issue_type')
          .in('issue_key', parentKeys)
          .is('archived_at', null);
        if (epics) {
          for (const e of epics) {
            epicMap[e.issue_key] = {
              // F-iter9 PK fix: id <- issue_key
              id: e.issue_key,
              epic_key: e.issue_key,
              name: e.summary,
              status: e.status ?? null,
              priority: (e.priority ? e.priority.toLowerCase() : null),
              assignee_name: e.assignee_display_name ?? null,
              reporter_name: e.reporter_display_name ?? null,
              jira_created_at: e.jira_created_at ?? null,
              jira_updated_at: e.jira_updated_at ?? null,
              // L54: parent's real issue_type — the Parent column reads
              // this so it can render the correct icon (Feature checkbox
              // for a Feature parent, Story bookmark for a Story parent,
              // Epic lightning for an Epic parent — instead of hardcoding
              // Epic for every parent).
              issue_type: e.issue_type ?? null,
            };
          }
        }
      }

      const jiraStories: BacklogStory[] = jiraRows.map((row: any) => ({
        // F-iter9 PK fix: id <- issue_key (no `id` column on ph_issues).
        // Confirmed 2026-04-27 via Postgres information_schema dump
        // (uploads/query-results-export-2026-04-27_08-15-02.csv): ph_issues
        // has issue_key (text NOT NULL) as PK and no UUID id column.
        // The supabase types.ts entry showing ph_issues.id is stale.
        id: row.issue_key,
        story_key: row.issue_key,
        title: row.summary,
        name: row.summary,
        description: null,
        status: row.status,
        feature_id: null,
        assignee_id: null,
        assignee_name: row.assignee_display_name,
        // Reporter — from ph_issues.reporter_display_name (Lovable's 2026-04
        // discovery pass confirmed 100% populated on Jira rows).
        reporter_name: row.reporter_display_name ?? null,
        start_date: row.due_date,
        priority: row.priority?.toLowerCase() ?? null,
        deleted_at: null,
        jira_created_at: row.jira_created_at,
        jira_updated_at: row.jira_updated_at,
        // F-iter9: source comes from the unified ph_issues row (jira | catalyst)
        source: (row.source === 'catalyst' ? 'catalyst' : 'jira') as 'jira' | 'catalyst',
        // Apr 27, 2026: pass through issue_type so the unified Backlog
        // view can derive BacklogItem.type for Story/QA Bug/Production
        // Incident leaf rows.
        issue_type: row.issue_type ?? null,
        // Apr 27, 2026 (L52): pass through raw parent_key/parent_summary
        // so the table's Parent column renders for QA Bug + Production
        // Incident rows whose parent isn't in epicMap (e.g. parent is a
        // Story or Feature, not an Epic).
        parent_key: row.parent_key ?? null,
        parent_summary: row.parent_summary ?? null,
        feature: row.parent_key && epicMap[row.parent_key] ? {
          id: epicMap[row.parent_key].id,
          display_id: null,
          name: row.parent_summary || epicMap[row.parent_key].name,
          epic_id: epicMap[row.parent_key].id,
          epic: epicMap[row.parent_key],
        } : null,
      }));

      const catStories: BacklogStory[] = catRows.map((row: any) => ({
        id: row.id,
        story_key: row.issue_key,
        title: row.title,
        name: row.title,
        description: null,
        status: row.status,
        feature_id: null,
        assignee_id: row.assignee_id,
        assignee_name: null,
        start_date: null,
        priority: row.priority?.toLowerCase() ?? null,
        deleted_at: null,
        jira_created_at: row.created_at,
        jira_updated_at: row.updated_at,
        source: 'catalyst' as const,
        feature: null,
      }));

      // Merge Jira + Catalyst stories WITHOUT duplicating by issue_key.
      // Jira sync can land the same issue in both tables. Jira is the
      // source of truth (more complete fields: reporter, due_date, parent,
      // priority from Jira's workflow). Catalyst rows fill in only when
      // there's no Jira match for that issue_key.
      const seenKeys = new Set(jiraStories.map((s) => s.story_key).filter(Boolean) as string[]);
      const uniqueCat = catStories.filter((s) => !(s.story_key && seenKeys.has(s.story_key)));
      return [...jiraStories, ...uniqueCat];
    },
    enabled: !!projectId && !!projectKey,
    staleTime: 5 * 60 * 1000,
  });
}
