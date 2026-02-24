/**
 * ProjectHub List View — Hierarchical table with tree connectors, bulk actions, column toggles
 */
import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, MoreHorizontal, SearchX } from 'lucide-react';
import type { PHIssue } from '@/services/project-hub.service';
import type { PHRelease } from '@/services/project-hub.service';
import { getDisplayKey } from '@/services/project-hub.service';
import type { IssueStatus, IssueType } from '@/types/project-hub.types';
import { PHIssueTypeIcon, TYPE_ACCENT } from './PHIssueTypeIcon';
import { PHSourceTag } from './PHSourceTag';
import { PHStatusLozenge } from './PHStatusLozenge';
import { PHPriorityIcon } from './PHPriorityIcon';
import { SkeletonTable } from '@/components/project-hub/shared/SkeletonPulse';

const COLUMNS = [
  { key: 'issue', label: 'Issue', default: true, locked: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'priority', label: 'Priority', default: true },
  { key: 'assignee', label: 'Assignee', default: true },
  { key: 'release', label: 'Release', default: true },
  { key: 'due', label: 'Due', default: true },
  { key: 'source', label: 'Source', default: true },
] as const;

type ColKey = typeof COLUMNS[number]['key'];

interface Props {
  issues: PHIssue[];
  releases: PHRelease[];
  loading?: boolean;
  onSelectIssue: (issue: PHIssue) => void;
  onUpdateIssue: (id: string, updates: Partial<PHIssue>) => void;
  onClearFilters?: () => void;
}

export function PHListView({ issues, releases, loading, onSelectIssue, onUpdateIssue, onClearFilters }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const [perPage] = useState(12); /* FP-001 */
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build tree
  const rootIssues = useMemo(
    () => issues.filter(i => !i.parent_id),
    [issues]
  );
  const childrenMap = useMemo(() => {
    const m: Record<string, PHIssue[]> = {};
    issues.forEach(i => {
      if (i.parent_id) {
        if (!m[i.parent_id]) m[i.parent_id] = [];
        m[i.parent_id].push(i);
      }
    });
    return m;
  }, [issues]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const completedCount = issues.filter(i => i.status === 'production' || i.status === 'prod_ready').length;

  const getRel = (id: string | null) => releases.find(r => r.id === id)?.name ?? '—';

  const renderRow = (issue: PHIssue, depth: number, isLast: boolean) => {
    const children = childrenMap[issue.id] ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(issue.id);
    const isSelected = selectedIds.has(issue.id);
    const isHovered = hoveredId === issue.id;
    const accentColor = TYPE_ACCENT[issue.type as IssueType] ?? '#94A3B8';

    const childCompletedCount = children.filter(c => c.status === 'production' || c.status === 'prod_ready').length;
    const childProgress = children.length > 0 ? Math.round((childCompletedCount / children.length) * 100) : 0;

    return (
      <React.Fragment key={issue.id}>
        <tr
          className="group cursor-pointer"
          style={{
            height: 44,
            maxHeight: 44, /* FP-002 */
            background: isSelected ? '#EFF6FF' : isHovered ? 'rgba(37,99,235,.03)' : undefined,
            borderLeft: `3px solid ${accentColor}`,
            transition: 'background 120ms ease',
          }}
          onClick={() => onSelectIssue(issue)}
          onMouseEnter={() => setHoveredId(issue.id)}
          onMouseLeave={() => setHoveredId(null)}
          onContextMenu={e => { e.preventDefault(); }}
        >
          {/* Checkbox */}
          <td style={{ width: 36, padding: '0 8px' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(issue.id)}
              onClick={e => e.stopPropagation()}
              className="accent-blue-600"
              style={{ width: 14, height: 14 }}
            />
          </td>

          {/* Issue */}
          {visibleCols.has('issue') && (
            <td style={{ padding: '0 8px' }}>
              <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 24 }}>
                {depth > 0 && (
                  <span className="flex-shrink-0" style={{ width: 12, height: 1, background: '#E2E8F0' }} />
                )}
                {hasChildren ? (
                  <button
                    onClick={e => { e.stopPropagation(); toggleExpand(issue.id); }}
                    className="flex-shrink-0 p-0.5 rounded transition-colors"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {isExpanded
                      ? <ChevronDown size={12} color="#64748B" />
                      : <ChevronRight size={12} color="#64748B" />}
                  </button>
                ) : (
                  <span style={{ width: 16 }} />
                )}
                <PHIssueTypeIcon type={issue.type} size={16} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#2563EB',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {getDisplayKey(issue)}
                </span>
                <PHSourceTag source={issue.source} />
                <span
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: hasChildren ? 600 : 500,
                    color: '#0F172A',
                    maxWidth: 300,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {issue.title}
                </span>
                {hasChildren && (
                  <div className="flex items-center gap-1 ml-1">
                    <div
                      className="rounded-full overflow-hidden"
                      style={{ width: 40, height: 4, background: '#E2E8F0' }}
                    >
                      <div
                        className="rounded-full"
                        style={{
                          width: `${childProgress}%`,
                          height: '100%',
                          background: '#16A34A',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                      {childProgress}%
                    </span>
                  </div>
                )}
              </div>
            </td>
          )}

          {visibleCols.has('status') && (
            <td style={{ padding: '0 8px' }}>
              <PHStatusLozenge status={issue.status} compact />
            </td>
          )}

          {visibleCols.has('priority') && (
            <td style={{ padding: '0 8px' }}>
              <PHPriorityIcon priority={issue.priority} showLabel />
            </td>
          )}

          {visibleCols.has('assignee') && (
            <td style={{ padding: '0 8px' }}>
              <span
                className="rounded-full inline-flex items-center justify-center"
                style={{
                  width: 22, height: 22,
                  background: issue.assignee_id ? '#E2E8F0' : 'transparent',
                  border: issue.assignee_id ? 'none' : '1.5px dashed #CBD5E1',
                  fontSize: 9, fontWeight: 700, color: '#64748B',
                }}
              >
                {issue.assignee_id ? '👤' : ''}
              </span>
            </td>
          )}

          {visibleCols.has('release') && (
            <td style={{ padding: '0 8px', fontSize: 11, color: '#64748B', fontWeight: 500 }}>
              {getRel(issue.release_id)}
            </td>
          )}

          {visibleCols.has('due') && (
            <td style={{
              padding: '0 8px',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: (issue.overdue_days ?? 0) > 0 ? '#EF4444' : '#64748B',
              fontWeight: (issue.overdue_days ?? 0) > 0 ? 600 : 400,
            }}>
              {issue.due_date
                ? new Date(issue.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
              {(issue.overdue_days ?? 0) > 0 && (
                <span style={{ color: '#EF4444', fontSize: 9, marginLeft: 4 }}>+{issue.overdue_days}d</span>
              )}
            </td>
          )}

          {visibleCols.has('source') && (
            <td style={{ padding: '0 8px' }}>
              <PHSourceTag source={issue.source} />
            </td>
          )}

          {/* Hover more */}
          <td style={{ width: 32, padding: '0 4px' }}>
            <button
              className="p-1 rounded transition-colors"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 120ms ease',
              }}
              onClick={e => e.stopPropagation()}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MoreHorizontal size={14} color="#94A3B8" />
            </button>
          </td>
        </tr>

        {/* Children */}
        {isExpanded && children.map((child, ci) => renderRow(child, depth + 1, ci === children.length - 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 rounded-lg mb-2"
          style={{
            height: 40,
            background: '#2563EB',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            transition: 'all 200ms ease',
          }}
        >
          <span>{selectedIds.size} selected</span>
          <button
            className="px-3 py-1 rounded transition-colors"
            style={{ fontSize: 11, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', cursor: 'pointer', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => {
              selectedIds.forEach(id => onUpdateIssue(id, { status: 'in_dev' } as any));
              setSelectedIds(new Set());
            }}
          >
            Move to In Progress
          </button>
          <button
            className="px-3 py-1 rounded transition-colors"
            style={{ fontSize: 11, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', cursor: 'pointer', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => {
              selectedIds.forEach(id => onUpdateIssue(id, { status: 'production' } as any));
              setSelectedIds(new Set());
            }}
          >
            Mark Done
          </button>
          <button
            className="ml-auto px-3 py-1 rounded transition-colors"
            style={{ fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}
            onClick={() => setSelectedIds(new Set())}
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="p-4">
          <SkeletonTable rows={8} />
        </div>
      ) : issues.length === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-xl border"
          style={{ padding: '60px 40px', background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <SearchX size={32} color="#94A3B8" strokeWidth={1.5} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginTop: 12, fontFamily: "'Inter', sans-serif" }}>
            No items match filters
          </span>
          <span style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Try adjusting your filters or search criteria
          </span>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="mt-4 px-4 py-1.5 rounded-md transition-colors"
              style={{
                fontSize: 12, fontWeight: 600, border: '1px solid #BFDBFE',
                background: '#EFF6FF', color: '#2563EB', cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-auto rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
              <thead>
                <tr
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    height: 36,
                  }}
                >
                  <th style={{ width: 36, padding: '0 8px' }}>
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      style={{ width: 14, height: 14 }}
                      checked={selectedIds.size === issues.length && issues.length > 0}
                      onChange={() => {
                        if (selectedIds.size === issues.length) setSelectedIds(new Set());
                        else setSelectedIds(new Set(issues.map(i => i.id)));
                      }}
                    />
                  </th>
                  {COLUMNS.filter(c => visibleCols.has(c.key)).map(c => (
                    <th
                      key={c.key}
                      style={{
                        padding: '0 8px',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#94A3B8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        textAlign: 'left',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {rootIssues.map((issue, i) => renderRow(issue, 0, i === rootIssues.length - 1))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-2 mt-2" style={{ height: 32 }}>
            <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
              {issues.length} items · {completedCount} completed
            </span>
            <div className="relative">
              <button
                onClick={() => setShowColPicker(!showColPicker)}
                className="flex items-center gap-1 px-3 py-1 rounded-md transition-colors"
                style={{
                  fontSize: 11, fontWeight: 500, color: '#64748B',
                  border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
                }}
              >
                Columns
              </button>
              {showColPicker && (
                <div
                  className="absolute bottom-full right-0 mb-1 rounded-lg shadow-lg border p-2 z-20"
                  style={{ background: '#fff', borderColor: '#E2E8F0', minWidth: 160 }}
                >
                  {COLUMNS.map(c => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      style={{ fontSize: 12, color: '#334155' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.has(c.key)}
                        disabled={'locked' in c && c.locked}
                        onChange={() => {
                          setVisibleCols(prev => {
                            const next = new Set(prev);
                            if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                            return next;
                          });
                        }}
                        className="accent-blue-600"
                        style={{ width: 13, height: 13 }}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
