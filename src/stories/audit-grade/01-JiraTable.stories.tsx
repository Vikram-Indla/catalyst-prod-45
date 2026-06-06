
import type { StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}
function Frame({ children, width = 900 }: { children: React.ReactNode; width?: number }) {
  return <Providers><div style={{ maxWidth: width, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></Providers>;
}

import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import { makeKeyCell, makeStatusCell, makeAssigneeCell, makeSummaryInlineEditCell, makePriorityCell, makeCommentsCell, makeDateCell } from '@/components/shared/JiraTable/cells';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';


const mockIssue = {
  id: 'ph-001', issue_key: 'BAU-5972', summary: 'Industrial Capabilities: Add Item Interface',
  description_adf: null, description_text: 'Implement the add item interface for industrial capabilities module with validation and error handling.',
  status: 'In Development', status_category: 'indeterminate',
  priority: 'High', issue_type: 'Story',
  parent_key: 'BAU-5400', parent_summary: 'Industrial Capabilities Module',
  assignee_account_id: 'u1', assignee_display_name: 'Vikram Indla',
  reporter_account_id: 'u2', reporter_display_name: 'Yazeed Daraz',
  project_key: 'BAU', sprint_release: null,
  labels: ['frontend', 'capabilities'], severity: null,
  jira_created_at: '2026-04-01T10:00:00Z', jira_updated_at: '2026-06-04T15:30:00Z',
  deleted_at: null, acceptance_criteria: '- Form validates required fields\n- Error messages are descriptive\n- Submit creates item in DB',
};

const rows = Array.from({ length: 25 }, (_, i) => ({
  ...mockIssue,
  id: `ph-${i}`, issue_key: `BAU-${5900 + i}`,
  summary: ['Unified Search implementation', 'Fix validation on capabilities form', 'Upgrade deployment pipeline', 'Dashboard KPI widget alignment', 'Mobile responsive nav breakpoints', 'Decoupling service layer', 'Login flow error handling', 'Add bulk export CSV', 'Refactor notification service', 'Calendar view performance'][i % 10],
  status: ['In Development', 'In QA', 'Done', 'In Requirements', 'To Do', 'In Progress'][i % 6],
  status_category: ['indeterminate', 'indeterminate', 'done', 'new', 'new', 'indeterminate'][i % 6],
  priority: ['Critical', 'High', 'Medium', 'Low'][i % 4],
  issue_type: ['Story', 'QA Bug', 'Task', 'Feature', 'Epic', 'Sub-task'][i % 6],
  assignee_display_name: ['Vikram Indla', 'Yazeed Daraz', 'Nada Alfassam', 'Imran Aslam', 'Andrew Fayyaz', null][i % 6],
  comments_count: i * 2,
}));

const columns = [
  { id: 'key', label: 'Work', width: 4, visible: true, defaultVisible: true,
    render: (r: any) => makeKeyCell(() => r.issue_key, fn(), () => '#', () => <JiraIssueTypeIcon type={r.issue_type} size={16} />)(r) },
  { id: 'summary', label: 'Summary', width: 6, visible: true, defaultVisible: true,
    render: (r: any) => makeSummaryInlineEditCell(() => r.summary, fn())(r) },
  { id: 'status', label: 'Status', width: 2, visible: true, defaultVisible: true,
    render: (r: any) => makeStatusCell(() => r.status, () => r.status_category)(r) },
  { id: 'assignee', label: 'Assignee', width: 2, visible: true, defaultVisible: true,
    render: (r: any) => makeAssigneeCell(() => r.assignee_display_name)(r) },
  { id: 'priority', label: 'Priority', width: 1, visible: true, defaultVisible: true,
    render: (r: any) => makePriorityCell(() => r.priority)(r) },
  { id: 'comments', label: 'Comments', width: 1, visible: true, defaultVisible: true,
    render: (r: any) => makeCommentsCell(() => r.comments_count ?? 0)(r) },
];

export default { title: 'Audit Grade/01 — JiraTable (Dynamic Table)' };

export const Default: StoryObj = {
  render: () => <Frame width={1200}><JiraTable rows={rows} columns={columns as any} getRowId={(r: any) => r.id} onRowClick={fn()} /></Frame>,
};

export const WithSorting: StoryObj = {
  name: 'Sorted by Priority',
  render: () => <Frame width={1200}><JiraTable rows={[...rows].sort((a, b) => a.priority.localeCompare(b.priority))} columns={columns as any} getRowId={(r: any) => r.id} onRowClick={fn()} /></Frame>,
};

export const Empty: StoryObj = {
  render: () => <Frame width={1200}><JiraTable rows={[]} columns={columns as any} getRowId={(r: any) => r.id} onRowClick={fn()} /></Frame>,
};

export const FewRows: StoryObj = {
  name: '3 Rows — Compact',
  render: () => <Frame width={1200}><JiraTable rows={rows.slice(0, 3)} columns={columns as any} getRowId={(r: any) => r.id} onRowClick={fn()} /></Frame>,
};

export const ManyRows: StoryObj = {
  name: '25 Rows — Scrollable',
  render: () => <Frame width={1200}><div style={{ maxHeight: 400, overflow: 'auto' }}><JiraTable rows={rows} columns={columns as any} getRowId={(r: any) => r.id} onRowClick={fn()} /></div></Frame>,
};
