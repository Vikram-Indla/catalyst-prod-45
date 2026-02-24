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
import { PHPriorityIcon } from './PHPriorityIcon';

interface Props {
  issues: PHIssue[];
  releases: PHRelease[];
  onSelectIssue: (issue: PHIssue) => void;
}

export function PHBacklogView({ issues, releases, onSelectIssue }: Props) {
  const [activeRelease, setActiveRelease] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter by release
  const filteredIssues = useMemo(() => {
    if (!activeRelease) return issues;
    if (activeRelease === '__unassigned') return issues.filter(i => !i.release_id);
    return issues.filter(i => i.release_id === activeRelease);
  }, [issues, activeRelease]);

  // Group by release
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

  return (
    <div className="flex gap-0" style={{ minHeight: 'calc(100vh - 320px)' }}>
      {/* Release Sidebar */}
      <div
        className="flex-shrink-0 border-r overflow-y-auto"
        style={{ width: 180, borderColor: '#E2E8F0', background: '#FAFBFC' }}
      >
        <div className="p-2">
          <div className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px' }}>
            Releases
          </div>
          {/* All */}
          <button
            onClick={() => setActiveRelease(null)}
            className="w-full text-left rounded-md mb-0.5 transition-colors"
            style={{
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: !activeRelease ? 600 : 500,
              color: !activeRelease ? '#2563EB' : '#334155',
              background: !activeRelease ? '#EFF6FF' : 'transparent',
              border: !activeRelease ? '1px solid #BFDBFE' : '1px solid transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <div className="flex items-center justify-between">
              All
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                {issues.length}
              </span>
            </div>
          </button>

          {/* Per release */}
          {releases.map(rel => {
            const count = issues.filter(i => i.release_id === rel.id).length;
            const prog = getProgress(issues.filter(i => i.release_id === rel.id));
            const isActive = activeRelease === rel.id;
            return (
              <button
                key={rel.id}
                onClick={() => setActiveRelease(rel.id)}
                className="w-full text-left rounded-md mb-0.5 transition-colors"
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#334155',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>{rel.name}</span>
                  <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                    {count}
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ width: '100%', height: 3, background: '#E2E8F0' }}>
                  <div className="rounded-full" style={{ width: `${prog}%`, height: '100%', background: '#16A34A' }} />
                </div>
              </button>
            );
          })}

          {/* Unassigned */}
          <button
            onClick={() => setActiveRelease('__unassigned')}
            className="w-full text-left rounded-md mb-0.5 transition-colors"
            style={{
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: activeRelease === '__unassigned' ? 600 : 500,
              color: activeRelease === '__unassigned' ? '#2563EB' : '#334155',
              background: activeRelease === '__unassigned' ? '#EFF6FF' : 'transparent',
              border: activeRelease === '__unassigned' ? '1px solid #BFDBFE' : '1px solid transparent',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <div className="flex items-center justify-between">
              Unassigned
              <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                {issues.filter(i => !i.release_id).length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(groups).map(([groupId, groupIssues]) => {
          const isCollapsed = collapsedGroups.has(groupId);
          const progress = getProgress(groupIssues);
          return (
            <div
              key={groupId}
              className="mb-3 rounded-xl border"
              style={{ borderColor: '#E2E8F0', background: '#fff' }}
            >
              {/* Group Header */}
              <div
                className="flex items-center gap-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-xl"
                style={{ height: 40, borderBottom: isCollapsed ? 'none' : '1px solid #E2E8F0' }}
                onClick={() => toggleCollapse(groupId)}
              >
                {isCollapsed
                  ? <ChevronRight size={14} color="#64748B" />
                  : <ChevronDown size={14} color="#64748B" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
                  {getReleaseName(groupId)}
                </span>
                <span
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 20, height: 20,
                    fontSize: 10, fontWeight: 600,
                    background: '#F1F5F9', color: '#64748B',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {groupIssues.length}
                </span>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full overflow-hidden" style={{ width: 60, height: 4, background: '#E2E8F0' }}>
                    <div className="rounded-full" style={{ width: `${progress}%`, height: '100%', background: '#16A34A' }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>{progress}%</span>
                </div>
              </div>

              {/* Rows */}
              {!isCollapsed && (
                <div>
                  {groupIssues.map(issue => {
                    const accentColor = issue.priority === 'urgent' ? '#DC2626' : issue.priority === 'high' ? '#D97706' : issue.priority === 'medium' ? '#2563EB' : '#64748B';
                    const isHovered = hoveredId === issue.id;
                    return (
                      <div
                        key={issue.id}
                        className="flex items-center gap-2 px-3 cursor-pointer transition-colors group"
                        style={{
                          height: 44, maxHeight: 44,
                          borderBottom: '1px solid #F1F5F9',
                          borderLeft: `3px solid ${accentColor}`,
                          background: isHovered ? 'rgba(37,99,235,.03)' : undefined,
                          fontFamily: "'Inter', sans-serif",
                        }}
                        onClick={() => onSelectIssue(issue)}
                        onMouseEnter={() => setHoveredId(issue.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {/* Drag grip */}
                        <GripVertical
                          size={12}
                          color="#D1D5DB"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        />
                        <PHIssueTypeIcon type={issue.type} size={16} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>
                          {getDisplayKey(issue)}
                        </span>
                        <PHSourceTag source={issue.source} />
                        <span
                          className="truncate flex-1"
                          style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}
                        >
                          {issue.title}
                        </span>
                        <PHStatusLozenge status={issue.status} compact />
                        <span
                          className="rounded-full inline-flex items-center justify-center flex-shrink-0"
                          style={{ width: 22, height: 22, background: '#E2E8F0', fontSize: 9, fontWeight: 700, color: '#64748B' }}
                        >
                          {issue.assignee_id ? '👤' : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredIssues.length === 0 && (
          <div className="flex items-center justify-center" style={{ padding: 60, color: '#94A3B8', fontSize: 13 }}>
            No items in this release
          </div>
        )}
      </div>
    </div>
  );
}
