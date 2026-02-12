/**
 * CSV Export utility — Phase 9
 */
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';

export function exportWorkItemsCSV(items: JiraIssue[], filename?: string) {
  const headers = [
    'Key', 'Type', 'Summary', 'Status', 'Priority',
    'Assignee', 'Project', 'Due Date', 'Story Points',
    'Sprint', 'Resolution', 'Created'
  ];

  const rows = items.map(item => [
    item.issue_key,
    item.issue_type,
    `"${(item.summary || '').replace(/"/g, '""')}"`,
    item.status,
    item.priority || '',
    item.assignee_display_name || '',
    item.project_key || '',
    item.due_date || '',
    item.story_points?.toString() || '',
    item.sprint_name || '',
    item.resolution || '',
    item.jira_created_at?.split('T')[0] || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `workhub-export-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
