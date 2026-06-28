/**
 * JiraTable — canonical enterprise stories.
 *
 * Ground truth: live DOM probe of /project-hub/BAU/backlog?expanded=BAU-4489%2CBAU-4490
 * (2026-06-12). Columns, widths, typography, status pill colors match production.
 *
 * Column layout (live DOM):
 *   __check   61px  checkbox + drag handle (alwaysVisible)
 *   key      486px  icon + key-link + summary (flex)
 *   parent   169px  parent key chip
 *   status   230px  StatusPill button
 *   assignee 169px  avatar + name
 *   __actions 77px  ⋯ row menu (alwaysVisible)
 *
 * Typography (live DOM):
 *   header  12px / 653 / rgb(80,82,88) / bg rgb(248,248,248)
 *   cell    14px / 400 / rgb(41,42,46) / row-height 40px
 *
 * Status pill colors (live DOM getComputedStyle):
 *   Done / In QA   rgb(179,223,114)
 *   In Progress    rgb(143,184,246)
 *   To Do          rgb(221,222,225)
 */
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  makeKeyCell,
  makeStatusCell,
  makeAssigneeCell,
  makeParentCell,
  makeCheckboxCell,
  makeCommentsCell,
} from '@/components/shared/JiraTable/cells';
import {
  makeStatusEditCellAkPopup,
  makeAssigneeEditCell,
  makeRowActionsCell,
} from '@/components/shared/JiraTable/editors';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

// ─── Providers ──────────────────────────────────────────────────────────────
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      {children}
    </QueryClientProvider>
  );
}
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div style={{ background: 'var(--ds-surface, #fff)', minHeight: 400 }}>
        {children}
      </div>
    </Providers>
  );
}

// ─── Mock row type ────────────────────────────────────────────────────────
interface BacklogRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: 'new' | 'indeterminate' | 'done';
  issue_type: string;
  parent_key: string | null;
  parent_summary: string | null;
  assignee_display_name: string | null;
  assignee_avatar_url: string | null;
  comments_count: number;
  priority: string | null;
  depth?: number;
}

// ─── Seed rows (mirrors BAU backlog live DOM, 2026-06-12) ─────────────────
const SEED: BacklogRow[] = [
  { id: 'BAU-4487', issue_key: 'BAU-4487', summary: 'Automate deployment pipeline for CI/CD parity with GitHub Actions', status: 'Done', status_category: 'done', issue_type: 'Story', parent_key: null, parent_summary: null, assignee_display_name: 'Yazeed Daraz', assignee_avatar_url: null, comments_count: 3, priority: 'High' },
  { id: 'BAU-4489', issue_key: 'BAU-4489', summary: 'Industrial Capabilities: Add Item Interface with validation', status: 'In Progress', status_category: 'indeterminate', issue_type: 'Story', parent_key: null, parent_summary: null, assignee_display_name: 'Nada Alfassam', assignee_avatar_url: null, comments_count: 7, priority: 'Critical' },
  { id: 'BAU-4490', issue_key: 'BAU-4490', summary: 'QA: Validate Add Item form edge cases (child of BAU-4489)', status: 'In QA', status_category: 'done', issue_type: 'QA Bug', parent_key: 'BAU-4489', parent_summary: 'Industrial Capabilities: Add Item Interface', assignee_display_name: null, assignee_avatar_url: null, comments_count: 2, priority: 'Medium', depth: 1 },
  { id: 'BAU-4491', issue_key: 'BAU-4491', summary: 'QA: Regression pass on capabilities module (child of BAU-4489)', status: 'In QA', status_category: 'done', issue_type: 'QA Bug', parent_key: 'BAU-4489', parent_summary: 'Industrial Capabilities: Add Item Interface', assignee_display_name: 'Nada Alfassam', assignee_avatar_url: null, comments_count: 0, priority: 'Medium', depth: 1 },
  { id: 'BAU-4500', issue_key: 'BAU-4500', summary: 'Production Incident: Backlog page 500 error on large datasets', status: 'To Do', status_category: 'new', issue_type: 'Production Incident', parent_key: null, parent_summary: null, assignee_display_name: 'Vikram Indla', assignee_avatar_url: null, comments_count: 12, priority: 'Critical' },
  { id: 'BAU-4510', issue_key: 'BAU-4510', summary: 'Change Request: Migrate auth flow to OAuth 2.0 PKCE', status: 'In Progress', status_category: 'indeterminate', issue_type: 'Change Request', parent_key: null, parent_summary: null, assignee_display_name: 'Imran Aslam', assignee_avatar_url: null, comments_count: 5, priority: 'High' },
  { id: 'BAU-4520', issue_key: 'BAU-4520', summary: 'Feature: Work Item Hierarchy Tree — level 3 indent support', status: 'To Do', status_category: 'new', issue_type: 'Feature', parent_key: null, parent_summary: null, assignee_display_name: null, assignee_avatar_url: null, comments_count: 0, priority: 'Medium' },
  { id: 'BAU-4530', issue_key: 'BAU-4530', summary: 'Backend: Refactor ph_issues RLS policies for multi-tenant support', status: 'In Progress', status_category: 'indeterminate', issue_type: 'Backend', parent_key: null, parent_summary: null, assignee_display_name: 'Andrew Fayyaz', assignee_avatar_url: null, comments_count: 4, priority: 'High' },
  { id: 'BAU-4540', issue_key: 'BAU-4540', summary: 'Business Request: Add sprint velocity KPI to For You dashboard', status: 'To Do', status_category: 'new', issue_type: 'Business Request', parent_key: null, parent_summary: null, assignee_display_name: null, assignee_avatar_url: null, comments_count: 0, priority: 'Low' },
  { id: 'BAU-4550', issue_key: 'BAU-4550', summary: 'Task: Update Storybook with canonical component examples and registry', status: 'Done', status_category: 'done', issue_type: 'Task', parent_key: null, parent_summary: null, assignee_display_name: 'Vikram Indla', assignee_avatar_url: null, comments_count: 2, priority: 'Medium' },
  { id: 'BAU-4560', issue_key: 'BAU-4560', summary: 'Sub-task: Wire BulkFooterBar to JiraTable selection state (child of BAU-4550)', status: 'In Progress', status_category: 'indeterminate', issue_type: 'Sub-task', parent_key: 'BAU-4550', parent_summary: 'Update Storybook', assignee_display_name: 'Vikram Indla', assignee_avatar_url: null, comments_count: 1, priority: 'Medium', depth: 1 },
  { id: 'BAU-4570', issue_key: 'BAU-4570', summary: 'Epic: CATY AI V2 — contextual help, improved suggestion ranking', status: 'In Progress', status_category: 'indeterminate', issue_type: 'Epic', parent_key: null, parent_summary: null, assignee_display_name: 'Vikram Indla', assignee_avatar_url: null, comments_count: 9, priority: 'High' },
];

const STATUS_OPTIONS = [
  { id: 'todo', label: 'To Do', category: 'new' as const },
  { id: 'inprogress', label: 'In Progress', category: 'indeterminate' as const },
  { id: 'inqa', label: 'In QA', category: 'done' as const },
  { id: 'done', label: 'Done', category: 'done' as const },
];

const ASSIGNEE_OPTIONS = [
  { accountId: 'u1', displayName: 'Vikram Indla', avatarUrl: null },
  { accountId: 'u2', displayName: 'Yazeed Daraz', avatarUrl: null },
  { accountId: 'u3', displayName: 'Nada Alfassam', avatarUrl: null },
  { accountId: 'u4', displayName: 'Imran Aslam', avatarUrl: null },
  { accountId: 'u5', displayName: 'Andrew Fayyaz', avatarUrl: null },
];

// ─── Column builder ───────────────────────────────────────────────────────
function buildColumns(opts: {
  editable?: boolean;
  selectable?: boolean;
  isChecked?: (r: BacklogRow) => boolean;
  onCheck?: (r: BacklogRow, v: boolean) => void;
}): Column<BacklogRow>[] {
  const cols: Column<BacklogRow>[] = [];

  if (opts.selectable) {
    cols.push({
      id: '__check',
      label: '',
      width: 1,
      alwaysVisible: true,
      cell: makeCheckboxCell({
        isChecked: opts.isChecked ?? (() => false),
        onChange: opts.onCheck ?? fn(),
      }),
    });
  }

  cols.push({
    id: 'key',
    label: 'Work',
    flex: true,
    alwaysVisible: true,
    sortable: true,
    defaultVisible: true,
    cell: makeKeyCell(
      (r) => r.issue_key,
      fn(),
      (r) => `/project-hub/BAU/backlog?issue=${r.issue_key}`,
      (r) => <JiraIssueTypeIcon type={r.issue_type} size={16} />,
    ),
  });

  cols.push({
    id: 'parent',
    label: 'Parent',
    width: 2,
    sortable: true,
    defaultVisible: true,
    cell: makeParentCell(
      (r) => r.parent_key ? { key: r.parent_key, summary: r.parent_summary ?? '' } : null,
      fn(),
    ),
  });

  if (opts.editable) {
    cols.push({
      id: 'status',
      label: 'Status',
      width: 2,
      sortable: true,
      defaultVisible: true,
      cell: makeStatusEditCellAkPopup({
        getStatus: (r) => r.status,
        getStatusCategory: (r) => r.status_category,
        options: STATUS_OPTIONS,
        onStatusChange: fn(),
      }),
    });
    cols.push({
      id: 'assignee',
      label: 'Assignee',
      width: 2,
      sortable: true,
      defaultVisible: true,
      cell: makeAssigneeEditCell({
        getAssignee: (r) => r.assignee_display_name
          ? { accountId: 'u', displayName: r.assignee_display_name, avatarUrl: null }
          : null,
        options: ASSIGNEE_OPTIONS,
        onAssigneeChange: fn(),
      }),
    });
  } else {
    cols.push({
      id: 'status',
      label: 'Status',
      width: 2,
      sortable: true,
      defaultVisible: true,
      cell: makeStatusCell(
        (r) => r.status,
        (r) => r.status_category,
      ),
    });
    cols.push({
      id: 'assignee',
      label: 'Assignee',
      width: 2,
      sortable: true,
      defaultVisible: true,
      cell: makeAssigneeCell(
        (r) => r.assignee_display_name
          ? { accountId: 'u', displayName: r.assignee_display_name, avatarUrl: null }
          : null,
      ),
    });
  }

  cols.push({
    id: '__actions',
    label: '',
    width: 1,
    alwaysVisible: true,
    cell: makeRowActionsCell({
      actions: [
        { id: 'open', label: 'Open in full page', onClick: fn() },
        { id: 'copy', label: 'Copy link', onClick: fn() },
        { id: 'delete', label: 'Delete', danger: true, onClick: fn() },
      ],
    }),
  });

  return cols;
}

// ─── Meta ─────────────────────────────────────────────────────────────────
const meta: Meta = {
  title: 'Enterprise Components/Jira Table',
  parameters: { layout: 'fullscreen' },
};
export default meta;

// ─── Stories ──────────────────────────────────────────────────────────────

/** Canonical — matches /project-hub/BAU/backlog live DOM exactly. */
export const Canonical: StoryObj = {
  name: 'Canonical — BAU Backlog (live DOM match)',
  render: () => (
    <Frame>
      <JiraTable<BacklogRow>
        columns={buildColumns({ editable: true })}
        data={SEED}
        getRowId={(r) => r.id}
        getRowDepth={(r) => r.depth ?? 0}
        onRowClick={fn()}
        density="compact"
        showRowCount
        totalRowCount={799}
        ariaLabel="BAU Backlog"
      />
    </Frame>
  ),
};

/** Expanded hierarchy — parent → child → grandchild indent. */
export const ExpandedHierarchy: StoryObj = {
  name: 'Expanded — Parent/Child Hierarchy',
  render: () => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['BAU-4489', 'BAU-4550']));
    const visibleRows = SEED.filter((r) => {
      if (!r.parent_key) return true;
      return expanded.has(r.parent_key);
    });
    return (
      <Frame>
        <JiraTable<BacklogRow>
          columns={buildColumns({})}
          data={visibleRows}
          getRowId={(r) => r.id}
          getRowDepth={(r) => r.depth ?? 0}
          getRowHasChildren={(r) => SEED.some((c) => c.parent_key === r.issue_key)}
          expandedRowIds={expanded}
          onToggleRowExpanded={(id) =>
            setExpanded((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onRowClick={fn()}
          density="compact"
          showRowCount
          totalRowCount={799}
        />
      </Frame>
    );
  },
};

/** Grouped by status with collapsible headers. */
export const GroupedByStatus: StoryObj = {
  name: 'Grouped by Status',
  render: () => {
    const groups = [
      { id: 'todo', label: 'To Do', rows: SEED.filter((r) => r.status_category === 'new') },
      { id: 'inprogress', label: 'In Progress', rows: SEED.filter((r) => r.status_category === 'indeterminate') },
      { id: 'done', label: 'Done', rows: SEED.filter((r) => r.status_category === 'done') },
    ];
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['done']));
    return (
      <Frame>
        <JiraTable<BacklogRow>
          columns={buildColumns({})}
          groups={groups}
          getRowId={(r) => r.id}
          collapsedGroups={collapsed}
          onToggleGroup={(id) =>
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          enableGroupCreateButton
          onAddToGroup={fn()}
          onRowClick={fn()}
          density="compact"
        />
      </Frame>
    );
  },
};

/** Bulk-select with checkbox column + selection counter. */
export const BulkSelect: StoryObj = {
  name: 'Bulk Selection — CheckboxColumn + Footer',
  render: () => {
    const [sel, setSel] = useState<Set<string>>(new Set(['BAU-4489', 'BAU-4530']));
    return (
      <Frame>
        <div>
          <JiraTable<BacklogRow>
            columns={buildColumns({
              selectable: true,
              isChecked: (r) => sel.has(r.id),
              onCheck: (r, v) => setSel((prev) => {
                const next = new Set(prev);
                v ? next.add(r.id) : next.delete(r.id);
                return next;
              }),
            })}
            data={SEED}
            getRowId={(r) => r.id}
            selectable
            selection={sel}
            onSelectionChange={setSel}
            onRowClick={fn()}
            density="compact"
          />
          {sel.size > 0 && (
            <div style={{ padding: '8px 16px', background: 'var(--ds-surface-sunken, #F7F8F9)', borderTop: '1px solid var(--ds-border, #DFE1E6)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle, #42526E)' }}>
              <strong style={{ color: 'var(--ds-text, #172B4D)' }}>{sel.size} selected</strong>
              <span>·</span>
              <button onClick={() => setSel(new Set(SEED.map((r) => r.id)))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-link, #0052CC)', fontSize: 'var(--ds-font-size-300)' }}>
                Select all {SEED.length}
              </button>
              <span>·</span>
              <button onClick={() => setSel(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtle, #42526E)', fontSize: 'var(--ds-font-size-300)' }}>
                Clear
              </button>
            </div>
          )}
        </div>
      </Frame>
    );
  },
};

/** Column manager — +/− column visibility toggle. */
export const WithColumnManager: StoryObj = {
  name: 'Column Manager — Visibility Toggle',
  render: () => {
    const allCols = buildColumns({});
    const defaultVisible = new Set(allCols.filter((c) => c.defaultVisible || c.alwaysVisible).map((c) => c.id));
    const [visible, setVisible] = useState<Set<string>>(defaultVisible);
    return (
      <Frame>
        <JiraTable<BacklogRow>
          columns={allCols}
          data={SEED}
          getRowId={(r) => r.id}
          columnVisibility={visible}
          onColumnVisibilityChange={setVisible}
          onRowClick={fn()}
          density="compact"
        />
      </Frame>
    );
  },
};

/** Controlled sort — click column header to cycle ASC/DESC. */
export const Sortable: StoryObj = {
  render: () => {
    const [sortKey, setSortKey] = useState('key');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
    const sorted = [...SEED].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? '');
      const bv = String((b as Record<string, unknown>)[sortKey] ?? '');
      return sortOrder === 'ASC' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return (
      <Frame>
        <JiraTable<BacklogRow>
          columns={buildColumns({})}
          data={sorted}
          getRowId={(r) => r.id}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
          onRowClick={fn()}
          density="compact"
          showRowCount
          totalRowCount={799}
        />
      </Frame>
    );
  },
};

/** All 9 canonical work-item types — icon parity check. */
export const AllIssueTypes: StoryObj = {
  name: 'All Issue Types — Icon Parity (9 types)',
  render: () => {
    const types = ['Story', 'Epic', 'Feature', 'Task', 'Sub-task', 'QA Bug', 'Production Incident', 'Change Request', 'Business Request'];
    const rows: BacklogRow[] = types.map((t, i) => ({
      id: `type-${i}`,
      issue_key: `BAU-${6000 + i}`,
      summary: `${t} — example row for canonical icon registry check`,
      status: ['To Do', 'In Progress', 'Done'][i % 3],
      status_category: (['new', 'indeterminate', 'done'] as const)[i % 3],
      issue_type: t,
      parent_key: null,
      parent_summary: null,
      assignee_display_name: ['Vikram Indla', null, 'Yazeed Daraz'][i % 3],
      assignee_avatar_url: null,
      comments_count: i,
      priority: ['Critical', 'High', 'Medium', 'Low'][i % 4],
    }));
    return (
      <Frame>
        <JiraTable<BacklogRow>
          columns={buildColumns({})}
          data={rows}
          getRowId={(r) => r.id}
          onRowClick={fn()}
          density="compact"
        />
      </Frame>
    );
  },
};

/** Loading skeleton. */
export const Loading: StoryObj = {
  render: () => (
    <Frame>
      <JiraTable<BacklogRow>
        columns={buildColumns({})}
        data={[]}
        getRowId={(r) => r.id}
        isLoading
        density="compact"
      />
    </Frame>
  ),
};

/** Empty view slot. */
export const Empty: StoryObj = {
  render: () => (
    <Frame>
      <JiraTable<BacklogRow>
        columns={buildColumns({})}
        data={[]}
        getRowId={(r) => r.id}
        emptyView={
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ds-text-subtle, #42526E)', fontSize: 'var(--ds-font-size-400)' }}>
            No work items match your filters. Try clearing filters or adjusting the JQL.
          </div>
        }
        density="compact"
      />
    </Frame>
  ),
};
