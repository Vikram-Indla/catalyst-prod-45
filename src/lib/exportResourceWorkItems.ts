/**
 * Export Resource Work Items — 3-sheet Excel (Current, Last Month, Month Before)
 * Fetches ph_issues assigned to resources in the selected department filter
 * Columns: Key, Type, Title, Status, Created, Updated, Parent
 */
import * as XLSX from 'xlsx';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface WorkItemRow {
  issue_key: string;
  issue_type: string;
  summary: string;
  status: string;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  assignee_display_name: string | null;
  priority: string | null;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
}

function buildSheetFromItems(items: WorkItemRow[], sheetTitle: string): XLSX.WorkSheet {
  const headers = ['Key', 'Type', 'Title', 'Status', 'Assignee', 'Priority', 'Created', 'Updated', 'Parent'];

  const rows = items.map(item => ([
    item.issue_key,
    item.issue_type,
    item.summary || '',
    item.status || '',
    item.assignee_display_name || '—',
    item.priority || '—',
    formatDate(item.jira_created_at),
    formatDate(item.jira_updated_at),
    item.parent_key ? `${item.parent_key} — ${item.parent_summary || ''}` : '—',
  ]));

  // Build AOA with title row + blank + headers + data
  const aoa: any[][] = [
    [sheetTitle],
    [`Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, '', '', '', '', '', '', '', `Total: ${items.length} items`],
    [],
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths — executive-grade
  ws['!cols'] = [
    { wch: 14 },  // Key
    { wch: 12 },  // Type
    { wch: 50 },  // Title
    { wch: 18 },  // Status
    { wch: 22 },  // Assignee
    { wch: 10 },  // Priority
    { wch: 14 },  // Created
    { wch: 14 },  // Updated
    { wch: 45 },  // Parent
  ];

  // Merge title row
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

  // Auto-filter on headers row (row index 3)
  ws['!autofilter'] = { ref: `A4:I${4 + rows.length}` };

  return ws;
}

export async function exportResourceWorkItems(
  deptFilter: string,
  resources: { rid: string; jira_account_id?: string | null; full_name: string; dept_name: string | null }[]
): Promise<void> {
  // Filter resources by department
  const deptResources = deptFilter === 'All'
    ? resources
    : resources.filter(r => r.dept_name === deptFilter);

  // Collect Jira account IDs
  // We need to fetch jira_account_id from resource_inventory for all dept resources
  const rids = deptResources.map(r => r.rid).filter(Boolean);
  if (rids.length === 0) throw new Error('No resources found for this department');

  const { data: riData } = await supabase
    .from('resource_inventory')
    .select('rid, jira_account_id')
    .in('rid', rids);

  const jiraAccountIds = (riData || [])
    .map((r: any) => r.jira_account_id)
    .filter(Boolean) as string[];

  if (jiraAccountIds.length === 0) throw new Error('No linked Jira accounts found for these resources');

  // Calculate month ranges
  const now = new Date();
  const months = [
    { label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`, start: startOfMonth(now), end: endOfMonth(now) },
    { label: `${MONTH_NAMES[subMonths(now, 1).getMonth()]} ${subMonths(now, 1).getFullYear()}`, start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
    { label: `${MONTH_NAMES[subMonths(now, 2).getMonth()]} ${subMonths(now, 2).getFullYear()}`, start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)) },
  ];

  // Fetch all work items for the 3-month window
  const overallStart = months[2].start.toISOString();
  const overallEnd = months[0].end.toISOString();

  // Fetch in batches if needed (Supabase 1000 row limit)
  const BATCH_SIZE = 50;
  const allItems: WorkItemRow[] = [];

  for (let i = 0; i < jiraAccountIds.length; i += BATCH_SIZE) {
    const batch = jiraAccountIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('ph_issues')
      .select('issue_key, issue_type, summary, status, jira_created_at, jira_updated_at, parent_key, parent_summary, assignee_display_name, priority, assignee_account_id')
      .in('assignee_account_id', batch)
      .gte('jira_updated_at', overallStart)
      .lte('jira_updated_at', overallEnd)
      .is('jira_removed_at', null)
      .order('jira_updated_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    if (data) allItems.push(...(data as any[]));
  }

  if (allItems.length === 0) throw new Error('No work items found for the selected resources in the last 3 months');

  // Split by month based on jira_updated_at
  const buckets: WorkItemRow[][] = [[], [], []];
  for (const item of allItems) {
    const updated = new Date(item.jira_updated_at || item.jira_created_at || '');
    for (let m = 0; m < 3; m++) {
      if (updated >= months[m].start && updated <= months[m].end) {
        buckets[m].push(item);
        break;
      }
    }
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  months.forEach((month, idx) => {
    const ws = buildSheetFromItems(buckets[idx], `${deptFilter} — ${month.label}`);
    XLSX.utils.book_append_sheet(wb, ws, month.label);
  });

  // Download
  const timestamp = format(now, 'yyyy-MM-dd');
  XLSX.writeFile(wb, `${deptFilter}-Work-Items-${timestamp}.xlsx`);
}
