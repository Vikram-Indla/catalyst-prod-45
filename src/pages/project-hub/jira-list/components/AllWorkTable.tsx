/**
 * AllWorkTable — Jira-parity flat table for List & All Work tabs
 * Columns: Key, Summary, Type, Status, Priority, Assignee
 * Features: search, status filter, 25-row pagination, sort by created/updated
 */
import React, { useMemo, useState, useCallback } from 'react';
import { formatWorkItemKey } from '@/lib/formatWorkItemKey';
import { Search } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import type { WorkItem } from '@/types/workItem.types';

/* ── Priority SVG icons (Jira-native) ── */
const P_DANGER = 'var(--ds-icon-danger)';
const P_WARNING = 'var(--ds-icon-warning)';
const P_INFO = 'var(--ds-icon-information)';
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  highest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l5-5 5 5" fill="none" stroke={P_DANGER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12l5-5 5 5" fill="none" stroke={P_DANGER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  high: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 10l5-5 5 5" fill="none" stroke={P_DANGER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  medium: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6h10" fill="none" stroke={P_WARNING} strokeWidth="2" strokeLinecap="round"/><path d="M3 10h10" fill="none" stroke={P_WARNING} strokeWidth="2" strokeLinecap="round"/></svg>,
  low: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke={P_INFO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lowest: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4l5 5 5-5" fill="none" stroke={P_INFO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 8l5 5 5-5" fill="none" stroke={P_INFO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'var(--ds-background-accent-purple-subtle)',
  'var(--ds-background-accent-blue-subtle)',
  'var(--ds-background-accent-green-subtle)',
  'var(--ds-background-accent-red-subtle)',
  'var(--ds-background-accent-yellow-subtle)',
  'var(--ds-background-accent-teal-subtle)',
];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── Tokens ── */
const T = {
  headerBg: 'var(--cp-bg-sunken)',
  headerText: 'var(--cp-text-secondary, var(--cp-text-secondary, var(--cp-text-secondary)))',
  borderColor: 'var(--cp-border-default)',
  rowHover: 'var(--cp-interact-hover, rgba(0,0,0,0.04))',
  keyColor: 'var(--cp-text-link, var(--cp-workstream-catalyst-primary))',
  textPrimary: 'var(--cp-text-primary)',
  textSecondary: 'var(--cp-text-secondary)',
  textMuted: 'var(--cp-text-tertiary)',
  white: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
};

interface AllWorkTableProps {
  items: WorkItem[];
  isLoading?: boolean;
  onOpenItem?: (key: string) => void;
  pageTitle?: string;
  subtitle?: string;
}

type SortField = 'created' | 'updated';
type SortDir = 'ASC' | 'DESC';

export function AllWorkTable({ items, isLoading, onOpenItem, pageTitle = 'All Work', subtitle }: AllWorkTableProps) {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortField>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Extract unique statuses for filter dropdown
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => set.add(i.statusName || i.status));
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  // Filter
  const filtered = useMemo(() => {
    let result = [...items];

    if (searchText.trim()) {
      const s = searchText.trim().toLowerCase();
      result = result.filter(i =>
        i.jiraKey.toLowerCase().includes(s) ||
        (i.summary || '').toLowerCase().includes(s)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(i => (i.statusName || i.status) === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const av = new Date(sortBy === 'created' ? a.createdAt : a.updatedAt).getTime();
      const bv = new Date(sortBy === 'created' ? b.createdAt : b.updatedAt).getTime();
      return sortDir === 'ASC' ? av - bv : bv - av;
    });

    return result;
  }, [items, searchText, statusFilter, sortBy, sortDir]);

  // Reset page on filter change
  const filteredLen = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredLen / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = useCallback((val: string) => {
    setSearchText(val);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortDir('DESC');
    }
    setCurrentPage(1);
  }, [sortBy]);

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            height: 36, borderRadius: 4, marginBottom: 4,
            background: 'linear-gradient(90deg, var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken))) 25%, var(--ds-border, var(--cp-border, var(--cp-bg-sunken))) 50%, var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken))) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--cp-font-body)' }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 16px',
        borderBottom: `0.75px solid ${T.borderColor}`,
        background: T.white,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 320px' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: '48%', transform: 'translateY(-50%)', color: T.textMuted }} />
          <input
            type="text"
            value={searchText}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by key or summary…"
            style={{
              width: '100%',
              height: 32,
              padding: '0 8px 0 32px',
              border: `1px solid ${T.borderColor}`,
              borderRadius: 4,
              fontSize: 'var(--ds-font-size-300)',
              color: T.textPrimary,
              background: T.white,
              outline: 'none',
              fontFamily: 'var(--cp-font-body)',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          style={{
            height: 32,
            padding: '0 32px 0 8px',
            border: `1px solid ${T.borderColor}`,
            borderRadius: 4,
            fontSize: 'var(--ds-font-size-300)',
            color: T.textPrimary,
            background: T.white,
            cursor: 'pointer',
            fontFamily: 'var(--cp-font-body)',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2344546F'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>{s === 'All' ? 'Status: All' : s}</option>
          ))}
        </select>

        {/* Item count + sort toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => toggleSort('updated')}
            style={{
              height: 28, padding: '0 8px',
              border: `1px solid ${sortBy === 'updated' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : T.borderColor}`,
              borderRadius: 3,
              fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
              color: sortBy === 'updated' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : T.textSecondary,
              background: sortBy === 'updated' ? 'var(--ds-background-selected, rgba(37,99,235,0.06))' : T.white,
              cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
            }}
          >
            Updated {sortBy === 'updated' ? (sortDir === 'DESC' ? '↓' : '↑') : ''}
          </button>
          <button
            onClick={() => toggleSort('created')}
            style={{
              height: 28, padding: '0 8px',
              border: `1px solid ${sortBy === 'created' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : T.borderColor}`,
              borderRadius: 3,
              fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
              color: sortBy === 'created' ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : T.textSecondary,
              background: sortBy === 'created' ? 'var(--ds-background-selected, rgba(37,99,235,0.06))' : T.white,
              cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
            }}
          >
            Created {sortBy === 'created' ? (sortDir === 'DESC' ? '↓' : '↑') : ''}
          </button>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.textMuted, fontWeight: 500 }}>
            {filteredLen} item{filteredLen !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: T.headerBg, borderBottom: `2px solid ${T.borderColor}` }}>
              <th style={{ ...thStyle, width: 100 }}>Key</th>
              <th style={{ ...thStyle, width: '40%' }}>Summary</th>
              <th style={{ ...thStyle, width: 56, textAlign: 'center' }}>Type</th>
              <th style={{ ...thStyle, width: 140 }}>Status</th>
              <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>Priority</th>
              <th style={{ ...thStyle, width: 180 }}>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: T.textMuted, fontSize: 'var(--ds-font-size-300)' }}>
                  No work items found.
                </td>
              </tr>
            )}
            {pageItems.map(item => (
              <tr
                key={item.id}
                onClick={() => onOpenItem?.(item.jiraKey)}
                style={{
                  height: 40, maxHeight: 40,
                  borderBottom: `0.75px solid ${T.borderColor}`,
                  cursor: 'pointer',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Key */}
                <td style={tdStyle}>
                  <span style={{
                    fontFamily: 'var(--cp-font-mono)',
                    fontSize: 'var(--ds-font-size-300)', fontWeight: 500,
                    color: T.keyColor,
                  }}>
                    {formatWorkItemKey(item.jiraKey)}
                  </span>
                </td>

                {/* Summary */}
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 'var(--ds-font-size-300)', fontWeight: 400, color: T.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {item.summary}
                  </span>
                </td>

                {/* Type icon */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <JiraIssueTypeIcon type={item.type} size={16} />
                  </div>
                </td>

                {/* Status — Jira-parity 6-category colours via workflow engine.
                    Falls back to legacy 3-category lozenge for items outside
                    the bound workflows (e.g. Task/Subtask/Improvement). */}
                <td style={tdStyle}>
                  <StatusLozenge status={item.statusName || item.status || '—'} statusCategory={item.statusCategory} maxWidth={160} />
                </td>

                {/* Priority icon */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={capitalize(item.priority)}>
                    {PRIORITY_SVG[item.priority] || PRIORITY_SVG.medium}
                  </div>
                </td>

                {/* Assignee */}
                <td style={tdStyle}>
                  {item.assignee ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: item.assignee.color || hashColor(item.assignee.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'var(--ds-font-size-50)', fontWeight: 700, color: 'var(--ds-surface)',
                        flexShrink: 0,
                      }}>
                        {item.assignee.initials || getInitials(item.assignee.name)}
                      </div>
                      <span style={{
                        fontSize: 'var(--ds-font-size-300)', color: T.textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 'var(--ds-font-size-300)', color: T.textMuted }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px',
          borderTop: `0.75px solid ${T.borderColor}`,
          background: T.white,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.textMuted }}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredLen)} of {filteredLen}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <PaginationBtn disabled={safePage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              ← Prev
            </PaginationBtn>
            {/* Show max 5 page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (safePage <= 3) {
                pageNum = i + 1;
              } else if (safePage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = safePage - 2 + i;
              }
              return (
                <PaginationBtn
                  key={pageNum}
                  active={pageNum === safePage}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </PaginationBtn>
              );
            })}
            <PaginationBtn disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Next →
            </PaginationBtn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 'var(--ds-font-size-100)',
  fontWeight: 653,
  color: 'var(--ds-text-subtlest, var(--cp-text-secondary))',
  fontFamily: 'var(--cp-font-body)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
  position: 'sticky',
  top: 0,
  zIndex: 1,
  background: 'var(--ds-background-neutral-subtle)',
};

const tdStyle: React.CSSProperties = {
  padding: '0 12px',
  fontSize: 'var(--ds-font-size-300)',
  fontFamily: 'var(--cp-font-body)',
  verticalAlign: 'middle',
};

/* ── Pagination button ── */
function PaginationBtn({ children, disabled, active, onClick }: {
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        height: 28, minWidth: 28, padding: '0 8px',
        border: `1px solid ${active ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--cp-border-default)'}`,
        borderRadius: 3,
        fontSize: 'var(--ds-font-size-200)', fontWeight: active ? 600 : 400,
        color: disabled ? 'var(--cp-text-muted)' : active ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--cp-text-secondary, var(--cp-text-secondary, var(--cp-text-secondary)))',
        background: active ? 'var(--ds-background-selected, rgba(37,99,235,0.06))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--cp-font-body)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
