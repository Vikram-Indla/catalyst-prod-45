/**
 * ProjectHub Board Page — Orchestrator for Board/List/Backlog/Timeline views
 * Uses real data from ph_sdlc_issues, ph_sdlc_releases, ph_boards
 */
import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Columns3, List, Kanban, GanttChart,
  AlertTriangle, CheckCircle2, Clock, BarChart3, Sparkles,
  Settings, Filter, Search, SortAsc,
} from 'lucide-react';
import type { ProjectView, IssueType, IssueStatus, IssuePriority, IssueSource } from '@/types/project-hub.types';
import {
  useProjectIssues, useProjectIssue, useBoards, useSDLCReleases,
  useUpdateIssue, useUpdateBoard, getDisplayKey,
  type PHIssue, type IssueFilters,
} from '@/services/project-hub.service';
import { PHBoardView } from '@/components/project-hub/sdlc/PHBoardView';
import { PHListView } from '@/components/project-hub/sdlc/PHListView';
import { PHBacklogView } from '@/components/project-hub/sdlc/PHBacklogView';
import { PHDetailDrawer } from '@/components/project-hub/sdlc/PHDetailDrawer';
import { PHConfigPanel } from '@/components/project-hub/sdlc/PHConfigPanel';

export default function ProjectBoardPage() {
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

  const filters: IssueFilters = useMemo(() => ({
    ...(filterType ? { type: filterType } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
    ...(filterSource ? { source: filterSource } : {}),
    ...(searchText ? { search: searchText } : {}),
  }), [filterType, filterStatus, filterPriority, filterSource, searchText]);

  const { data: issues = [] } = useProjectIssues(Object.keys(filters).length > 0 ? filters : undefined);
  const { data: boards = [] } = useBoards();
  const { data: releases = [] } = useSDLCReleases();
  const { data: selectedIssueData } = useProjectIssue(selectedIssueId);
  const updateIssue = useUpdateIssue();
  const updateBoard = useUpdateBoard();

  const defaultBoard = useMemo(() => boards.find(b => b.is_default) ?? boards[0], [boards]);

  const stats = useMemo(() => {
    const completed = issues.filter(i => i.status === 'production' || i.status === 'prod_ready').length;
    const inProgress = issues.filter(i => ['in_dev', 'in_qa', 'in_uat', 'in_beta'].includes(i.status)).length;
    const overdue = issues.filter(i => i.overdue_days > 0).length;
    return { total: issues.length, completed, inProgress, overdue };
  }, [issues]);

  const handleSelectIssue = useCallback((issue: PHIssue) => {
    setSelectedIssueId(issue.id);
  }, []);

  const handleUpdateIssue = useCallback((id: string, updates: Partial<PHIssue>) => {
    updateIssue.mutate({ id, ...updates } as any);
  }, [updateIssue]);

  const projectName = key?.toUpperCase() ?? 'AI GOVERNANCE';

  const statCards = [
    { label: 'Total Issues', value: stats.total, icon: BarChart3, color: '#2563EB', bg: '#EFF6FF', accent: '' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7', accent: '' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: '#2563EB', bg: '#EFF6FF', accent: '' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', accent: '' },
    { label: 'AI Features', value: '0%', icon: Sparkles, color: '#7C3AED', bg: '#F5F3FF', accent: '#7C3AED' },
  ];

  const views: { key: ProjectView; label: string; icon: typeof Columns3 }[] = [
    { key: 'backlog', label: 'Backlog', icon: Kanban },
    { key: 'board', label: 'Board', icon: Columns3 },
    { key: 'list', label: 'List', icon: List },
    { key: 'timeline', label: 'Timeline', icon: GanttChart },
  ];

  const hasActiveFilters = filterType || filterStatus || filterPriority || filterSource;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '20px 24px 16px' }}>
      {/* ─── PAGE HEADER ─── */}
      <div className="flex items-center gap-3 mb-1">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            color: '#fff', fontSize: 14, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {projectName.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1
              style={{
                fontSize: 24, fontWeight: 700, color: '#0F172A',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.4px', margin: 0,
              }}
            >
              {projectName}
            </h1>
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                background: '#DCFCE7', color: '#16A34A',
              }}
            >
              ON TRACK
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0', fontWeight: 500 }}>
            Sprint 14 · Mar 10 – Mar 24, 2026 · 8 days remaining
          </p>
        </div>
      </div>

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
              background: '#FFFFFF', borderRadius: 12, padding: '12px 16px',
              border: '1px solid #E2E8F0',
              borderLeft: s.accent ? `3px solid ${s.accent}` : '1px solid #E2E8F0',
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 36, height: 36, borderRadius: 8, background: s.bg }}
            >
              <s.icon size={18} color={s.color} strokeWidth={1.75} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 22, fontWeight: 700, color: '#0F172A',
                  fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginTop: 1 }}>
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
          style={{ background: '#F1F5F9' }}
        >
          {views.map(v => {
            const isActive = activeView === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setActiveView(v.key)}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  padding: '6px 14px', fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "'Inter', sans-serif",
                  borderRadius: 6, cursor: 'pointer', border: 'none',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#2563EB' : '#64748B',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
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
              border: '1px solid #E2E8F0',
              background: '#fff', color: '#0F172A',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 transition"
          style={{
            padding: '6px 12px', height: 32,
            fontSize: 12, fontWeight: 500,
            borderRadius: 6, cursor: 'pointer',
            border: hasActiveFilters ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
            background: hasActiveFilters ? '#EFF6FF' : '#fff',
            color: hasActiveFilters ? '#2563EB' : '#64748B',
            fontFamily: "'Inter', sans-serif",
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
            className="flex items-center gap-1.5 transition"
            style={{
              padding: '6px 12px', height: 32,
              fontSize: 12, fontWeight: 500,
              borderRadius: 6, cursor: 'pointer',
              border: '1px solid #E2E8F0',
              background: '#fff', color: '#64748B',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Settings size={13} />
            Config
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div
          className="flex items-center gap-3 mb-3 p-3 rounded-lg"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
        >
          {[
            {
              label: 'Type',
              value: filterType,
              onChange: (v: string) => setFilterType(v as IssueType | ''),
              options: [
                { value: '', label: 'All Types' },
                ...(['epic', 'feature', 'story', 'task', 'bug', 'subtask'] as const).map(t => ({
                  value: t, label: t.charAt(0).toUpperCase() + t.slice(1),
                })),
              ],
            },
            {
              label: 'Status',
              value: filterStatus,
              onChange: (v: string) => setFilterStatus(v as IssueStatus | ''),
              options: [
                { value: '', label: 'All Statuses' },
                ...(['backlog', 'ready', 'in_dev', 'in_qa', 'in_uat', 'in_beta', 'prod_ready', 'production', 'on_hold'] as const).map(s => ({
                  value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                })),
              ],
            },
            {
              label: 'Priority',
              value: filterPriority,
              onChange: (v: string) => setFilterPriority(v as IssuePriority | ''),
              options: [
                { value: '', label: 'All Priorities' },
                ...(['urgent', 'high', 'medium', 'low'] as const).map(p => ({
                  value: p, label: p.charAt(0).toUpperCase() + p.slice(1),
                })),
              ],
            },
            {
              label: 'Source',
              value: filterSource,
              onChange: (v: string) => setFilterSource(v as IssueSource | ''),
              options: [
                { value: '', label: 'All Sources' },
                { value: 'jira', label: 'Jira' },
                { value: 'catalyst', label: 'Catalyst' },
              ],
            },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1">
              <label style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                {f.label}
              </label>
              <select
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className="rounded-md"
                style={{
                  fontSize: 12, fontWeight: 500, padding: '4px 8px',
                  border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A',
                  cursor: 'pointer', minWidth: 130,
                }}
              >
                {f.options.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}

          {hasActiveFilters && (
            <button
              onClick={() => { setFilterType(''); setFilterStatus(''); setFilterPriority(''); setFilterSource(''); }}
              className="self-end transition"
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
          onSelectIssue={handleSelectIssue}
          onUpdateIssue={handleUpdateIssue}
        />
      )}

      {activeView === 'list' && (
        <PHListView
          issues={issues}
          releases={releases}
          onSelectIssue={handleSelectIssue}
          onUpdateIssue={handleUpdateIssue}
        />
      )}

      {activeView === 'backlog' && (
        <PHBacklogView
          issues={issues}
          releases={releases}
          onSelectIssue={handleSelectIssue}
        />
      )}

      {activeView === 'timeline' && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border"
          style={{ padding: '80px 40px', background: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <GanttChart size={36} color="#94A3B8" strokeWidth={1.5} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginTop: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Timeline View
          </span>
          <span style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
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
