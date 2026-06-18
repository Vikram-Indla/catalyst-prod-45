/**
 * IncidentTimelinePage — /incident-hub/timeline
 *
 * 2026-06-17: thin data + mutation adapter that mounts the canonical
 * shared TimelineView per CLAUDE.md "ADOPT CANONICAL COMPONENTS — DO NOT
 * REIMPLEMENT". Same Gantt chrome as /project-hub/:key/timeline and
 * /product-hub/:key/timeline — only the data source differs:
 *   - Data: ph_issues filtered to issue_type='Production Incident'
 *           (cross-project) via useIncidentHubTimeline
 *   - Saved filters: hubScope='project', projectKey='INCIDENTS' sentinel
 *   - Detail route: /incident-hub/view/:id (matches IncidentHub detail page)
 *
 * Mutations write to ph_issues exactly like the project-hub timeline —
 * incidents are ph_issues rows, so the same update paths apply.
 */

import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  TimelineView,
  type TimelineIssue,
  type TimelineMutations,
  DEFAULT_WORK_ITEM_TYPES,
} from '@/components/shared/Timeline';
import {
  useIncidentHubTimeline,
  INCIDENT_TIMELINE_QUERY_KEY,
} from '@/hooks/useIncidentHubTimeline';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

function resolveItemType(issue: TimelineIssue): string {
  const rawType = (issue.issueType ?? 'Production Incident').toLowerCase();
  return rawType === 'qa bug' || rawType === 'defect' ? 'defect'
    : rawType === 'production incident' ? 'incident'
    : rawType === 'business request' ? 'business_request'
    : rawType === 'change request' ? 'change_request'
    : rawType;
}

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

export default function IncidentTimelinePage() {
  const queryClient = useQueryClient();
  const { data: tree = [], isLoading, error } = useIncidentHubTimeline();
  /* Saved filters scoped to the INCIDENTS sentinel — same convention used
     by /incident-hub/filters. */
  const { data: savedFilters = [] } = useFiltersForProject('INCIDENTS', 'project');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: INCIDENT_TIMELINE_QUERY_KEY });

  const fetchIssueRawJson = async (issueKey: string) => {
    const { data: row } = await (supabase as any)
      .from('ph_issues').select('raw_json').eq('issue_key', issueKey).single();
    return row?.raw_json ?? null;
  };

  const patchDatesInCache = (issueKey: string, startDate: string | null, dueDate: string | null) => {
    queryClient.setQueryData(
      INCIDENT_TIMELINE_QUERY_KEY,
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
       AND `raw_json.fields.duedate`. The detail view reads the column,
       the timeline historically only wrote raw_json — keeping them in
       sync means dates round-trip between surfaces. */
    /* 2026-06-17: ALWAYS write raw_json — even when the row has no prior
       raw_json (Catalyst-created incidents start with raw_json=null).
       Skipping the raw_json write when raw was null meant the start date
       (which only lives at raw_json.fields.customfield_10015) was silently
       dropped — only the due_date column persisted → reader returned
       startDate=null → diamond instead of bar. */
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
    onRemoveStartDate: async (issueKey) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(INCIDENT_TIMELINE_QUERY_KEY) ?? [];
      const found = findIssueDeep(t, issueKey);
      patchDatesInCache(issueKey, null, found?.dueDate ?? null);
      const raw = (await fetchIssueRawJson(issueKey)) ?? { fields: {} };
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), customfield_10015: null } };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },
    onRemoveDueDate: async (issueKey) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(INCIDENT_TIMELINE_QUERY_KEY) ?? [];
      const found = findIssueDeep(t, issueKey);
      patchDatesInCache(issueKey, found?.startDate ?? null, null);
      const raw = (await fetchIssueRawJson(issueKey)) ?? { fields: {} };
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), duedate: null } };
      await (supabase as any).from('ph_issues').update({
        due_date: null,
        raw_json: updated,
      }).eq('issue_key', issueKey);
      invalidate();
    },
    onReorderSibling: async (issueKey, direction) => {
      const t = queryClient.getQueryData<TimelineIssue[]>(INCIDENT_TIMELINE_QUERY_KEY) ?? [];
      const located = locateSiblings(t, issueKey);
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

      queryClient.setQueryData(
        INCIDENT_TIMELINE_QUERY_KEY,
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
          (supabase as any).from('ph_issues').update({ position: (s as any).displayOrder }).eq('issue_key', s.issueKey),
        ),
      );
      invalidate();
    },
    onCreateEpic: async (summary) => {
      /* Incidents have no Epic — synthesize a Production Incident at root. */
      const localKey = await generateIssueKey('BAU');
      const optimistic: TimelineIssue = {
        id: '',
        issueKey: localKey,
        projectKey: 'BAU',
        issueType: 'Production Incident',
        summary,
        status: 'Open',
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
        INCIDENT_TIMELINE_QUERY_KEY,
        (old: TimelineIssue[] | undefined) => [...(old ?? []), optimistic],
      );
      try {
        await (supabase as any).from('ph_issues').insert({
          issue_key: localKey,
          project_key: 'BAU',
          issue_type: 'Production Incident',
          summary,
          status: 'Open',
          source: 'catalyst',
          jira_created_at: new Date().toISOString(),
        });
        invalidate();
        return optimistic;
      } catch (err) {
        queryClient.setQueryData(
          INCIDENT_TIMELINE_QUERY_KEY,
          (old: TimelineIssue[] | undefined) => (old ?? []).filter(i => i.issueKey !== localKey),
        );
        throw err;
      }
    },
    onCreateChild: async (parentKey, _parentType, type, summary) => {
      const localKey = await generateIssueKey('BAU');
      const optimistic: TimelineIssue = {
        id: '',
        issueKey: localKey,
        projectKey: 'BAU',
        issueType: type,
        summary,
        status: 'Open',
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
        INCIDENT_TIMELINE_QUERY_KEY,
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
          project_key: 'BAU',
          issue_type: type,
          summary,
          status: 'Open',
          source: 'catalyst',
          parent_key: parentKey,
          jira_created_at: new Date().toISOString(),
        });
        invalidate();
        return optimistic;
      } catch (err) {
        queryClient.setQueryData(
          INCIDENT_TIMELINE_QUERY_KEY,
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
      queryClient.setQueryData(INCIDENT_TIMELINE_QUERY_KEY, (old: TimelineIssue[] | undefined) => {
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
  }), [queryClient]);

  return (
    <TimelineView
      items={tree}
      isLoading={isLoading}
      error={error}
      chromeBand={<ProjectPageHeader projectKey="INCIDENTS" hubType="incident" />}
      hubLabel="Incidents"
      hubKey="incident-hub"
      filterOptions={{
        workItemTypes: DEFAULT_WORK_ITEM_TYPES,
        enableSavedFilters: true,
        savedFilters,
      }}
      buildIssueDetailRoute={(issueKey) => `/incident-hub/backlog/${issueKey}`}
      resolveItemType={resolveItemType}
      detailRouteOwnerKey="INCIDENTS"
      mutations={mutations}
      menuVariant="jira"
    />
  );
}
