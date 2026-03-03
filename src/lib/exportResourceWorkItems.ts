/**
 * Export Resource Work Items — 3-sheet Excel (Current, Last Month, Month Before)
 * Grouped by Assignee, presentation-ready executive formatting
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
  project_key: string | null;
  project_name: string | null;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
}

function buildSheetFromItems(items: WorkItemRow[], sheetTitle: string): XLSX.WorkSheet {
  const headers = ['#', 'Key', 'Project', 'Type', 'Title', 'Status', 'Priority', 'Created', 'Updated', 'Parent'];

  // Group items by assignee
  const grouped = new Map<string, WorkItemRow[]>();
  for (const item of items) {
    const name = item.assignee_display_name || 'Unassigned';
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(item);
  }

  // Sort assignees alphabetically, Unassigned last
  const sortedAssignees = [...grouped.keys()].sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  // Build AOA: title + summary + blank + grouped data
  const aoa: any[][] = [
    [sheetTitle],
    [
      `Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`,
      '', '', '', '', '', '', '', '',
      `Total: ${items.length} items  |  ${grouped.size} assignees`
    ],
    [],
  ];

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];

  let globalSeq = 0;

  for (const assignee of sortedAssignees) {
    const assigneeItems = grouped.get(assignee)!;
    assigneeItems.sort((a, b) => {
      const sa = a.status || '';
      const sb = b.status || '';
      if (sa !== sb) return sa.localeCompare(sb);
      return (b.jira_updated_at || '').localeCompare(a.jira_updated_at || '');
    });

    // Assignee group header
    const assigneeRowIdx = aoa.length;
    aoa.push([`${assignee}  (${assigneeItems.length} items)`, '', '', '', '', '', '', '', '', '']);
    merges.push({ s: { r: assigneeRowIdx, c: 0 }, e: { r: assigneeRowIdx, c: 9 } });

    // Column headers
    aoa.push([...headers]);

    // Data rows
    for (const item of assigneeItems) {
      globalSeq++;
      aoa.push([
        globalSeq,
        item.issue_key,
        item.project_key || item.project_name || '—',
        item.issue_type,
        item.summary || '',
        item.status || '',
        item.priority || '—',
        formatDate(item.jira_created_at),
        formatDate(item.jira_updated_at),
        item.parent_key ? `${item.parent_key} — ${item.parent_summary || ''}` : '—',
      ]);
    }

    // Blank row between groups
    aoa.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths — presentation-grade
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 14 },  // Key
    { wch: 16 },  // Project
    { wch: 12 },  // Type
    { wch: 52 },  // Title
    { wch: 18 },  // Status
    { wch: 10 },  // Priority
    { wch: 14 },  // Created
    { wch: 14 },  // Updated
    { wch: 45 },  // Parent
  ];

  ws['!merges'] = merges;

  return ws;
}

export async function exportResourceWorkItems(
  deptFilter: string,
  resources: { rid: string; jira_account_id?: string | null; full_name: string; dept_name: string | null }[]
): Promise<void> {
  const deptResources = deptFilter === 'All'
    ? resources
    : resources.filter(r => r.dept_name === deptFilter);

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

  const now = new Date();
  const months = [
    { label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`, start: startOfMonth(now), end: endOfMonth(now) },
    { label: `${MONTH_NAMES[subMonths(now, 1).getMonth()]} ${subMonths(now, 1).getFullYear()}`, start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
    { label: `${MONTH_NAMES[subMonths(now, 2).getMonth()]} ${subMonths(now, 2).getFullYear()}`, start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)) },
  ];

  const overallStart = months[2].start.toISOString();
  const overallEnd = months[0].end.toISOString();

  const BATCH_SIZE = 50;
  const allItems: WorkItemRow[] = [];

  for (let i = 0; i < jiraAccountIds.length; i += BATCH_SIZE) {
    const batch = jiraAccountIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('ph_issues')
      .select('issue_key, issue_type, summary, status, jira_created_at, jira_updated_at, parent_key, parent_summary, assignee_display_name, priority, assignee_account_id, project_key, project_name')
      .in('assignee_account_id', batch)
      .gte('jira_updated_at', overallStart)
      .lte('jira_updated_at', overallEnd)
      .is('jira_removed_at', null)
      .order('jira_updated_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    if (data) allItems.push(...(data as any[]));
  }

  if (allItems.length === 0) throw new Error('No work items found for the selected resources in the last 3 months');

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

  const wb = XLSX.utils.book_new();

  months.forEach((month, idx) => {
    const ws = buildSheetFromItems(buckets[idx], `${deptFilter} — ${month.label}`);
    XLSX.utils.book_append_sheet(wb, ws, month.label);
  });

  const timestamp = format(now, 'yyyy-MM-dd');
  XLSX.writeFile(wb, `${deptFilter}-Work-Items-${timestamp}.xlsx`);
}
