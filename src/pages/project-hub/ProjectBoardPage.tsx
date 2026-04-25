/**
 * ProjectHub Board Page — Orchestrator for Board/List/Backlog/Timeline views
 * Uses real data from ph_sdlc_issues, ph_sdlc_releases, ph_boards
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useParams } from 'react-router-dom';
import {
  Columns3, Kanban, GanttChart,
  AlertTriangle, CheckCircle2, Clock, BarChart3, Sparkles,
  Settings, Filter, Search, ChevronDown, X,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { ProjectView, IssueType, IssueStatus, IssuePriority, IssueSource } from '@/types/project-hub.types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types/project-hub.types';
import {
  useProjectIssues, useProjectIssue, useBoards, useSDLCReleases,
  useUpdateIssue, useUpdateBoard, getDisplayKey,
  type PHIssue, type IssueFilters,
} from '@/services/project-hub.service';
import { PHBoardView } from '@/components/project-hub/sdlc/PHBoardView';

import { PHBacklogView } from '@/components/project-hub/sdlc/PHBacklogView';
import { PHDetailDrawer } from '@/components/project-hub/sdlc/PHDetailDrawer';
import { PHConfigPanel } from '@/components/project-hub/sdlc/PHConfigPanel';

export default function ProjectBoardPage() {
  const { isDark } = useTheme();
  const { key } = useParams<{ key: string }>();
  const [activeView, setActiveView] = useState<ProjectView>('board');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<IssueType | ''>('');
  const [filterStatus, setFilterStatus] = useState<IssueStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<IssuePriority | ''>('');
  const [filterSource, setFilterSource] = useState<IssueSource | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [perPage] = useState(12); /* FP-001 */

  // Which filter dropdown is open (only one at a time)
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const filters: IssueFilters = useMemo(() => ({
    ...(filterType ? { type: filterType } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
    ...(filterSource ? { source: filterSource } : {}),
    ...(searchText ? { search: searchText } : {}),
  }), [filterType, filterStatus, filterPriority, filterSource, searchText]);

  const { data: issues = [], isLoading: issuesLoading } = useProjectIssues(Object.keys(filters).length > 0 ? filters : undefined);
  const { data: boards = [] } = useBoards();
  const { data: releases = [] } = useSDLCReleases();
  const { data: selectedIssueData } = useProjectIssue(selectedIssueId);
  const updateIssue = useUpdateIssue();
  const updateBoard = useUpdateBoard();

  const defaultBoard = useMemo(() => boards.find(b => b.is_default) ?? boards[0], [boards]);

  const clearFilters = useCallback(() => {
    setFilterType('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterSource('');
    setSearchText('');
  }, []);

  const stats = useMemo(() => {
    const completed = issues.filter(i => i.status === 'production' || i.status === 'prod_ready').length;
    const inProgress = issues.filter(i => ['in_dev', 'in_qa', 'in_uat', 'in_beta'].includes(i.status)).length;
    const overdue = issues.filter(i => (i.overdue_days ?? 0) > 0).length;
    return { total: issues.length, completed, inProgress, overdue };
  }, [issues]);

  const handleSelectIssue = useCallback((issue: PHIssue) => {
    setSelectedIssueId(issue.id);
  }, []);

  const handleUpdateIssue = useCallback((id: string, updates: Partial<PHIssue>) => {
    updateIssue.mutate({ id, ...updates } as any);
  }, [updateIssue]);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!openFilter) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) setOpenFilter(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openFilter]);

  const projectName = key?.toUpperCase() ?? 'AI GOVERNANCE';

  const statCards = [
    { label: 'Total Issues', value: stats.total, icon: BarChart3, color: '#2563EB', bg: '#EFF6FF', accent: '' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7', accent: '' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: '#2563EB', bg: '#EFF6FF', accent: '' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: stats.overdue > 0 ? '#EF4444' : '#94A3B8', bg: stats.overdue > 0 ? '#FEF2F2' : '#F1F5F9', accent: '' },
    { label: 'AI Features', value: '0%', icon: Sparkles, color: '#7C3AED', bg: '#F5F3FF', accent: '#7C3AED' },
  ];

  const views: { key: ProjectView; label: string; icon: typeof Columns3 }[] = [
    { key: 'backlog', label: 'Backlog', icon: Kanban },
    { key: 'board', label: 'Board', icon: Columns3 },
    { key: 'timeline', label: 'Timeline', icon: GanttChart },
  ];

  const hasActiveFilters = !!(filterType || filterStatus || filterPriority || filterSource);

  return (
    <div style={{ fontFamily: 'var(--ds-font-family-body)', padding: '20px 24px 16px' }}>
      {/* ─── PAGE HEADER ─── */}
      <CatalystPageHeader title={projectName} />

      {/* ─── STAT CARDS ─── */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)', margin: '16px 0 14px' }}
      >
        {statCards.map(s => (
          <div
            key={s.label}
            className="flex items-center gap-3"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 12, padding: '12px 16px',
              border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
              borderLeft: s.accent ? `3px solid ${s.accent}` : (isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0'),
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 36, height: 50, borderRadius: 8, background: s.bg }}
            >
              <s.icon size={18} color={s.color} strokeWidth={1.75} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A',
                  fontFamily: 'var(--ds-font-family-monospaced)', lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: isDark ? '#878787' : '#64748B', marginTop: 1 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── TOOLBAR ─── */}
      <div className="flex items-center gap-3 mb-3">
        {/* View Switcher */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-lg"
          style={{ background: isDark ? '#1A1A1A' : '#F1F5F9' }}
        >
          {views.map(v => {
            const isActive = activeView === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setActiveView(v.key)}
                className="flex items-center gap-1.5"
                style={{
                  padding: '6px 14px', fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'var(--ds-font-family-body)',
                  borderRadius: 6, cursor: 'pointer', border: 'none',
                  background: isActive ? (isDark ? '#1A1A1A' : '#FFFFFF') : 'transparent',
                  color: isActive ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'),
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                <v.icon size={14} strokeWidth={1.75} />
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} color="#94A3B8" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search issues…"
            className="rounded-md"
            style={{
              paddingLeft: 30, paddingRight: 10,
              height: 32, width: 200,
              fontSize: 12, fontWeight: 500,
              border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
              background: isDark ? '#1A1A1A' : '#fff', color: isDark ? '#EDEDED' : '#0F172A',
              fontFamily: 'var(--ds-font-family-body)',
            }}
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5"
          style={{
            padding: '6px 12px', height: 32,
            fontSize: 12, fontWeight: 500,
            borderRadius: 6, cursor: 'pointer',
            border: hasActiveFilters ? '1px solid #BFDBFE' : (isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0'),
            background: hasActiveFilters ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#fff'),
            color: hasActiveFilters ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'),
            fontFamily: 'var(--ds-font-family-body)',
            transition: 'all 150ms ease',
          }}
        >
          <Filter size={13} />
          Filters
          {hasActiveFilters && (
            <span
              className="rounded-full flex items-center justify-center"
              style={{ width: 16, height: 16, background: '#2563EB', color: '#fff', fontSize: 9, fontWeight: 700 }}
            >
              {[filterType, filterStatus, filterPriority, filterSource].filter(Boolean).length}
            </span>
          )}
        </button>

        <div className="flex-1" />

        {/* Config button */}
        {activeView === 'board' && (
          <button
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              padding: '6px 12px', height: 32,
              fontSize: 12, fontWeight: 500,
              borderRadius: 6, cursor: 'pointer',
              border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
              background: isDark ? '#1A1A1A' : '#fff', color: isDark ? '#A1A1A1' : '#64748B',
              fontFamily: 'var(--ds-font-family-body)',
            }}
          >
            <Settings size={13} />
            Config
          </button>
        )}
      </div>

      {/* Filter Dropdowns — custom popovers, NO native <select> */}
      {showFilters && (
        <div
          className="flex items-center gap-3 mb-3 p-3 rounded-lg"
          style={{ background: isDark ? '#1A1A1A' : '#F8FAFC', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}
        >
          <FilterDropdown
            label="Type"
            value={filterType}
            options={[
              { value: '', label: 'All Types' },
              ...(['epic', 'feature', 'story', 'task', 'bug', 'subtask'] as const).map(t => ({
                value: t, label: t.charAt(0).toUpperCase() + t.slice(1),
              })),
            ]}
            isOpen={openFilter === 'type'}
            onToggle={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
            onChange={v => { setFilterType(v as IssueType | ''); setOpenFilter(null); }}
          />
          <FilterDropdown
            label="Status"
            value={filterStatus}
            options={[
              { value: '', label: 'All Statuses' },
              ...(['backlog', 'ready', 'in_dev', 'in_qa', 'in_uat', 'in_beta', 'prod_ready', 'production', 'on_hold'] as const).map(s => ({
                value: s, label: STATUS_CONFIG[s].label,
              })),
            ]}
            isOpen={openFilter === 'status'}
            onToggle={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
            onChange={v => { setFilterStatus(v as IssueStatus | ''); setOpenFilter(null); }}
          />
          <FilterDropdown
            label="Priority"
            value={filterPriority}
            options={[
              { value: '', label: 'All Priorities' },
              ...(['urgent', 'high', 'medium', 'low'] as const).map(p => ({
                value: p, label: PRIORITY_CONFIG[p].label,
              })),
            ]}
            isOpen={openFilter === 'priority'}
            onToggle={() => setOpenFilter(openFilter === 'priority' ? null : 'priority')}
            onChange={v => { setFilterPriority(v as IssuePriority | ''); setOpenFilter(null); }}
          />
          <FilterDropdown
            label="Source"
            value={filterSource}
            options={[
              { value: '', label: 'All Sources' },
              { value: 'jira', label: 'Jira' },
              { value: 'catalyst', label: 'Catalyst' },
            ]}
            isOpen={openFilter === 'source'}
            onToggle={() => setOpenFilter(openFilter === 'source' ? null : 'source')}
            onChange={v => { setFilterSource(v as IssueSource | ''); setOpenFilter(null); }}
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="self-end transition-colors"
              style={{
                fontSize: 11, fontWeight: 500, color: '#EF4444',
                background: 'transparent', border: 'none', cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ─── VIEW CONTENT ─── */}
      {activeView === 'board' && (
        <PHBoardView
          issues={issues}
          boards={boards}
          loading={issuesLoading}
          onSelectIssue={handleSelectIssue}
          onUpdateIssue={handleUpdateIssue}
        />
      )}

      {activeView === 'backlog' && (
        <PHBacklogView
          issues={issues}
          releases={releases}
          loading={issuesLoading}
          onSelectIssue={handleSelectIssue}
        />
      )}

      {activeView === 'timeline' && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border"
          style={{ padding: '80px 40px', background: isDark ? '#1A1A1A' : '#FFFFFF', borderColor: isDark ? '#2E2E2E' : '#E2E8F0' }}
        >
          <GanttChart size={36} color="#94A3B8" strokeWidth={1.5} />
          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginTop: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Timeline View
          </span>
          <span style={{ fontSize: 13, color: isDark ? '#878787' : '#64748B', marginTop: 4 }}>
            Coming in Phase 2
          </span>
        </div>
      )}

      {/* ─── DETAIL DRAWER ─── */}
      <PHDetailDrawer
        issue={selectedIssueData as PHIssue | null}
        children={(selectedIssueData?.children ?? []) as any}
        releases={releases}
        open={!!selectedIssueId && !!selectedIssueData}
        onClose={() => setSelectedIssueId(null)}
        onSelectIssue={handleSelectIssue}
        onUpdateIssue={handleUpdateIssue}
      />

      {/* ─── CONFIG PANEL ─── */}
      <PHConfigPanel
        board={defaultBoard ?? null}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={updates => {
          if (defaultBoard) {
            updateBoard.mutate({ id: defaultBoard.id, ...updates } as any);
          }
        }}
      />
    </div>
  );
}

/* ── Custom Filter Dropdown (replaces banned native <select>) ── */
function FilterDropdown({ label, value, options, isOpen, onToggle, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  const selectedLabel = options.find(o => o.value === value)?.label ?? options[0]?.label ?? '';

  return (
    <div className="flex flex-col gap-1 relative" data-filter-dropdown>
      <label style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <button
        onClick={onToggle}
        className="flex items-center justify-between gap-2 rounded-md transition-colors"
        style={{
          fontSize: 12, fontWeight: 500, padding: '4px 8px',
          border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A',
          cursor: 'pointer', minWidth: 130, textAlign: 'left' as const,
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={12} color="#94A3B8" />
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg shadow-lg border z-50"
          style={{ background: '#fff', borderColor: '#E2E8F0', minWidth: 160, padding: 4 }}
        >
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className="w-full text-left px-3 py-1.5 rounded transition-colors"
              style={{
                fontSize: 12, fontWeight: value === o.value ? 600 : 400,
                color: '#334155',
                background: value === o.value ? '#F1F5F9' : 'transparent',
                border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
              {value === o.value && <span style={{ float: 'right', color: '#2563EB', fontSize: 11 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
