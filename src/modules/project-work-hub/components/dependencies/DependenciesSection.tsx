import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { getEntry } from '@/components/shared/Timeline/dependencies/normalize';
import { useTimelineDependencies } from '@/components/shared/Timeline/dependencies/useTimelineDependencies';
import { SUBTASK_FAMILY_CANONICAL_TYPES } from '@/components/catalyst-detail-views/shared/parent-rules';
import { useAddDependencyListener } from '@/components/catalyst-detail-views/shared/sections/quickActionsBus';
// Reuse the LinkedWorkItems render stack verbatim so Dependencies looks
// pixel-identical (grouped rows, type icons, status lozenge, assignee avatar,
// priority bars, "+" add affordance). Only the data source + write path differ.
import { LinkedWorkItemsHeader } from '../linked-work-items/LinkedWorkItemsHeader';
import { LinkedWorkItemsBody } from '../linked-work-items/LinkedWorkItemsBody';
import type { LinkedWorkItem } from '../linked-work-items/types';
import type { StatusCategory } from '../dialogs/story-detail-modules/types';
import { DependencyToolbar } from './DependencyToolbar';
import { toDependencyRows, RELATIONSHIP_LABEL } from './depSectionModel';

export interface DependenciesSectionProps {
  issueKey: string;
  projectKey: string;
}

interface DepMeta {
  issue_type: string | null;
  summary: string | null;
  status: string | null;
  status_category: string | null;
  assignee_display_name: string | null;
  assignee_account_id: string | null;
  priority: string | null;
}

export function DependenciesSection({ issueKey, projectKey }: DependenciesSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showToolbar, setShowToolbar] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pendingUnlinkIds, setPendingUnlinkIds] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  const deps = useTimelineDependencies(projectKey ? [projectKey] : []);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // "+" menu / add affordance → un-collapse, reveal the inline toolbar, and
  // scroll the section into view (Jira parity with LinkedWorkItems). No modal.
  const openToolbar = useCallback(() => {
    setExpanded(true);
    setShowToolbar(true);
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);
  useAddDependencyListener(openToolbar);

  const baseRows = useMemo(
    () => (issueKey ? toDependencyRows(getEntry(deps.index, issueKey)) : []),
    [deps.index, issueKey],
  );

  const otherKeys = useMemo(() => Array.from(new Set(baseRows.map((r) => r.key))).sort(), [baseRows]);

  const { data: metaMap = new Map<string, DepMeta>() } = useQuery({
    queryKey: ['dependency-row-meta', otherKeys.join(',')],
    queryFn: async () => {
      const m = new Map<string, DepMeta>();
      if (otherKeys.length === 0) return m;
      const { data, error } = await (supabase as any)
        .from('ph_issues')
        .select('issue_key, issue_type, summary, status, status_category, assignee_display_name, assignee_account_id, priority')
        .in('issue_key', otherKeys);
      if (error) { console.error('[DependenciesSection] meta load failed', error); return m; }
      for (const r of (data ?? [])) {
        m.set(r.issue_key, {
          issue_type: r.issue_type ?? null,
          summary: r.summary ?? null,
          status: r.status ?? null,
          status_category: r.status_category ?? null,
          assignee_display_name: r.assignee_display_name ?? null,
          assignee_account_id: r.assignee_account_id ?? null,
          priority: r.priority ?? null,
        });
      }
      return m;
    },
    enabled: otherKeys.length > 0,
    staleTime: 30_000,
  });

  const subtaskTypesLower = useMemo(
    () => new Set(SUBTASK_FAMILY_CANONICAL_TYPES.map((t) => t.toLowerCase())),
    [],
  );

  // Map each dependency edge into the LinkedWorkItem shape and group by the
  // relationship label ("is blocked by" / "blocks") — the group header text,
  // exactly like LinkedWorkItems groups by link type.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byRel = new Map<string, LinkedWorkItem[]>();
    for (const r of baseRows) {
      const label = RELATIONSHIP_LABEL[r.relationship];
      const meta = metaMap.get(r.key);
      const item: LinkedWorkItem = {
        id: String(r.edgeId),
        link_type: label,
        created_at: r.createdAt ?? '',
        source_id: issueKey,
        target_id: r.key,
        target: {
          issue_key: r.key,
          summary: meta?.summary ?? '',
          issue_type: meta?.issue_type ?? '',
          status: meta?.status ?? '',
          status_category: (meta?.status_category ?? '') as StatusCategory,
          assignee_account_id: meta?.assignee_account_id ?? null,
          assignee_display_name: meta?.assignee_display_name ?? null,
          priority: meta?.priority ?? null,
          jira_updated_at: null,
        },
      };
      if (!byRel.has(label)) { byRel.set(label, []); order.push(label); }
      byRel.get(label)!.push(item);
    }
    return order.map((linkType) => ({ linkType, links: byRel.get(linkType)! }));
  }, [baseRows, metaMap, issueKey]);

  const count = baseRows.length;
  const bodyId = `dep-body-${issueKey}`;

  // Refresh every surface that reads ph_issue_dependencies. Global staleTime is
  // 15min, so without these invalidations the timeline column view AND the
  // standalone Dependencies page (/*-hub/:key/dependencies, query key
  // ['dependencies', key]) keep serving stale data after a detail-page edit.
  const invalidateAfterWrite = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['timeline-dependencies'] });
    queryClient.invalidateQueries({ queryKey: ['dependency-row-meta'] });
    queryClient.invalidateQueries({ queryKey: ['dependencies'] });
  }, [queryClient]);

  // Create one edge per selected key. First error → toast, keep toolbar open;
  // close only when every insert succeeds.
  const handleAdd = useCallback(
    async (direction: 'blocks' | 'is_blocked_by', targetKeys: string[]) => {
      if (!targetKeys.length) return;
      setAdding(true);
      let firstError: string | null = null;
      for (const otherKey of targetKeys) {
        const res = await deps.addDependency({ rowKey: issueKey, direction, otherKey, projectKey });
        if (!res.ok && !firstError) firstError = res.error ?? 'Failed to add dependency';
      }
      invalidateAfterWrite();
      setAdding(false);
      if (firstError) { catalystToast.error(firstError); return; }
      setShowToolbar(false);
    },
    [deps, issueKey, projectKey, invalidateAfterWrite],
  );

  const handleUnlink = useCallback(
    (link: LinkedWorkItem) => {
      setPendingUnlinkIds((prev) => new Set(prev).add(link.id));
      void (async () => {
        await deps.removeDependency(link.id);
        invalidateAfterWrite();
        setPendingUnlinkIds((prev) => {
          const next = new Set(prev); next.delete(link.id); return next;
        });
      })();
    },
    [deps, invalidateAfterWrite],
  );

  const handleOpen = useCallback(
    (link: LinkedWorkItem) => navigate(`/browse/${link.target.issue_key}`),
    [navigate],
  );

  const handleCopyKey = useCallback((link: LinkedWorkItem) => {
    void navigator.clipboard?.writeText(link.target.issue_key);
    catalystToast.success(`Copied ${link.target.issue_key}`);
  }, []);

  if (!issueKey) return null;

  return (
    <div ref={rootRef} className="lwi-root" data-issue-key={issueKey}>
      <LinkedWorkItemsHeader
        count={count}
        expanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        onAdd={openToolbar}
        bodyId={bodyId}
        title="Dependencies"
        addLabel="Add dependency"
      />

      {/* Empty-state gray "Add dependency" link below the header, aligned with
          the title — mirrors LinkedWorkItems' empty CTA. */}
      {count === 0 && !showToolbar && (
        <button type="button" className="lwi-add-link" onClick={openToolbar}>
          Add dependency
        </button>
      )}

      {expanded && (
        <LinkedWorkItemsBody
          id={bodyId}
          groups={groups}
          isLoading={deps.isLoading}
          isError={false}
          onOpen={handleOpen}
          onCopyKey={handleCopyKey}
          onUnlink={handleUnlink}
          pendingUnlinkIds={pendingUnlinkIds}
          sourceIssueKey={issueKey}
          footer={
            showToolbar ? (
              <DependencyToolbar
                sourceIssueKey={issueKey}
                projectKey={projectKey}
                index={deps.index}
                subtaskTypesLower={subtaskTypesLower}
                isPending={adding}
                onAdd={handleAdd}
                onCancel={() => setShowToolbar(false)}
              />
            ) : null
          }
        />
      )}
    </div>
  );
}
