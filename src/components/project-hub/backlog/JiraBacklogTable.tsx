import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { JiraBacklogIssue } from '@/hooks/useJiraBacklogIssues';
import WatchButton from '@/components/shared/WatchButton';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'done':        { bg: 'rgba(16,185,129,0.1)', text: '#059669' },
  'in progress': { bg: 'rgba(37,99,235,0.1)', text: '#2563EB' },
  'to do':       { bg: 'rgba(148,163,184,0.12)', text: '#64748B' },
};

function getStatusStyle(category: string) {
  const key = (category || '').toLowerCase().replace('_', ' ');
  if (key.includes('done')) return STATUS_COLORS['done'];
  if (key.includes('progress') || key.includes('in_progress')) return STATUS_COLORS['in progress'];
  return STATUS_COLORS['to do'];
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#DC2626', High: '#EA580C', Medium: '#F59E0B', Low: '#3B82F6', Lowest: '#94A3B8',
};

interface Props {
  issues: JiraBacklogIssue[];
  title: string;
  showParent?: boolean;
}

type SortKey = 'issue_key' | 'summary' | 'status' | 'priority' | 'assignee_display_name' | 'jira_updated_at';

export function JiraBacklogTable({ issues, title, showParent = false }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('jira_updated_at');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = issues;
    if (q) {
      list = list.filter(i =>
        i.issue_key.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        (i.assignee_display_name || '').toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [issues, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const thClass = 'px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filtered.length} / {issues.length}
          </span>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search issues..."
            className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-muted/50 z-10">
            <tr>
              <th className={`${thClass} w-[100px]`} onClick={() => toggleSort('issue_key')}>
                <span className="flex items-center gap-1">Key <SortIcon col="issue_key" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort('summary')}>
                <span className="flex items-center gap-1">Summary <SortIcon col="summary" /></span>
              </th>
              {showParent && <th className={`${thClass} w-[120px]`}>Parent</th>}
              <th className={`${thClass} w-[130px]`} onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
              </th>
              <th className={`${thClass} w-[90px]`} onClick={() => toggleSort('priority')}>
                <span className="flex items-center gap-1">Priority <SortIcon col="priority" /></span>
              </th>
              <th className={`${thClass} w-[150px]`} onClick={() => toggleSort('assignee_display_name')}>
                <span className="flex items-center gap-1">Assignee <SortIcon col="assignee_display_name" /></span>
              </th>
              <th className={`${thClass} w-[100px]`}>Type</th>
              <th className={`${thClass} w-[110px]`} onClick={() => toggleSort('jira_updated_at')}>
                <span className="flex items-center gap-1">Updated <SortIcon col="jira_updated_at" /></span>
              </th>
              <th className={`${thClass} w-[40px]`}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={showParent ? 9 : 8} className="text-center py-12 text-muted-foreground text-sm">
                  No issues found
                </td>
              </tr>
            ) : filtered.map(issue => {
              const statusStyle = getStatusStyle(issue.status_category);
              return (
                <tr key={issue.issue_key} className="group border-b border-border/50 hover:bg-muted/30 transition-colors h-[44px]">
                  <td className="px-3 py-1.5">
                    <span className="text-xs font-mono font-medium text-primary">{issue.issue_key}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-sm text-foreground line-clamp-1">{issue.summary}</span>
                  </td>
                  {showParent && (
                    <td className="px-3 py-1.5">
                      {issue.parent_key ? (
                        <span className="text-xs font-mono text-muted-foreground">{issue.parent_key}</span>
                      ) : <span className="text-xs text-muted-foreground/50">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-1.5">
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs font-medium" style={{ color: PRIORITY_COLORS[issue.priority] || 'var(--fg-3)' }}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs text-foreground/80 truncate block max-w-[140px]">
                      {issue.assignee_display_name || <span className="text-muted-foreground/50">Unassigned</span>}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">{issue.issue_type}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">
                      {issue.jira_updated_at ? new Date(issue.jira_updated_at).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    {(issue as any).id && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <WatchButton issueId={(issue as any).id} size="sm" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
