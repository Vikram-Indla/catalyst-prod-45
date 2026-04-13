/**
 * AllWorkTable — Toolbar + sortable data table with sticky headers
 * Columns: Type | Key | Summary | Status | P | Assignee | Updated
 * 36px row height, tight density, hover highlight, selected row
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { Search, ChevronDown, ArrowUpDown, LayoutGrid, Columns3 } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  items: AllWorkItem[];
  loading: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  projectKey: string;
}

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function fmtRel(d: string | null) { if (!d) return ''; try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; } }

function statusCategory(status: string, category?: string | null): 'todo' | 'inprogress' | 'done' {
  const cat = (category ?? '').toLowerCase();
  if (cat.includes('done')) return 'done';
  if (cat.includes('progress') || cat.includes('review')) return 'inprogress';
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'done';
  if (s.includes('progress') || s.includes('review') || s.includes('dev') || s.includes('testing') || s.includes('qa')) return 'inprogress';
  return 'todo';
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#EF4444', High: '#F97316', Medium: '#3B82F6', Low: '#22C55E', Lowest: '#8C8F96',
};

type SortField = 'issue_key' | 'summary' | 'status' | 'priority' | 'assignee_display_name' | 'jira_updated_at';
type SortDir = 'asc' | 'desc';

export function AllWorkTable({ items, loading, selectedKey, onSelect, searchQuery, onSearchChange, projectKey }: Props) {
  const [sortField, setSortField] = useState<SortField>('jira_updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 250);
  }, [onSearchChange]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = (a as any)[sortField] ?? '';
      const bv = (b as any)[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!sorted.length) return;
    const idx = sorted.findIndex(i => i.issue_key === selectedKey);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < sorted.length - 1) onSelect(sorted[idx + 1].issue_key); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) onSelect(sorted[idx - 1].issue_key); }
  }, [sorted, selectedKey, onSelect]);

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th className={className} onClick={() => handleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  );

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="allwork-toolbar">
        <div className="allwork-toolbar-left">
          <div style={{ position: 'relative' }}>
            <input
              className="allwork-search-input"
              placeholder="Search by key or summary..."
              defaultValue={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button className="allwork-toolbar-button">Status: All <ChevronDown style={{ width: 12, height: 12 }} /></button>
        </div>
        <div className="allwork-toolbar-right">
          <span style={{ fontSize: 11, color: '#6b778c' }}>Updated ↓</span>
          <span style={{ fontSize: 11, color: '#6b778c' }}>Created</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="allwork-table-wrapper" onKeyDown={handleKeyDown} tabIndex={0}>
        <table className="allwork-table">
          <thead>
            <tr>
              <th className="allwork-col-type">T</th>
              <SortHeader field="issue_key" label="KEY" className="allwork-col-key" />
              <SortHeader field="summary" label="SUMMARY" className="allwork-col-summary" />
              <SortHeader field="status" label="STATUS" className="allwork-col-status" />
              <th className="allwork-col-priority">P</th>
              <SortHeader field="assignee_display_name" label="ASSIGNEE" className="allwork-col-assignee" />
              <SortHeader field="jira_updated_at" label="UPDATED" className="allwork-col-updated" />
            </tr>
          </thead>
          <tbody>
            {loading && !sorted.length ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} style={{ height: 36 }}>
                    <div style={{ width: `${60 + Math.random() * 30}%`, height: 12, borderRadius: 3, background: '#E2E8F0' }} />
                  </td>
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#6b778c' }}>No issues found</td></tr>
            ) : (
              sorted.map(item => {
                const isSelected = item.issue_key === selectedKey;
                const cat = statusCategory(item.status, item.status_category);
                const pc = PRIORITY_COLORS[item.priority] ?? '#8C8F96';
                return (
                  <tr
                    key={item.issue_key}
                    className={isSelected ? 'allwork-table-row--selected' : ''}
                    onClick={() => onSelect(item.issue_key)}
                  >
                    <td className="allwork-col-type">
                      <JiraIssueTypeIcon issueType={item.issue_type} size={16} />
                    </td>
                    <td className="allwork-col-key">
                      <span className="allwork-issue-key">{item.issue_key}</span>
                    </td>
                    <td className="allwork-col-summary">
                      <span className="allwork-summary">{item.summary}</span>
                    </td>
                    <td className="allwork-col-status">
                      <span className={`allwork-status-lozenge allwork-status--${cat}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="allwork-col-priority">
                      <svg width="16" height="16" viewBox="0 0 16 16" className="allwork-priority-icon">
                        <rect y="5" width="16" height="2" rx="1" fill={pc} />
                        <rect y="9" width="16" height="2" rx="1" fill={pc} />
                      </svg>
                    </td>
                    <td className="allwork-col-assignee">
                      {item.assignee_display_name ? (
                        <span className="allwork-assignee">
                          <span className="allwork-avatar" style={{ background: avatarBg(item.assignee_display_name) }}>
                            {initials(item.assignee_display_name)}
                          </span>
                          <span className="allwork-assignee-name">{item.assignee_display_name}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#6b778c', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="allwork-col-updated">
                      <span style={{ fontSize: 12, color: '#6b778c' }}>{fmtRel(item.jira_updated_at)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="allwork-footer">
        {sorted.length} issue{sorted.length !== 1 ? 's' : ''}
      </div>
    </>
  );
}
