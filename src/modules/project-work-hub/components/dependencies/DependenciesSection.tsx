import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import TrashIcon from '@atlaskit/icon/core/delete';
import { supabase } from '@/integrations/supabase/client';
import {
  JiraTable, type Column,
  makeKeyCell, makeSummaryCell, makeStatusCell, makeAssigneeCell, makePriorityCell,
} from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { getEntry } from '@/components/shared/Timeline/dependencies/normalize';
import { useTimelineDependencies } from '@/components/shared/Timeline/dependencies/useTimelineDependencies';
import { SUBTASK_FAMILY_CANONICAL_TYPES } from '@/components/catalyst-detail-views/shared/parent-rules';
import { useAddDependencyListener } from '@/components/catalyst-detail-views/shared/sections/quickActionsBus';
import { AddDependencyDialog } from './AddDependencyDialog';
import { toDependencyRows, RELATIONSHIP_LABEL, type DependencyRow } from './depSectionModel';

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
  priority: string | null;
}

type Row = DependencyRow & { meta: DepMeta | null };

export function DependenciesSection({ issueKey, projectKey }: DependenciesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const deps = useTimelineDependencies(projectKey ? [projectKey] : []);
  useAddDependencyListener(useCallback(() => setDialogOpen(true), []));

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
        .select('issue_key, issue_type, summary, status, status_category, assignee_display_name, priority')
        .in('issue_key', otherKeys);
      if (error) { console.error('[DependenciesSection] meta load failed', error); return m; }
      for (const r of (data ?? [])) {
        m.set(r.issue_key, {
          issue_type: r.issue_type ?? null,
          summary: r.summary ?? null,
          status: r.status ?? null,
          status_category: r.status_category ?? null,
          assignee_display_name: r.assignee_display_name ?? null,
          priority: r.priority ?? null,
        });
      }
      return m;
    },
    enabled: otherKeys.length > 0,
    staleTime: 30_000,
  });

  const rows: Row[] = useMemo(
    () => baseRows.map((r) => ({ ...r, meta: metaMap.get(r.key) ?? null })),
    [baseRows, metaMap],
  );

  const subtaskTypesLower = useMemo(
    () => new Set(SUBTASK_FAMILY_CANONICAL_TYPES.map((t) => t.toLowerCase())),
    [],
  );

  // Canonical read-only cells (parity with the child work item table).
  // Reference: src/modules/tasks/columns/tasksListColumns.ts (buildTasksListColumns).
  const columns: Column<Row>[] = useMemo(() => {
    const keyCell = makeKeyCell(
      (r: Row) => r.key,
      undefined,                                    // no inline open handler on this section
      undefined,
      (r: Row) => (r.meta?.issue_type ? <JiraIssueTypeIcon type={r.meta.issue_type} size={16} /> : null),
    );
    const summaryCell = makeSummaryCell((r: Row) => r.meta?.summary ?? '');
    const statusCell = makeStatusCell(
      (r: Row) => r.meta?.status ?? null,
      () => 'default',                              // unused by render body; lozenge colors from category
      undefined,
      (r: Row) => r.meta?.status_category ?? null,
    );
    const assigneeCell = makeAssigneeCell((r: Row) =>
      r.meta?.assignee_display_name ? { name: r.meta.assignee_display_name, avatarUrl: null } : null);
    const priorityCell = makePriorityCell((r: Row) => r.meta?.priority ?? null);

    return [
      {
        id: 'work', label: 'Work', flex: true, lockedPosition: true,
        cell: (props) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
            {keyCell(props)}
            <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              {summaryCell(props)}
            </span>
          </span>
        ),
      },
      {
        id: 'relationship', label: 'Relationship', width: 16,
        cell: ({ row }) => <span style={{ color: 'var(--ds-text-subtle)' }}>{RELATIONSHIP_LABEL[row.relationship]}</span>,
      },
      { id: 'priority', label: 'Priority', width: 10, cell: priorityCell },
      { id: 'assignee', label: 'Assignee', width: 16, cell: assigneeCell },
      { id: 'status', label: 'Status', width: 14, cell: statusCell },
    ];
  }, []);

  if (!issueKey) return null;

  return (
    <section style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: 'var(--ds-text)' }}
        >
          {collapsed ? <ChevronRightIcon label="" /> : <ChevronDownIcon label="" />}
          <span style={{ fontWeight: 600, marginLeft: 4 }}>Dependencies</span>
        </button>
        {rows.length > 0 && (
          <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-100)' }}>{rows.length}</span>
        )}
        <button
          onClick={() => setDialogOpen(true)}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-brand)', fontSize: 'var(--ds-font-size-100)' }}
        >
          Add dependency
        </button>
      </div>

      {!collapsed && rows.length > 0 && (
        <JiraTable
          columns={columns}
          data={rows}
          getRowId={(r) => `${r.relationship}:${r.key}:${r.edgeId}`}
          ariaLabel="Dependencies"
          contextMenuActions={[{
            id: 'remove',
            label: 'Remove dependency',
            icon: <TrashIcon label="" />,
            danger: true,
            onClick: (r) => { void deps.removeDependency(r.edgeId); },
          }]}
        />
      )}

      <AddDependencyDialog
        isOpen={dialogOpen}
        issueKey={issueKey}
        projectKey={projectKey}
        index={deps.index}
        subtaskTypesLower={subtaskTypesLower}
        onClose={() => setDialogOpen(false)}
        onSubmit={(direction, otherKey) =>
          deps.addDependency({ rowKey: issueKey, direction, otherKey, projectKey })}
      />
    </section>
  );
}
