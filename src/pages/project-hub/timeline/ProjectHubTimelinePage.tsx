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
import { useParams } from 'react-router-dom';
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

function resolveItemType(issue: TimelineIssue): string {
  const rawType = (issue.issueType ?? 'Story').toLowerCase();
  return rawType === 'qa bug' || rawType === 'defect' ? 'defect'
    : rawType === 'production incident' ? 'incident'
    : rawType === 'business request' ? 'business_request'
    : rawType === 'change request' ? 'change_request'
    : rawType;
}

export default function ProjectHubTimelinePage() {
  const { key: projectKey } = useParams<{ key: string }>();
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

  const mutations: TimelineMutations = useMemo(() => ({
    fetchIssueRawJson,
    onUpdateDates: async (issueKey, startDate, dueDate) => {
      const raw = await fetchIssueRawJson(issueKey);
      if (!raw) return;
      const updated = {
        ...raw,
        fields: { ...(raw.fields ?? {}), customfield_10015: startDate, duedate: dueDate },
      };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    onRemoveDates: async (issueKey) => {
      const raw = await fetchIssueRawJson(issueKey);
      if (!raw) return;
      const updated = {
        ...raw,
        fields: { ...(raw.fields ?? {}), customfield_10015: null, duedate: null },
      };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    onCreateEpic: async (summary) => {
      if (!projectKey) return null;
      const localKey = `${projectKey.toUpperCase()}-LOCAL-${Date.now()}`;
      const optimistic: TimelineIssue = {
        id: '',
        issueKey: localKey,
        projectKey: projectKey.toUpperCase(),
        issueType: 'Epic',
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
          issue_type: 'Epic',
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
      const localKey = `${projectKey.toUpperCase()}-LOCAL-${Date.now()}`;
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
      resolveItemType={resolveItemType}
      detailRouteOwnerKey={projectKey ?? ''}
      mutations={mutations}
    />
  );
}
