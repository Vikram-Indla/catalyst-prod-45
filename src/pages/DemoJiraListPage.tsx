/**
 * DemoJiraListPage — demo route for jira-compare probe of CatalystJiraListView.
 * Wired at /demo/jira-list to allow Chrome MCP probing without Supabase dependency.
 */
import React, { useState } from 'react';
import { CatalystJiraListView } from '../components/jira-list';
import type { JiraIssue, JiraStatus } from '../components/jira-list';

const STATUSES: JiraStatus[] = [
  { id: 's1', name: 'To Do', statusCategory: { key: 'new', colorName: 'blue-gray', name: 'To Do' } },
  { id: 's2', name: 'In Progress', statusCategory: { key: 'indeterminate', colorName: 'yellow', name: 'In Progress' } },
  { id: 's3', name: 'In Review', statusCategory: { key: 'indeterminate', colorName: 'yellow', name: 'In Review' } },
  { id: 's4', name: 'Done', statusCategory: { key: 'done', colorName: 'green', name: 'Done' } },
  { id: 's5', name: 'Blocked', statusCategory: { key: 'new', colorName: 'blue-gray', name: 'To Do' } },
  { id: 's6', name: 'On Hold', statusCategory: { key: 'new', colorName: 'blue-gray', name: 'To Do' } },
];

function makeIssue(
  key: string,
  summary: string,
  type: string,
  status: JiraStatus,
  depth = 0,
  parent: JiraIssue['parent'] = null,
  subtasks: JiraIssue[] = [],
): JiraIssue {
  return {
    id: key,
    key,
    summary,
    issueType: { id: type.toLowerCase(), name: type, iconUrl: '' },
    status,
    priority: { name: 'Medium', iconUrl: '' },
    assignee: null,
    reporter: { accountId: 'u1', displayName: 'Demo User', avatarUrl: '' },
    created: '2026-01-10T10:00:00Z',
    updated: '2026-05-15T10:00:00Z',
    parent,
    subtasks,
    depth,
  };
}

const DEMO_ISSUES: JiraIssue[] = [
  makeIssue('BAU-1001', 'Setup authentication flow for new portal', 'Story', STATUSES[1]),
  makeIssue('BAU-1002', 'Fix login redirect loop on Safari', 'Bug', STATUSES[0]),
  makeIssue('BAU-1003', 'Add unit tests for UserService', 'Task', STATUSES[3]),
  makeIssue('BAU-1004', 'Design new dashboard layout', 'Story', STATUSES[1]),
  makeIssue('BAU-1005', 'Production incident: API gateway timeout', 'Production Incident', STATUSES[1]),
  makeIssue('BAU-1006', 'Change request: Update SLA for support tickets', 'Change Request', STATUSES[0]),
  makeIssue('BAU-1007', 'QA Bug: Form validation fails on empty fields', 'QA Bug', STATUSES[0]),
  makeIssue('BAU-1008', 'Feature: Real-time notifications for mobile', 'Feature', STATUSES[2]),
  makeIssue('BAU-1009', 'Backend: Refactor database connection pool', 'Backend', STATUSES[3]),
  makeIssue('BAU-1010', 'API Req: Add pagination to /v2/users endpoint', 'API Req', STATUSES[0]),
  makeIssue('BAU-1011', 'Business gap: No audit trail for admin actions', 'Business Gap', STATUSES[1]),
  makeIssue('BAU-1012', 'Epic: Q2 Infrastructure Hardening', 'Epic', STATUSES[1]),
  makeIssue(
    'BAU-1013',
    'Subtask: Write migration script for user table',
    'Story',
    STATUSES[0],
    1,
    { id: 'BAU-1012', key: 'BAU-1012', summary: 'Epic: Q2 Infrastructure Hardening', issueType: { id: 'epic', name: 'Epic', iconUrl: '' } },
  ),
  makeIssue(
    'BAU-1014',
    'Subtask: Update staging environment config',
    'Task',
    STATUSES[1],
    1,
    { id: 'BAU-1012', key: 'BAU-1012', summary: 'Epic: Q2 Infrastructure Hardening', issueType: { id: 'epic', name: 'Epic', iconUrl: '' } },
  ),
  makeIssue('BAU-1015', 'Implement dark mode toggle', 'Story', STATUSES[0]),
  makeIssue('BAU-1016', 'Performance: Reduce initial bundle size by 30%', 'Task', STATUSES[2]),
  makeIssue('BAU-1017', 'Security audit: Dependency vulnerability scan', 'Task', STATUSES[3]),
  makeIssue('BAU-1018', 'Mobile: Offline support for field inspectors', 'Feature', STATUSES[0]),
  makeIssue('BAU-1019', 'Add Jira webhook retry mechanism', 'Backend', STATUSES[1]),
  makeIssue('BAU-1020', 'Blocked: SSO integration pending vendor response', 'Story', STATUSES[4]),
];

export default function DemoJiraListPage() {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('created');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  return (
    <div style={{ padding: 24, background: 'var(--ds-surface, #fff)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ds-text, #172b4d)', marginBottom: 16 }}>
        BAU — Dynamic Table Demo
      </h1>
      <CatalystJiraListView
        issues={DEMO_ISSUES}
        currentPage={page}
        isLoading={false}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={({ key, sortOrder: order }) => {
          setSortKey(key);
          setSortOrder(order as 'ASC' | 'DESC');
        }}
        onSetPage={setPage}
        onOpen={(key) => console.log('Open:', key)}
        availableStatuses={STATUSES}
      />
    </div>
  );
}
