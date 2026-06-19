/**
 * ReleasesTimelineCanonical — /release-hub/timeline
 *
 * 2026-06-19: thin data + mutation adapter that mounts the canonical shared
 * TimelineView per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same Gantt chrome as /project-hub/:key/timeline,
 * /product-hub/:key/timeline, /incident-hub/timeline — only the data
 * source differs:
 *   - Data: rh_releases (cancelled rows hidden) via useReleasesTimeline
 *   - Detail panel: detailEntityKind='release' → CatalystDetailPanel
 *     mounts ReleaseDetailContent (8-tab canonical release detail)
 *   - Detail route (full page): /release-hub/:id
 *
 * Mutations write rh_releases.planned_start_date / planned_release_date.
 * Hierarchy-only mutations (onCreateChild, onChangeParent, onAddDependency)
 * are omitted — releases are flat (no parents / children) and have no
 * issue-links table.
 */

import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  TimelineView,
  type TimelineIssue,
  type TimelineMutations,
} from '@/components/shared/Timeline';
import { useReleasesTimeline, RELEASES_TIMELINE_QUERY_KEY } from '@/hooks/useReleasesTimeline';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

function resolveItemType(_issue: TimelineIssue): string {
  return 'release';
}

export default function ReleasesTimelineCanonical() {
  const queryClient = useQueryClient();
  const { data: tree = [], isLoading, error } = useReleasesTimeline();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: RELEASES_TIMELINE_QUERY_KEY });

  const patchDatesInCache = (releaseId: string, startDate: string | null, dueDate: string | null) => {
    queryClient.setQueryData(
      RELEASES_TIMELINE_QUERY_KEY,
      (old: TimelineIssue[] | undefined) =>
        (old ?? []).map((i) => (i.id === releaseId ? { ...i, startDate, dueDate } : i)),
    );
  };

  const mutations: TimelineMutations = useMemo(() => ({
    /* Date writes target the row by UUID — timeline passes issueKey but our
       rows set issueKey=jira_key|version|id, so we look up by id (UUID) on
       the cached tree to find the right release. */
    onUpdateDates: async (issueKey, startDate, dueDate) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(RELEASES_TIMELINE_QUERY_KEY) ?? [];
      const row = t.find((r) => r.issueKey === issueKey);
      if (!row) return;
      patchDatesInCache(row.id, startDate, dueDate);
      await supabase
        .from('rh_releases')
        .update({
          planned_start_date: startDate,
          planned_release_date: dueDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      invalidate();
    },
    onRemoveDates: async (issueKey) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(RELEASES_TIMELINE_QUERY_KEY) ?? [];
      const row = t.find((r) => r.issueKey === issueKey);
      if (!row) return;
      patchDatesInCache(row.id, null, null);
      await supabase
        .from('rh_releases')
        .update({ planned_start_date: null, planned_release_date: null, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      invalidate();
    },
    onRemoveStartDate: async (issueKey) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(RELEASES_TIMELINE_QUERY_KEY) ?? [];
      const row = t.find((r) => r.issueKey === issueKey);
      if (!row) return;
      patchDatesInCache(row.id, null, row.dueDate);
      await supabase
        .from('rh_releases')
        .update({ planned_start_date: null, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      invalidate();
    },
    onRemoveDueDate: async (issueKey) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(RELEASES_TIMELINE_QUERY_KEY) ?? [];
      const row = t.find((r) => r.issueKey === issueKey);
      if (!row) return;
      patchDatesInCache(row.id, row.startDate, null);
      await supabase
        .from('rh_releases')
        .update({ planned_release_date: null, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      invalidate();
    },
    onCreateEpic: async (summary) => {
      const now = new Date().toISOString();
      /* rh_releases.target_date is NOT NULL (legacy migration 20260309).
         Seed it with today so the insert succeeds; the user reschedules via
         the EmptyRowAdd "+" on the grid which writes planned_*. */
      const todayDate = new Date().toISOString().slice(0, 10);
      const { data, error: insErr } = await supabase
        .from('rh_releases')
        .insert({
          name: summary,
          status: 'draft',
          source: 'catalyst',
          target_date: todayDate,
          created_at: now,
          updated_at: now,
        } as any)
        .select('id, name, jira_key, version')
        .single();
      if (insErr) throw insErr;
      const optimistic: TimelineIssue = {
        id: (data as any).id,
        issueKey: (data as any).jira_key ?? (data as any).version ?? `RELEASE-LOCAL-${(data as any).id}`,
        projectKey: 'RELEASES',
        issueType: 'Release',
        summary,
        status: 'draft',
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
      invalidate();
      return optimistic;
    },
    /* 2026-06-19: onCreateChild surface enables the per-row "+" hover button
       that project / product timelines show. Releases are flat (no parents),
       so the per-row "+" creates ANOTHER top-level release — same effect as
       the bottom "Create release" button, just discoverable from any row. */
    onCreateChild: async (_parentKey, _parentType, _type, summary) => {
      const now = new Date().toISOString();
      /* rh_releases.target_date is NOT NULL (legacy migration 20260309).
         Seed it with today so the insert succeeds; the user reschedules via
         the EmptyRowAdd "+" on the grid which writes planned_*. */
      const todayDate = new Date().toISOString().slice(0, 10);
      const { data, error: insErr } = await supabase
        .from('rh_releases')
        .insert({
          name: summary,
          status: 'draft',
          source: 'catalyst',
          target_date: todayDate,
          created_at: now,
          updated_at: now,
        } as any)
        .select('id, name, jira_key, version')
        .single();
      if (insErr) throw insErr;
      const optimistic: TimelineIssue = {
        id: (data as any).id,
        issueKey: (data as any).jira_key ?? (data as any).version ?? `RELEASE-LOCAL-${(data as any).id}`,
        projectKey: 'RELEASES',
        issueType: 'Release',
        summary,
        status: 'draft',
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
      invalidate();
      return optimistic;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [queryClient]);

  return (
    <TimelineView
      items={tree}
      isLoading={isLoading}
      error={error}
      chromeBand={<ProjectPageHeader projectKey="RELEASES" hubType="release" />}
      hubLabel="Releases"
      hubKey="release-hub"
      filterOptions={{
        workItemTypes: ['Release'],
        enableSavedFilters: false,
      }}
      buildIssueDetailRoute={(issueKey) => {
        const row = (queryClient.getQueryData<TimelineIssue[]>(RELEASES_TIMELINE_QUERY_KEY) ?? [])
          .find((r) => r.issueKey === issueKey);
        return `/release-hub/${row?.id ?? issueKey}`;
      }}
      resolveItemType={resolveItemType}
      detailRouteOwnerKey="RELEASES"
      detailEntityKind="release"
      mutations={mutations}
      menuVariant="jira"
      /* iconType uses the canonical Story icon — 'Release' is not in the
         JiraIssueTypeIcon registry. Only matters in the input creation state. */
      createTopLevelConfig={{ label: 'Create release', iconType: 'Story' }}
      childTypesOverride={['Release']}
    />
  );
}
