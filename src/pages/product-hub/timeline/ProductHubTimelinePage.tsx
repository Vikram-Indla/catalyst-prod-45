/**
 * ProductHubTimelinePage — /product-hub/:key/timeline
 *
 * Thin data + mutation adapter that mounts the canonical shared TimelineView.
 *
 * Product-hub v1 wiring:
 *   - Data source: `business_requests` (flat top-level rows) mapped via
 *     `useProductHubTimeline`. The hook also nests any `ph_issues` rows whose
 *     `parent_key` references a BR — those render as child rows under the BR.
 *   - BRs render as diamond markers (only `end_date`, no startDate).
 *   - ph_issues children render as normal Gantt bars when they carry dates.
 *   - Bottom "Create business request" row → inserts a new BR.
 *   - Per-row "+" on a BR → opens the inline create row and inserts a child
 *     into `ph_issues` with `parent_key = BR.request_key`. Default child
 *     type: `Sub-task` (locked via `childTypesOverride`).
 *   - "Edit dates" / drag-resize updates the correct table:
 *       top-level BR rows → `business_requests.end_date`
 *       ph_issues children → `raw_json.fields.customfield_10015 / duedate`
 *
 * BR creation uses the same MIM-N keyspace as `useKanbanMutations` so the
 * keys are unified across surfaces.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';
import {
  TimelineView,
  type TimelineIssue,
  type TimelineMutations,
} from '@/components/shared/Timeline';
import { useProductHubTimeline } from '@/hooks/useProductHubTimeline';
import { useAuth } from '@/lib/auth';
import { BUSINESS_REQUEST_SUBTASK_TYPES } from '@/components/catalyst-detail-views/shared/parent-rules';
import { nextPos } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';
import { useActiveDemandProcessSteps, stepToLozengeAppearance } from '@/hooks/useDemandProcessSteps';

/* Map a DemandProcessStep's lozenge appearance to a ph_issues
   `status_category` value so the existing children-rendering path
   (mapPhChildRow → StatusPill) colours the pill correctly. */
function lozengeToStatusCategory(appearance: ReturnType<typeof stepToLozengeAppearance>): string {
  if (appearance === 'success') return 'done';
  if (appearance === 'inprogress') return 'in_progress';
  return 'todo';
}

const PRODUCT_WORK_ITEM_TYPES = [
  'Feature', 'Business Gap', 'Integration', 'Business Request',
  ...BUSINESS_REQUEST_SUBTASK_TYPES,
];

function resolveItemType(issue: TimelineIssue): string {
  /* ph_issues children carry their own Jira-style type; only BR rows map to
     the business_request detail view. */
  const rawType = (issue.issueType ?? '').toLowerCase();
  if (['feature', 'business gap', 'integration', 'business request'].includes(rawType)) {
    return 'business_request';
  }
  return rawType === 'qa bug' || rawType === 'defect' ? 'defect'
    : rawType === 'production incident' ? 'incident'
    : rawType === 'change request' ? 'change_request'
    : rawType;
}

/* Mirrors useKanbanMutations.generateRequestKey — BRs share one global
   MIM-N keyspace regardless of product. Timestamp fallback ensures we
   never block creation on a lookup hiccup. */
async function generateRequestKey(): Promise<string> {
  const { data } = await (supabase as any)
    .from('business_requests')
    .select('request_key')
    .not('request_key', 'is', null)
    .limit(2000);
  let maxNum = 0;
  ((data ?? []) as Array<{ request_key: string | null }>).forEach((r) => {
    const m = r.request_key?.match(/MIM-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  if (maxNum === 0) return `MIM-${Date.now().toString().slice(-6)}`;
  return `MIM-${maxNum + 1}`;
}

export default function ProductHubTimelinePage() {
  const { key: productCode } = useParams<{ key: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: items = [], isLoading, error } = useProductHubTimeline(productCode);

  /* Product status catalogue — `demand_process_steps` rows ordered by
     sort_order. New BR subtasks pick up the first step as their initial
     status so child items in products use product statuses, not the
     project-style 'To Do' / 'todo' fallback. */
  const { data: productSteps = [] } = useActiveDemandProcessSteps();
  const initialStep = productSteps[0] ?? null;

  /* Resolve product CODE → UUID once so mutations can target product_id. */
  const { data: productId } = useQuery<string | null>({
    queryKey: ['product-hub-timeline-product-id', productCode],
    enabled: !!productCode,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id')
        .eq('code', productCode)
        .eq('is_active', true)
        .maybeSingle();
      return data?.id ?? null;
    },
    staleTime: 5 * 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-hub-timeline', productCode] });

  /* Walk the tree to locate an issue + whether it lives at the top
     (business_requests) or nested (ph_issues child). Used by mutations to
     route writes to the correct table. */
  const findIssueLocation = (issueKey: string): { isTopLevel: boolean; issue: TimelineIssue } | null => {
    const tree = queryClient.getQueryData<TimelineIssue[]>(['product-hub-timeline', productCode]) ?? [];
    for (const top of tree) {
      if (top.issueKey === issueKey) return { isTopLevel: true, issue: top };
      for (const child of top.children) {
        if (child.issueKey === issueKey) return { isTopLevel: false, issue: child };
      }
    }
    return null;
  };

  /* Optimistic patches that walk the tree (top-level OR nested) so the new
     value reflects immediately in the sidebar + bar position. */
  const patchTopLevel = (mutator: (list: TimelineIssue[]) => TimelineIssue[]) => {
    queryClient.setQueryData(
      ['product-hub-timeline', productCode],
      (old: TimelineIssue[] | undefined) => mutator(old ?? []),
    );
  };
  const patchDatesInCache = (issueKey: string, startDate: string | null, dueDate: string | null) => {
    patchTopLevel((tree) => tree.map(br => {
      if (br.issueKey === issueKey) return { ...br, startDate, dueDate };
      if (br.children.some(c => c.issueKey === issueKey)) {
        return {
          ...br,
          children: br.children.map(c => c.issueKey === issueKey ? { ...c, startDate, dueDate } : c),
        };
      }
      return br;
    }));
  };
  const insertChildInCache = (parentKey: string, child: TimelineIssue) => {
    patchTopLevel((tree) => tree.map(br =>
      br.issueKey === parentKey ? { ...br, children: [...br.children, child] } : br
    ));
  };
  const removeChildFromCache = (parentKey: string, childKey: string) => {
    patchTopLevel((tree) => tree.map(br =>
      br.issueKey === parentKey
        ? { ...br, children: br.children.filter(c => c.issueKey !== childKey) }
        : br
    ));
  };
  const insertTopLevelInCache = (br: TimelineIssue) => {
    patchTopLevel((tree) => [...tree, br]);
  };
  const removeTopLevelFromCache = (issueKey: string) => {
    patchTopLevel((tree) => tree.filter(b => b.issueKey !== issueKey));
  };

  const mutations: TimelineMutations = useMemo(() => ({
    /* Bottom "Create business request" — inserts a new BR. */
    onCreateEpic: async (summary) => {
      if (!productId) return null;
      const requestKey = await generateRequestKey();
      const now = new Date().toISOString();
      const optimistic: TimelineIssue = {
        id: '',
        issueKey: requestKey,
        projectKey: productCode ?? '',
        issueType: 'Business Request',
        summary,
        status: '',
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
        displayOrder: null,
      };
      insertTopLevelInCache(optimistic);
      try {
        const { error: insertErr } = await (supabase as any).from('business_requests').insert({
          request_key: requestKey,
          product_id: productId,
          title: summary,
          request_type: 'data_request',
          urgency: 'Medium',
          stakeholders: [],
          targeted_feature: false,
          created_at: now,
          updated_at: now,
        });
        if (insertErr) throw insertErr;
        invalidate();
        return optimistic;
      } catch (err) {
        removeTopLevelFromCache(requestKey);
        throw err;
      }
    },

    /* Per-row "+" on a BR — inserts a sub-task into ph_issues with the BR
       as its parent. Mirrors the canonical SubtasksPanelV2 write so the
       timeline path produces a row identical to one created from the BR
       detail's Subtasks section. Specifically:
         - project_key is derived from the BR's request_key prefix (e.g.
           "MDT" for MDT-744), NOT the URL's product code. This is the
           shared MDT-### sequence (CLAUDE.md / brSubtaskWiring.test.ts Q3).
         - issue_key uses the '-NEW-' token (matches SubtasksPanelV2:310)
           which doesn't trigger SidebarRow's "Saving…" placeholder.
         - status_category/priority/position/reporter_account_id/source
           match the SubtasksPanel insert. */
    onCreateChild: async (parentKey, _parentType, type, summary) => {
      const prefix = (parentKey.split('-')[0] || 'MDT').toUpperCase();
      const tempKey = `${prefix}-NEW-${Date.now()}`;

      /* nextPos needs the current children's positions — peek the cache
         tree we already built. Falls back to 1024 when the BR has none. */
      const tree = queryClient.getQueryData<TimelineIssue[]>(['product-hub-timeline', productCode]) ?? [];
      const parentBr = tree.find(b => b.issueKey === parentKey);
      const existingPositions = (parentBr?.children ?? []).map((_, idx) => ({ position: 1024 * (idx + 1) }));
      const position = nextPos(existingPositions);

      /* Use the product's first active process step as the initial status —
         falls back to 'To Do' / 'todo' when demand_process_steps is empty
         (fresh install or RLS hiccup). */
      const status = initialStep?.value ?? 'To Do';
      const statusCategory = initialStep
        ? lozengeToStatusCategory(stepToLozengeAppearance(initialStep))
        : 'todo';

      const optimistic: TimelineIssue = {
        id: '',
        issueKey: tempKey,
        projectKey: prefix,
        issueType: type,
        summary,
        status,
        statusCategory,
        priority: 'Medium',
        startDate: null,
        dueDate: null,
        epicColor: null,
        fixVersions: [],
        assigneeDisplayName: null,
        assigneeAvatarUrl: null,
        parentKey,
        children: [],
        displayOrder: position,
      };
      insertChildInCache(parentKey, optimistic);
      try {
        const { error: insertErr } = await (supabase as any).from('ph_issues').insert({
          issue_key: tempKey,
          summary: summary.trim(),
          issue_type: type,
          parent_key: parentKey,
          project_key: prefix,
          status,
          status_category: statusCategory,
          priority: 'Medium',
          position,
          reporter_account_id: user?.id,
          source: 'catalyst',
        });
        if (insertErr) throw insertErr;
        invalidate();
        return optimistic;
      } catch (err) {
        removeChildFromCache(parentKey, tempKey);
        throw err;
      }
    },

    onUpdateDates: async (issueKey, startDate, dueDate) => {
      const loc = findIssueLocation(issueKey);
      patchDatesInCache(issueKey, startDate, dueDate);
      if (!loc) { invalidate(); return; }
      if (loc.isTopLevel) {
        const { error: updErr } = await (supabase as any)
          .from('business_requests')
          .update({ end_date: dueDate, updated_at: new Date().toISOString() })
          .eq('request_key', issueKey);
        if (updErr) throw updErr;
      } else {
        const { data: row } = await (supabase as any)
          .from('ph_issues').select('raw_json').eq('issue_key', issueKey).maybeSingle();
        const raw = row?.raw_json ?? {};
        const updated = {
          ...raw,
          fields: { ...(raw.fields ?? {}), customfield_10015: startDate, duedate: dueDate },
        };
        const { error: updErr } = await (supabase as any)
          .from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
        if (updErr) throw updErr;
      }
      invalidate();
    },

    onRemoveDates: async (issueKey) => {
      const loc = findIssueLocation(issueKey);
      patchDatesInCache(issueKey, null, null);
      if (!loc) { invalidate(); return; }
      if (loc.isTopLevel) {
        await (supabase as any)
          .from('business_requests')
          .update({ end_date: null, updated_at: new Date().toISOString() })
          .eq('request_key', issueKey);
      } else {
        const { data: row } = await (supabase as any)
          .from('ph_issues').select('raw_json').eq('issue_key', issueKey).maybeSingle();
        const raw = row?.raw_json ?? {};
        const updated = {
          ...raw,
          fields: { ...(raw.fields ?? {}), customfield_10015: null, duedate: null },
        };
        await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      }
      invalidate();
    },

    /* Remove only the start date (keep the due). Mirrors onRemoveDates but
       writes only the start field. */
    onRemoveStartDate: async (issueKey) => {
      const loc = findIssueLocation(issueKey);
      const due = loc?.issue.dueDate ?? null;
      patchDatesInCache(issueKey, null, due);
      if (!loc) { invalidate(); return; }
      if (loc.isTopLevel) {
        /* BRs store only end_date — there's no start_date column. Removing
           the start has no DB effect at the top level (the UI startDate is
           always null for BRs). */
        invalidate();
        return;
      }
      const { data: row } = await (supabase as any)
        .from('ph_issues').select('raw_json').eq('issue_key', issueKey).maybeSingle();
      const raw = row?.raw_json ?? {};
      const updated = { ...raw, fields: { ...(raw.fields ?? {}), customfield_10015: null } };
      await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      invalidate();
    },

    onRemoveDueDate: async (issueKey) => {
      const loc = findIssueLocation(issueKey);
      const start = loc?.issue.startDate ?? null;
      patchDatesInCache(issueKey, start, null);
      if (!loc) { invalidate(); return; }
      if (loc.isTopLevel) {
        await (supabase as any)
          .from('business_requests')
          .update({ end_date: null, updated_at: new Date().toISOString() })
          .eq('request_key', issueKey);
      } else {
        const { data: row } = await (supabase as any)
          .from('ph_issues').select('raw_json').eq('issue_key', issueKey).maybeSingle();
        const raw = row?.raw_json ?? {};
        const updated = { ...raw, fields: { ...(raw.fields ?? {}), duedate: null } };
        await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      }
      invalidate();
    },

    /* Change colour for a top-level BR — writes business_requests.color_hex.
       For nested ph_issues children we don't expose this from the menu
       (Change colour gate is parent-only), but route there too if called. */
    onChangeEpicColor: async (issueKey, hex) => {
      const loc = findIssueLocation(issueKey);
      const value = hex ? hex : null;
      patchTopLevel((tree) => tree.map(br => {
        if (br.issueKey === issueKey) return { ...br, epicColor: value };
        if (br.children.some(c => c.issueKey === issueKey)) {
          return {
            ...br,
            children: br.children.map(c => c.issueKey === issueKey ? { ...c, epicColor: value } : c),
          };
        }
        return br;
      }));
      if (!loc) { invalidate(); return; }
      if (loc.isTopLevel) {
        await (supabase as any)
          .from('business_requests')
          .update({ color_hex: value, updated_at: new Date().toISOString() })
          .eq('request_key', issueKey);
      } else {
        const { data: row } = await (supabase as any)
          .from('ph_issues').select('raw_json').eq('issue_key', issueKey).maybeSingle();
        const raw = row?.raw_json ?? {};
        const updated = { ...raw, fields: { ...(raw.fields ?? {}), catalyst_color: value } };
        await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issueKey);
      }
      invalidate();
    },

    /* Re-parent a child BR-subtask to a different top-level BR. The new
       parent's key prefix is propagated to project_key so the row keeps
       its expected key namespace. */
    onChangeParent: async (issueKey, newParentKey) => {
      const newPrefix = (newParentKey.split('-')[0] || 'MDT').toUpperCase();
      /* optimistic patch — move the child between BR.children arrays */
      patchTopLevel((tree) => {
        let moved: TimelineIssue | null = null;
        const stripped = tree.map(br => {
          const kept = br.children.filter(c => {
            if (c.issueKey === issueKey) { moved = { ...c, parentKey: newParentKey, projectKey: newPrefix }; return false; }
            return true;
          });
          return kept.length === br.children.length ? br : { ...br, children: kept };
        });
        if (!moved) return tree;
        return stripped.map(br => br.issueKey === newParentKey
          ? { ...br, children: [...br.children, moved!] }
          : br);
      });
      await (supabase as any)
        .from('ph_issues')
        .update({ parent_key: newParentKey, project_key: newPrefix })
        .eq('issue_key', issueKey);
      invalidate();
    },

    /* Reorder a row among its siblings. Top-level rows write
       business_requests.display_order; nested children write ph_issues.position.
       Sparse 1024-step ranking — we compute a new value either at one of the
       ends or at the midpoint between two neighbours. */
    onReorderSibling: async (issueKey, direction) => {
      const tree = queryClient.getQueryData<TimelineIssue[]>(['product-hub-timeline', productCode]) ?? [];
      let siblings: TimelineIssue[] = [];
      let isTopLevel = false;
      const topMatch = tree.find(t => t.issueKey === issueKey);
      if (topMatch) {
        siblings = tree;
        isTopLevel = true;
      } else {
        const parent = tree.find(t => t.children.some(c => c.issueKey === issueKey));
        if (!parent) return;
        siblings = parent.children;
      }
      const idx = siblings.findIndex(s => s.issueKey === issueKey);
      if (idx === -1 || siblings.length <= 1) return;

      const order = (i: TimelineIssue, fallback: number) =>
        typeof i.displayOrder === 'number' ? i.displayOrder : fallback;
      /* Build a sparse sequence so even null-rank rows participate. */
      const ranks = siblings.map((s, i) => order(s, (i + 1) * 1024));

      let newRank: number;
      if (direction === 'first') {
        newRank = ranks[0] - 1024;
      } else if (direction === 'last') {
        newRank = ranks[ranks.length - 1] + 1024;
      } else if (direction === 'up') {
        if (idx === 0) return;
        const above = ranks[idx - 1];
        const aboveAbove = idx - 2 >= 0 ? ranks[idx - 2] : above - 2048;
        newRank = Math.floor((above + aboveAbove) / 2);
      } else {
        if (idx === siblings.length - 1) return;
        const below = ranks[idx + 1];
        const belowBelow = idx + 2 < siblings.length ? ranks[idx + 2] : below + 2048;
        newRank = Math.floor((below + belowBelow) / 2);
      }

      /* optimistic cache patch — re-sort siblings using the new rank. */
      patchTopLevel((tree) => {
        const updateRanked = (list: TimelineIssue[]) => {
          const next = list.map(it => it.issueKey === issueKey ? { ...it, displayOrder: newRank } : it);
          next.sort((a, b) => {
            const ao = a.displayOrder ?? Number.POSITIVE_INFINITY;
            const bo = b.displayOrder ?? Number.POSITIVE_INFINITY;
            return ao - bo;
          });
          return next;
        };
        if (isTopLevel) return updateRanked(tree);
        return tree.map(br =>
          br.children.some(c => c.issueKey === issueKey)
            ? { ...br, children: updateRanked(br.children) }
            : br);
      });

      if (isTopLevel) {
        await (supabase as any)
          .from('business_requests')
          .update({ display_order: newRank, updated_at: new Date().toISOString() })
          .eq('request_key', issueKey);
      } else {
        await (supabase as any)
          .from('ph_issues')
          .update({ position: newRank })
          .eq('issue_key', issueKey);
      }
      invalidate();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [productCode, productId, queryClient, initialStep, user?.id]);

  return (
    <TimelineView
      items={items}
      isLoading={isLoading}
      error={error}
      chromeBand={<ProjectPageHeader projectKey={productCode} />}
      hubLabel={productCode ?? 'Products'}
      hubKey={`product-${productCode ?? ''}`}
      filterOptions={{
        workItemTypes: PRODUCT_WORK_ITEM_TYPES,
        enableSavedFilters: false,
      }}
      buildIssueDetailRoute={(issueKey) => `/product-hub/${productCode}/timeline/${issueKey}`}
      resolveItemType={resolveItemType}
      detailRouteOwnerKey={productCode ?? ''}
      mutations={mutations}
      enableBarDrag={false}
      createTopLevelConfig={{ label: 'Create business request', iconType: 'Business Request' }}
      childTypesOverride={[...BUSINESS_REQUEST_SUBTASK_TYPES]}
      childrenOnlyOnTopLevel
      menuVariant="product-jira"
    />
  );
}
