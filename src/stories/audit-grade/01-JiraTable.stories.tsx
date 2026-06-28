
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function Frame({ children, width = 1200 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, background: 'var(--ds-surface)' }}>{children}</div></Providers>;
}

import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import {
  makeKeyCell,
  makeStatusCell,
  makeAssigneeCell,
  makeParentCell,
  makeCommentsCell,
} from '@/components/shared/JiraTable/cells';
import {
  makeStatusEditCellAkPopup,
  makeAssigneeEditCell,
  makeRowActionsCell,
} from '@/components/shared/JiraTable/editors';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface Row {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: 'new' | 'indeterminate' | 'done';
  priority: string;
  issue_type: string;
  assignee_display_name: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  comments_count: number;
  depth?: number;
}

const base: Row = {
  id: 'ph-001', issue_key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface',
  status: 'In Development', status_category: 'indeterminate',
  priority: 'High', issue_type: 'Story',
  parent_key: 'BAU-5400', parent_summary: 'Industrial Capabilities Module',
  assignee_display_name: 'Vikram Indla',
  comments_count: 4,
};

const data: Row[] = Array.from({ length: 25 }, (_, i) => ({
  ...base,
  id: `ph-${i}`,
  issue_key: `BAU-${5900 + i}`,
  summary: ['Unified Search implementation', 'Fix validation on capabilities form', 'Upgrade deployment pipeline', 'Dashboard KPI widget alignment', 'Mobile responsive nav breakpoints', 'Decouple service layer', 'Login flow error handling', 'Add bulk export CSV', 'Refactor notification service', 'Calendar view performance'][i % 10],
  status: ['In Development', 'In QA', 'Done', 'To Do', 'To Do', 'In Progress'][i % 6],
  status_category: (['indeterminate', 'done', 'done', 'new', 'new', 'indeterminate'] as const)[i % 6],
  priority: ['Critical', 'High', 'Medium', 'Low'][i % 4],
  issue_type: ['Story', 'QA Bug', 'Task', 'Feature', 'Epic', 'Sub-task'][i % 6],
  assignee_display_name: ['Vikram Indla', 'Yazeed Daraz', 'Nada Alfassam', 'Imran Aslam', 'Andrew Fayyaz', null][i % 6],
  comments_count: i * 2,
  parent_key: i % 4 === 0 ? 'BAU-5400' : null,
  parent_summary: i % 4 === 0 ? 'Industrial Capabilities Module' : null,
  depth: 0,
}));

const STATUS_OPTIONS = [
  { id: 'todo', label: 'To Do', category: 'new' as const },
  { id: 'inprogress', label: 'In Progress', category: 'indeterminate' as const },
  { id: 'done', label: 'Done', category: 'done' as const },
];
const ASSIGNEE_OPTIONS = [
  { accountId: 'u1', displayName: 'Vikram Indla', avatarUrl: null },
  { accountId: 'u2', displayName: 'Yazeed Daraz', avatarUrl: null },
  { accountId: 'u3', displayName: 'Nada Alfassam', avatarUrl: null },
];

const columns: Column<Row>[] = [
  {
    id: 'key', label: 'Work', flex: true, alwaysVisible: true, sortable: true, defaultVisible: true,
    cell: makeKeyCell(
      (r) => r.issue_key,
      fn(),
      (r) => `#`,
      (r) => <JiraIssueTypeIcon type={r.issue_type} size={16} />,
    ),
  },
  {
    id: 'parent', label: 'Parent', width: 2, sortable: true, defaultVisible: true,
    cell: makeParentCell(
      (r) => r.parent_key ? { key: r.parent_key, summary: r.parent_summary ?? '' } : null,
      fn(),
    ),
  },
  {
    id: 'status', label: 'Status', width: 2, sortable: true, defaultVisible: true,
    cell: makeStatusEditCellAkPopup({
      getStatus: (r) => r.status,
      getStatusCategory: (r) => r.status_category,
      options: STATUS_OPTIONS,
      onStatusChange: fn(),
    }),
  },
  {
    id: 'assignee', label: 'Assignee', width: 2, sortable: true, defaultVisible: true,
    cell: makeAssigneeEditCell({
      getAssignee: (r) => r.assignee_display_name ? { accountId: 'u', displayName: r.assignee_display_name, avatarUrl: null } : null,
      options: ASSIGNEE_OPTIONS,
      onAssigneeChange: fn(),
    }),
  },
  {
    id: 'comments', label: '', width: 1, defaultVisible: true,
    cell: makeCommentsCell((r) => r.comments_count ?? 0),
  },
  {
    id: '__actions', label: '', width: 1, alwaysVisible: true,
    cell: makeRowActionsCell({
      actions: [
        { id: 'open', label: 'Open', onClick: fn() },
        { id: 'delete', label: 'Delete', danger: true, onClick: fn() },
      ],
    }),
  },
];

export default { title: 'Audit Grade/01 — JiraTable (Dynamic Table)' };

export const Default: StoryObj = {
  render: () => (
    <Frame>
      <JiraTable<Row>
        data={data}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={fn()}
        density="compact"
        showRowCount
        totalRowCount={799}
      />
    </Frame>
  ),
};

export const WithSorting: StoryObj = {
  name: 'Sorted by Priority',
  render: () => {
    const ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const sorted = [...data].sort((a, b) => (ORDER[a.priority as keyof typeof ORDER] ?? 9) - (ORDER[b.priority as keyof typeof ORDER] ?? 9));
    return (
      <Frame>
        <JiraTable<Row>
          data={sorted}
          columns={columns}
          getRowId={(r) => r.id}
          sortKey="priority"
          sortOrder="ASC"
          onSortChange={fn()}
          onRowClick={fn()}
          density="compact"
        />
      </Frame>
    );
  },
};

export const ExpandedRows: StoryObj = {
  name: 'Expanded — Parent/Child Indent',
  render: () => {
    const parentRow: Row = { ...base, id: 'parent-0', issue_key: 'BAU-5400', summary: 'Industrial Capabilities Module', issue_type: 'Epic', parent_key: null, parent_summary: null, depth: 0 };
    const childRows: Row[] = data.filter((r) => r.parent_key === 'BAU-5400').map((r) => ({ ...r, depth: 1 }));
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['BAU-5400']));
    const visible = [parentRow, ...(expanded.has('BAU-5400') ? childRows : [])];
    return (
      <Frame>
        <JiraTable<Row>
          data={visible}
          columns={columns}
          getRowId={(r) => r.id}
          getRowDepth={(r) => r.depth ?? 0}
          getRowHasChildren={(r) => r.issue_key === 'BAU-5400'}
          expandedRowIds={expanded}
          onToggleRowExpanded={(id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onRowClick={fn()}
          density="compact"
        />
      </Frame>
    );
  },
};

export const Grouped: StoryObj = {
  name: 'Grouped by Status',
  render: () => {
    const groups = [
      { id: 'new', label: 'To Do', rows: data.filter((r) => r.status_category === 'new') },
      { id: 'indeterminate', label: 'In Progress', rows: data.filter((r) => r.status_category === 'indeterminate') },
      { id: 'done', label: 'Done', rows: data.filter((r) => r.status_category === 'done') },
    ];
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    return (
      <Frame>
        <JiraTable<Row>
          groups={groups}
          columns={columns}
          getRowId={(r) => r.id}
          collapsedGroups={collapsed}
          onToggleGroup={(id) => setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onAddToGroup={fn()}
          enableGroupCreateButton
          onRowClick={fn()}
          density="compact"
        />
      </Frame>
    );
  },
};

export const WithBulkSelect: StoryObj = {
  name: 'Selectable + BulkFooterBar',
  render: () => {
    const [sel, setSel] = useState<Set<string>>(new Set());
    return (
      <Frame>
        <JiraTable<Row>
          data={data}
          columns={columns}
          getRowId={(r) => r.id}
          selectable
          selection={sel}
          onSelectionChange={setSel}
          onRowClick={fn()}
          density="compact"
        />
        {sel.size > 0 && (
          <div style={{ padding: '8px 16px', background: 'var(--ds-surface-sunken)', borderTop: '1px solid var(--ds-border)', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
            {sel.size} selected — BulkFooterBar renders here
          </div>
        )}
      </Frame>
    );
  },
};

export const WithColumnManager: StoryObj = {
  name: 'Column Manager — Visibility Toggle',
  render: () => {
    const defaultVis = new Set(columns.filter((c) => c.defaultVisible || c.alwaysVisible).map((c) => c.id));
    const [visible, setVisible] = useState<Set<string>>(defaultVis);
    return (
      <Frame>
        <JiraTable<Row>
          data={data}
          columns={columns}
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

export const Empty: StoryObj = {
  render: () => (
    <Frame>
      <JiraTable<Row>
        data={[]}
        columns={columns}
        getRowId={(r) => r.id}
        emptyView={<div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-400)' }}>No items match your filters.</div>}
        density="compact"
      />
    </Frame>
  ),
};

export const FewRows: StoryObj = {
  name: '3 Rows — Compact',
  render: () => (
    <Frame>
      <JiraTable<Row>
        data={data.slice(0, 3)}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={fn()}
        density="compact"
      />
    </Frame>
  ),
};

export const LargeDataset: StoryObj = {
  name: '100 Rows — Virtualized',
  render: () => {
    const large: Row[] = Array.from({ length: 100 }, (_, i) => ({
      ...base,
      id: `large-${i}`,
      issue_key: `BAU-${7000 + i}`,
      summary: `Work item ${i + 1}: ${['Search', 'Validation', 'Pipeline', 'Dashboard', 'Mobile nav'][i % 5]} implementation`,
      status: ['In Development', 'In QA', 'Done', 'To Do'][i % 4],
      status_category: (['indeterminate', 'done', 'done', 'new'] as const)[i % 4],
      priority: ['Critical', 'High', 'Medium', 'Low'][i % 4],
      issue_type: ['Story', 'QA Bug', 'Task', 'Feature', 'Sub-task'][i % 5],
      assignee_display_name: ['Vikram Indla', null, 'Nada Alfassam'][i % 3],
      comments_count: (i * 3) % 15,
      depth: 0,
    }));
    return (
      <Frame>
        <div style={{ height: 600, overflow: 'auto' }}>
          <JiraTable<Row>
            data={large}
            columns={columns}
            getRowId={(r) => r.id}
            onRowClick={fn()}
            density="compact"
            showRowCount
            totalRowCount={1000}
            enableVirtualization
          />
        </div>
      </Frame>
    );
  },
};
