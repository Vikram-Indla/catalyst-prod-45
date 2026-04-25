/**
 * ProjectHub Backlog View — Release-grouped rows with sidebar
 */
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { PHIssue, PHRelease } from '@/services/project-hub.service';
import { getDisplayKey } from '@/services/project-hub.service';
import type { IssueType } from '@/types/project-hub.types';
import { PHIssueTypeIcon, TYPE_ACCENT } from './PHIssueTypeIcon';
import { PHSourceTag } from './PHSourceTag';
import { PHStatusLozenge } from './PHStatusLozenge';
import { SkeletonTable } from '@/components/project-hub/shared/SkeletonPulse';

interface Props {
  issues: PHIssue[];
  releases: PHRelease[];
  loading?: boolean;
  onSelectIssue: (issue: PHIssue) => void;
}

export function PHBacklogView({ issues, releases, loading, onSelectIssue }: Props) {
  const [activeRelease, setActiveRelease] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredIssues = useMemo(() => {
    if (!activeRelease) return issues;
    if (activeRelease === '__unassigned') return issues.filter(i => !i.release_id);
    return issues.filter(i => i.release_id === activeRelease);
  }, [issues, activeRelease]);

  const groups = useMemo(() => {
    const map: Record<string, PHIssue[]> = {};
    filteredIssues.forEach(issue => {
      const key = issue.release_id ?? '__unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(issue);
    });
    return map;
  }, [filteredIssues]);

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const getReleaseName = (id: string) =>
    id === '__unassigned' ? 'Unassigned' : (releases.find(r => r.id === id)?.name ?? 'Unknown');

  const getProgress = (items: PHIssue[]) => {
    const done = items.filter(i => i.status === 'production' || i.status === 'prod_ready').length;
    return items.length > 0 ? Math.round((done / items.length) * 100) : 0;
  };

  const PRIORITY_ACCENT: Record<string, string> = {
    urgent: '#EF4444',
    high: '#D97706',
    medium: '#2563EB',
    low: '#64748B',
  };

  return (
    <div className="flex gap-0" style={{ minHeight: 'calc(100vh - 320px)' }}>
      {/* Release Sidebar */}
      <div
        className="flex-shrink-0 border-r overflow-y-auto bg-[var(--bg-1)]"
        style={{ width: 180, borderColor: 'var(--divider)' }}
      >
        <div className="p-2">
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', marginBottom: 4 }}>
            Releases
          </div>
          {/* All */}
          <SidebarButton
            label="All"
            count={issues.length}
            isActive={!activeRelease}
            onClick={() => setActiveRelease(null)}
          />

          {releases.map(rel => {
            const count = issues.filter(i => i.release_id === rel.id).length;
            const prog = getProgress(issues.filter(i => i.release_id === rel.id));
            return (
              <SidebarButton
                key={rel.id}
                label={rel.name}
                count={count}
                progress={prog}
                isActive={activeRelease === rel.id}
                onClick={() => setActiveRelease(rel.id)}
              />
            );
          })}

          <SidebarButton
            label="Unassigned"
            count={issues.filter(i => !i.release_id).length}
            isActive={activeRelease === '__unassigned'}
            onClick={() => setActiveRelease('__unassigned')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={8} /></div>
        ) : Object.keys(groups).length === 0 ? (
          <div className="flex items-center justify-center" style={{ padding: 60, color: 'var(--fg-4)', fontSize: 13, fontFamily: 'var(--cp-font-body)' }}>
            No items in this release
          </div>
        ) : (
          Object.entries(groups).map(([groupId, groupIssues]) => {
            const isCollapsed = collapsedGroups.has(groupId);
            const progress = getProgress(groupIssues);
            return (
              <div
                key={groupId}
                className="mb-3 rounded-xl border bg-[var(--cp-float)]"
                style={{ borderColor: 'var(--divider)' }}
              >
                {/* Group Header */}
                <div
                  className="flex items-center gap-2 px-3 cursor-pointer transition-colors rounded-t-xl"
                  style={{ height: 40, borderBottom: isCollapsed ? 'none' : '1px solid var(--divider)' }}
                  onClick={() => toggleCollapse(groupId)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {isCollapsed
                    ? <ChevronRight size={14} color="var(--fg-3)" />
                    : <ChevronDown size={14} color="var(--fg-3)" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>
                    {getReleaseName(groupId)}
                  </span>
                  <span
                    className="rounded-full flex items-center justify-center bg-[var(--cp-bd-zone)]"
                    style={{
                      width: 20, height: 20,
                      fontSize: 10, fontWeight: 600,
                      color: 'var(--fg-3)',
                      fontFamily: 'var(--cp-font-mono)',
                    }}
                  >
                    {groupIssues.length}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full overflow-hidden bg-[var(--divider)]" style={{ width: 60, height: 4 }}>
                      <div className="rounded-full bg-[var(--sem-success)]" style={{ width: `${progress}%`, height: '100%', transition: 'width 200ms ease' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>{progress}%</span>
                  </div>
                </div>

                {/* Rows */}
                {!isCollapsed && (
                  <div>
                    {groupIssues.length === 0 ? (
                      <div style={{ padding: '20px 16px', color: 'var(--fg-4)', fontSize: 12, textAlign: 'center' }}>
                        No items in this release
                      </div>
                    ) : groupIssues.map(issue => {
                      const accentColor = PRIORITY_ACCENT[issue.priority] ?? '#64748B';
                      const isHovered = hoveredId === issue.id;
                      return (
                        <div
                          key={issue.id}
                          className="flex items-center gap-2 px-3 cursor-pointer group"
                          style={{
                            height: 44, maxHeight: 44,
                            borderBottom: '1px solid var(--cp-bd-zone)',
                            borderLeft: `3px solid ${accentColor}`,
                            background: isHovered ? 'rgba(37,99,235,.03)' : undefined,
                            fontFamily: 'var(--cp-font-body)',
                            transition: 'background 120ms ease',
                          }}
                          onClick={() => onSelectIssue(issue)}
                          onMouseEnter={() => setHoveredId(issue.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <GripVertical
                            size={12}
                            color="#D1D5DB"
                            className="flex-shrink-0"
                            style={{
                              opacity: isHovered ? 1 : 0,
                              transition: 'opacity 120ms ease',
                            }}
                          />
                          <PHIssueTypeIcon type={issue.type} size={16} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', fontFamily: 'var(--cp-font-mono)' }}>
                            {getDisplayKey(issue)}
                          </span>
                          <PHSourceTag source={issue.source} />
                          <span
                            className="truncate flex-1"
                            style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}
                          >
                            {issue.title}
                          </span>
                          <PHStatusLozenge status={issue.status} compact />
                          <span
                            className={`rounded-full inline-flex items-center justify-center flex-shrink-0 ${issue.assignee_id ? 'bg-[var(--divider)]' : 'bg-transparent'}`}
                            style={{
                              width: 22, height: 22,
                              border: issue.assignee_id ? 'none' : '1.5px dashed var(--divider)',
                              fontSize: 9, fontWeight: 700, color: 'var(--fg-3)',
                            }}
                          >
                            {issue.assignee_id ? '👤' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* Sidebar button extracted for DRY */
function SidebarButton({ label, count, progress, isActive, onClick }: {
  label: string; count: number; progress?: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md mb-0.5 transition-colors ${isActive ? 'bg-[var(--cp-blue-wash)]' : 'bg-transparent'}`}
      style={{
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--cp-blue)' : 'var(--fg-2)',
        border: isActive ? '1px solid var(--cp-primary-20)' : '1px solid transparent',
        cursor: 'pointer',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-mono)' }}>
          {count}
        </span>
      </div>
      {progress !== undefined && (
        <div className="rounded-full overflow-hidden bg-[var(--divider)]" style={{ width: '100%', height: 3 }}>
          <div className="rounded-full bg-[var(--sem-success)]" style={{ width: `${progress}%`, height: '100%', transition: 'width 200ms ease' }} />
        </div>
      )}
    </button>
  );
}
