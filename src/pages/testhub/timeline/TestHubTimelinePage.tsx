/**
 * TestHubTimelinePage — /testhub/timeline
 *
 * Thin data + mutation adapter mounting the canonical shared TimelineView — the
 * same component Project Hub and Product Hub use. Rows are test cycles aggregated
 * across ALL projects (see useTestHubTimeline). Date drag persists to
 * tm_test_cycles.planned_start / planned_end.
 *
 * Cycles are flat (no hierarchy), so the create/child/menu/detail-panel surfaces
 * are disabled — only date adjustment is wired.
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import {
  TimelineView,
  type TimelineIssue,
  type TimelineMutations,
} from '@/components/shared/Timeline';
import { useTestHubTimeline } from '@/hooks/useTestHubTimeline';

export default function TestHubTimelinePage() {
  const [searchParams] = useSearchParams();
  const locateKey = searchParams.get('locate');
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, error } = useTestHubTimeline();

  // issueKey ("<PROJECT> CY-001") → cycle UUID, for routing + date writes.
  const idByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) m.set(it.issueKey, it.id);
    return m;
  }, [items]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['testhub-timeline'] });

  const patchDatesInCache = (issueKey: string, startDate: string | null, dueDate: string | null) => {
    queryClient.setQueryData(['testhub-timeline'], (old: TimelineIssue[] | undefined) =>
      (old ?? []).map((i) => (i.issueKey === issueKey ? { ...i, startDate, dueDate } : i)),
    );
  };

  const mutations: TimelineMutations = useMemo(() => ({
    onUpdateDates: async (issueKey, startDate, dueDate) => {
      const id = idByKey.get(issueKey);
      if (!id) return;
      patchDatesInCache(issueKey, startDate, dueDate);
      await (supabase as any)
        .from('tm_test_cycles')
        .update({ planned_start: startDate, planned_end: dueDate })
        .eq('id', id);
      invalidate();
    },
    onRemoveDates: async (issueKey) => {
      const id = idByKey.get(issueKey);
      if (!id) return;
      patchDatesInCache(issueKey, null, null);
      await (supabase as any)
        .from('tm_test_cycles')
        .update({ planned_start: null, planned_end: null })
        .eq('id', id);
      invalidate();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [idByKey, queryClient]);

  return (
    <TimelineView
      filterContext="testhub"
      items={items}
      isLoading={isLoading}
      error={error}
      chromeBand={<ProjectPageHeader projectKey="TESTHUB" hubType="test" />}
      hubLabel="Test Hub"
      hubKey="testhub"
      filterOptions={{ workItemTypes: ['Test Cycle'], enableSavedFilters: false }}
      buildIssueDetailRoute={(issueKey) => {
        const id = idByKey.get(issueKey);
        return id ? `/testhub/cycles/${id}` : '/testhub/cycles';
      }}
      resolveItemType={() => 'test_cycle'}
      detailRouteOwnerKey="TESTHUB"
      buildDependenciesRoute={(issueKey) => {
        const id = idByKey.get(issueKey);
        return id ? `/testhub/dependencies?focus=${encodeURIComponent(id)}` : '/testhub/dependencies';
      }}
      mutations={mutations}
      menuVariant="jira"
      detailEntityKind="test_cycle"
      enableRowCheckbox={false}
      enableInlineCreate={false}
      enableCreateEpicRow={false}
      enableEmptyRowAdd={false}
      locatedKey={locateKey ?? undefined}
    />
  );
}
