/**
 * ProjectHubTimelinePage — /project-hub/:key/timeline
 *
 * Thin data + mutation adapter that mounts the canonical shared TimelineView.
 * The full visual + interaction shell lives in `src/components/shared/Timeline/`
 * so the product hub timeline reuses the exact same UI primitives.
 *
 * Responsibilities here:
 *   - fetch ph_issues data via useProjectHubTimeline
 *   - fetch saved filters + project display name
 *   - implement project-side mutations against ph_issues
 *   - tell TimelineView how to build full-page detail routes and resolve item types
 */

import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import {
  TimelineView,
  type TimelineIssue,
  type TimelineMutations,
  DEFAULT_WORK_ITEM_TYPES,
} from '@/components/shared/Timeline';
import { useProjectHubTimeline } from '@/hooks/useProjectHubTimeline';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import { useJiraProjects } from '@/hooks/workhub/useJiraProjects';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';

function resolveItemType(issue: TimelineIssue): string {
  const rawType = (issue.issueType ?? 'Story').toLowerCase();
  return rawType === 'qa bug' || rawType === 'defect' ? 'defect'
    : rawType === 'production incident' ? 'incident'
    : rawType === 'business request' ? 'business_request'
    : rawType === 'change request' ? 'change_request'
    : rawType;
}

/* Walk the timeline tree to find an issue by key. Returns the node or null. */
function findIssueDeep(list: TimelineIssue[], key: string): TimelineIssue | null {
  for (const n of list) {
    if (n.issueKey === key) return n;
    if (n.children.length) {
      const inner = findIssueDeep(n.children, key);
      if (inner) return inner;
    }
  }
  return null;
}

/* Walk the timeline tree to find the sibling list (same-parent peers) of
 * a given issue. Top-level rows return the root list. */
function locateSiblings(
  tree: TimelineIssue[],
  key: string,
): { siblings: TimelineIssue[] } | null {
  if (tree.some(t => t.issueKey === key)) return { siblings: tree };
  const dive = (list: TimelineIssue[]): TimelineIssue[] | null => {
    for (const n of list) {
      if (n.children.some(c => c.issueKey === key)) return n.children;
      if (n.children.length) {
        const inner = dive(n.children);
        if (inner) return inner;
      }
    }
    return null;
  };
  const siblings = dive(tree);
  return siblings ? { siblings } : null;
}

export default function ProjectHubTimelinePage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const locateKey = searchParams.get('locate');
  const queryClient = useQueryClient();
  const { data: tree = [], isLoading, error } = useProjectHubTimeline(projectKey);
  const { data: savedFilters = [] } = useFiltersForProject(projectKey, 'project');
  const { data: jiraProjects = [] } = useJiraProjects();

  const projectName = useMemo(() => {
    const proj = jiraProjects.find(p => p.project_key === (projectKey ?? '').toUpperCase());
    return proj?.name ?? projectKey ?? 'Releases';
  }, [jiraProjects, projectKey]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project-hub-timeline', projectKey] });

  const fetchIssueRawJson = async (issueKey: string) => {
    const { data: row } = await (supabase as any)
      .from('ph_issues').select('raw_json').eq('issue_key', issueKey).single();
    return row?.raw_json ?? null;
  };

  /* Optimistically patch dates on a single issue inside the React Query cache.
     Runs BEFORE the Supabase round-trip so the bar holds its dragged position
     across the entire write — no flicker back to original between
     setDragging(null) and refetch completion. */
  const patchDatesInCache = (issueKey: string, startDate: string | null, dueDate: string | null) => {
    queryClient.setQueryData(
      ['project-hub-timeline', projectKey],
      (old: TimelineIssue[] | undefined) => {
        function patch(list: TimelineIssue[]): TimelineIssue[] {
          return list.map(i => {
            if (i.issueKey === issueKey) return { ...i, startDate, dueDate };
            if (i.children.length) return { ...i, children: patch(i.children) };
            return i;
          });
        }
        return patch(old ?? []);
      },
    );
  };

  const mutations: TimelineMutations = useMemo(() => ({
    fetchIssueRawJson,
    /* 2026-06-17: write due dates to BOTH the dedicated `due_date` column
       AND `raw_json.fields.duedate` so the timeline and detail-view stay
       in sync — detail view reads/writes the column, the timeline
       historically only touched raw_json. */
    /* 2026-06-17: ALWAYS write raw_json (stub if it didn't exist). Skipping
       the raw_json write when raw was null silently dropped the start date
       for Catalyst-created rows — the column has due_date but the start
       lives only in raw_json.fields.customfield_10015, so the row read back
       as startDate=null → diamond instead of bar. */
    onUpdateDates: async (issueKey, startDate, dueDate) => {
      patchDatesInCache(issueKey, startDate, dueDate);
      const raw = (await fetchIssueRawJson(issueKey)) ?? { fields: {} };
      const updated = {
        ...raw,
        fields: { ...(raw.fields ?? {}), customfield_10015: startDate, duedate: dueDate },
      };
      await (supabase as any).from('ph_issues').update({
        due_date: dueDate,
        raw_json: updated,
      }).eq('issue_key', issueKey);
      invalidate();
    },
    onRemoveDates: async (issueKey) => {
      patchDatesInCache(issueKey, null, null);
      const raw = (await fetchIssueRawJson(issueKey)) ?? { fields: {} };
      const updated = {
        ...raw,
        fields: { ...(raw.fields ?? {}), customfield_10015: null, duedate: null },
      };
      await (supabase as any).from('ph_issues').update({
        due_date: null,
        raw_json: updated,
      }).eq('issue_key', issueKey);
      invalidate();
    },
    /* Remove only the start date — keep due. */
    onRemoveStartDate: async (issueKey) => {
      const tree = queryClient.getQueryData<TimelineIssue[]>(['project-hub-timeline', projectKey]) ?? [];
      const found = findIssueDeep(tree, issueKey);
      patchDatesInCache(issueKey, null, found?.dueDate ?? null);
      const raw = (await fetchIssueRawJson(issueKey)) ?? { fields: {} };
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), customfield_10015: null } };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    /* Remove only the due date — keep start. */
    onRemoveDueDate: async (issueKey) => {
      const tree = queryClient.getQueryData<TimelineIssue[]>(['project-hub-timeline', projectKey]) ?? [];
      const found = findIssueDeep(tree, issueKey);
      patchDatesInCache(issueKey, found?.startDate ?? null, null);
      const raw = (await fetchIssueRawJson(issueKey)) ?? { fields: {} };
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), duedate: null } };
      await (supabase as any).from('ph_issues').update({
        due_date: null,
        raw_json: updated,
      }).eq('issue_key', issueKey);
      invalidate();
    },
    /* Reorder a row among its siblings. Rather than trying to compute a
       midpoint between two neighbours (fragile when existing positions
       are null or collide), we full-resequence the sibling list: every
       sibling gets a fresh sparse rank `(i+1)*1024` reflecting its new
       visual position, then those ranks are written to ph_issues.position
       in parallel. Cheap (typical sibling count ≤20) and deterministic. */
    onReorderSibling: async (issueKey, direction) => {
      const tree = queryClient.getQueryData<TimelineIssue[]>(['project-hub-timeline', projectKey]) ?? [];
      const located = locateSiblings(tree, issueKey);
      if (!located) return;
      const { siblings } = located;
      const idx = siblings.findIndex(s => s.issueKey === issueKey);
      if (idx === -1 || siblings.length <= 1) return;

      let newIdx: number;
      if (direction === 'first') newIdx = 0;
      else if (direction === 'last') newIdx = siblings.length - 1;
      else if (direction === 'up') newIdx = Math.max(0, idx - 1);
      else newIdx = Math.min(siblings.length - 1, idx + 1);
      if (newIdx === idx) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(newIdx, 0, moved);
      const ranked = reordered.map((s, i) => ({ ...s, displayOrder: (i + 1) * 1024 }));

      /* Optimistic cache update — replace the sibling list at the level
         that contains the issue. Recurses so nested children at any
         depth are handled. */
      queryClient.setQueryData(
        ['project-hub-timeline', projectKey],
        (old: TimelineIssue[] | undefined) => {
          if (!old) return old;
          const replace = (list: TimelineIssue[]): TimelineIssue[] => {
            if (list.some(c => c.issueKey === issueKey)) return ranked;
            return list.map(n => n.children.length ? { ...n, children: replace(n.children) } : n);
          };
          return replace(old);
        },
      );

      await Promise.all(
        ranked.map(s =>
          (supabase as any).from('ph_issues').update({ position: s.displayOrder }).eq('issue_key', s.issueKey),
        ),
      );
      invalidate();
    },
    onCreateEpic: async (summary, issueType = 'Epic') => {
      if (!projectKey) return null;
    const localKey = await generateIssueKey(projectKey.toUpperCase());
      const optimistic: TimelineIssue = {
        id: '',
        issueKey: localKey,
        projectKey: projectKey.toUpperCase(),
        issueType,
        summary,
        status: 'To Do',
        statusCategory: 'default',
        priority: null,
        startDate: null,
        dueDate: null,
        epicColor: null,
        fixVersions: [],
        assigneeDisplayName: null,
        assigneeAvatarUrl: null,
        parentKey: null,
        children: [],
      };
      queryClient.setQueryData(
        ['project-hub-timeline', projectKey],
        (old: TimelineIssue[] | undefined) => [...(old ?? []), optimistic],
      );
      try {
        await (supabase as any).from('ph_issues').insert({
          issue_key: localKey,
          project_key: projectKey.toUpperCase(),
          issue_type: issueType,
          summary,
          status: 'To Do',
          source: 'catalyst',
          jira_created_at: new Date().toISOString(),
        });
        invalidate();
        return optimistic;
      } catch (err) {
        queryClient.setQueryData(
          ['project-hub-timeline', projectKey],
          (old: TimelineIssue[] | undefined) => (old ?? []).filter(i => i.issueKey !== localKey),
        );
        throw err;
      }
    },
    onCreateChild: async (parentKey, _parentType, type, summary) => {
      if (!projectKey) return null;
    const localKey = await generateIssueKey(projectKey.toUpperCase());
      const optimistic: TimelineIssue = {
        id: '',
        issueKey: localKey,
        projectKey: projectKey.toUpperCase(),
        issueType: type,
        summary,
        status: 'To Do',
        statusCategory: 'default',
        priority: null,
        startDate: null,
        dueDate: null,
        epicColor: null,
        fixVersions: [],
        assigneeDisplayName: null,
        assigneeAvatarUrl: null,
        parentKey,
        children: [],
      };
      queryClient.setQueryData(
        ['project-hub-timeline', projectKey],
        (old: TimelineIssue[] | undefined) => {
          function inject(list: TimelineIssue[]): TimelineIssue[] {
            return list.map(i => {
              if (i.issueKey === parentKey) return { ...i, children: [...i.children, optimistic] };
              if (i.children.length) return { ...i, children: inject(i.children) };
              return i;
            });
          }
          return inject(old ?? []);
        },
      );
      try {
        await (supabase as any).from('ph_issues').insert({
          issue_key: localKey,
          project_key: projectKey.toUpperCase(),
          issue_type: type,
          summary,
          status: 'To Do',
          source: 'catalyst',
          parent_key: parentKey,
          jira_created_at: new Date().toISOString(),
        });
        invalidate();
        return optimistic;
      } catch (err) {
        queryClient.setQueryData(
          ['project-hub-timeline', projectKey],
          (old: TimelineIssue[] | undefined) => {
            function remove(list: TimelineIssue[]): TimelineIssue[] {
              return list.map(i => ({ ...i, children: remove(i.children.filter(c => c.issueKey !== localKey)) }));
            }
            return remove(old ?? []);
          },
        );
        throw err;
      }
    },
    onChangeParent: async (issueKey, newParentKey) => {
      await (supabase as any).from('ph_issues').update({ parent_key: newParentKey }).eq('issue_key', issueKey);
      invalidate();
    },
    onAddDependency: async (issueKey, linkType, targetKey) => {
      const raw = await fetchIssueRawJson(issueKey);
      if (!raw) return;
      const existing = raw.fields?.issuelinks ?? [];
      const newLink = (linkType === 'blocks' || linkType === 'duplicates')
        ? { type: { name: linkType, outward: linkType }, outwardIssue: { key: targetKey } }
        : { type: { name: linkType, inward: linkType }, inwardIssue: { key: targetKey } };
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), issuelinks: [...existing, newLink] } };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    onRemoveDependency: async (issueKey, index) => {
      const raw = await fetchIssueRawJson(issueKey);
      if (!raw) return;
      const links = [...(raw.fields?.issuelinks ?? [])];
      links.splice(index, 1);
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), issuelinks: links } };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    onMoveToRelease: async (issueKey, versionName) => {
      const raw = await fetchIssueRawJson(issueKey);
      if (!raw) return;
      const newFV = versionName ? [{ id: versionName, name: versionName }] : [];
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), fixVersions: newFV } };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    onChangeEpicColor: async (issueKey, hex) => {
      queryClient.setQueryData(['project-hub-timeline', projectKey], (old: TimelineIssue[] | undefined) => {
        function update(list: TimelineIssue[]): TimelineIssue[] {
          return list.map(i => {
            if (i.issueKey === issueKey) return { ...i, epicColor: hex || null };
            if (i.children.length) return { ...i, children: update(i.children) };
            return i;
          });
        }
        return update(old ?? []);
      });
      const raw = await fetchIssueRawJson(issueKey);
      if (!raw) return;
      const fields = { ...(raw.fields ?? {}) };
      if (hex) fields.catalyst_color = hex; else delete fields.catalyst_color;
      await (supabase as any).from('ph_issues').update({ raw_json: { ...raw, fields } }).eq('issue_key', issueKey);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [projectKey, queryClient]);

  return (
    <TimelineView
      items={tree}
      isLoading={isLoading}
      error={error}
      chromeBand={<ProjectPageHeader projectKey={projectKey} />}
      hubLabel={projectName}
      hubKey={`project-${projectKey ?? ''}`}
      filterOptions={{
        workItemTypes: DEFAULT_WORK_ITEM_TYPES,
        enableSavedFilters: true,
        savedFilters,
      }}
      buildIssueDetailRoute={(issueKey) => `/project-hub/${projectKey}/timeline/${issueKey}`}
      buildDependenciesRoute={(issueKey) => `/project-hub/${projectKey}/dependencies?focus=${encodeURIComponent(issueKey)}`}
      resolveItemType={resolveItemType}
      detailRouteOwnerKey={projectKey ?? ''}
      mutations={mutations}
      enableCreateEpicRow
      menuVariant="jira"
      locatedKey={locateKey ?? undefined}
    />
  );
}
