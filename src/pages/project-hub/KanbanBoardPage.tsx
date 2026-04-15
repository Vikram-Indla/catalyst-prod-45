/**
 * KanbanBoardPage — Jira-style Kanban board for ProjectHub
 * Data: ph_issues (local DB), structure: Jira board layout
 * Header: matches StoryBacklogPage pattern
 */
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Layers, Filter, ChevronDown, Check, X, User } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface BoardIssue {
  id: string;
  issueKey: string;
  summary: string;
  issueType: string;
  priority: string;
  status: string;
  assigneeName: string | null;
  labels: string[];
  sprintName: string | null;
  storyPoints: number | null;
  parentKey: string | null;
}

interface KanbanColumn {
  name: string;
  statuses: string[];
}

/* ═══════════════════════════════════════════════
   COLUMN CONFIG — derived from Jira board statuses
   ═══════════════════════════════════════════════ */

const KANBAN_COLUMNS: KanbanColumn[] = [
  { name: 'IN REQUIREMENTS', statuses: ['In Requirements', 'In Design', 'Awaiting Info'] },
  { name: 'READY FOR DEVELOPMENT', statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'] },
  { name: 'IN DEVELOPMENT', statuses: ['In Development', 'In Progress', 'Under Implementation'] },
  { name: 'IN TESTING', statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA'] },
  { name: 'IN UAT', statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration'] },
  { name: 'DONE', statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked'] },
];

/* ═══════════════════════════════════════════════
   ASSIGNEE AVATAR
   ═══════════════════════════════════════════════ */

function AssigneeAvatar({ name, avatarUrl, size = 24 }: { name?: string | null; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || ''}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size, border: '1px solid #E2E8F0' }}
      />
    );
  }
  if (!name) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: '#DFE1E6' }}
      >
        <User size={size * 0.55} color="#97A0AF" />
      </span>
    );
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777', '#FF8B00'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42, fontWeight: 700, color: '#fff' }}
      title={name}
    >
      {initials}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   ISSUE CARD
   ═══════════════════════════════════════════════ */

function IssueCard({ issue, avatarUrl, onCardClick }: { issue: BoardIssue; avatarUrl?: string | null; onCardClick: (id: string) => void }) {
  return (
    <div
      className="cursor-pointer select-none transition-shadow duration-150"
      style={{
        background: '#FFFFFF',
        borderRadius: 3,
        padding: 8,
        boxShadow: '0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#FAFBFC';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 8px rgba(9,30,66,.2), 0 0 1px rgba(9,30,66,.31)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)';
      }}
      onClick={() => onCardClick(issue.id)}
      tabIndex={0}
      role="button"
      aria-label={`Open ${issue.issueKey}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(issue.id); } }}
    >
      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-[3px] mb-[5px]">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="uppercase"
              style={{ height: 16, padding: '0 6px', borderRadius: 2, fontSize: 10, fontWeight: 700, background: '#DFE1E6', color: '#42526E', lineHeight: '16px', display: 'inline-block', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      <p
        className="mb-[6px]"
        style={{ fontSize: 13, lineHeight: 1.43, color: '#172B4D', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {issue.summary}
      </p>

      {/* Footer row */}
      <div className="flex items-center gap-[5px]">
        <JiraIssueTypeIcon type={issue.issueType} size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#42526E', fontFamily: "'JetBrains Mono', monospace" }}>{issue.issueKey}</span>
        <PriorityBars priority={normalisePriority(issue.priority)} />
        {issue.storyPoints != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#5E6C84', background: '#EBECF0', borderRadius: 10, padding: '0 6px', lineHeight: '18px', marginLeft: 2 }}>
            {issue.storyPoints}
          </span>
        )}
        <span className="flex-1" />
        <AssigneeAvatar name={issue.assigneeName} avatarUrl={avatarUrl} size={24} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COLUMN
   ═══════════════════════════════════════════════ */

function Column({ column, issues, avatarsByName, onCardClick }: { column: KanbanColumn; issues: BoardIssue[]; avatarsByName: Map<string, string>; onCardClick: (id: string) => void }) {
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 240, minWidth: 240 }}>
      {/* Column header */}
      <div
        className="flex items-center gap-1.5 px-2 sticky top-0 z-10"
        style={{ height: 40, background: '#F4F5F7' }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.04em' }}>
          {column.name}
        </span>
        <span
          style={{ fontSize: 11, fontWeight: 600, color: '#5E6C84', background: 'rgba(9,30,66,.06)', borderRadius: 10, padding: '0 6px', lineHeight: '18px', minWidth: 18, textAlign: 'center' }}
        >
          {issues.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-[6px] px-[5px] py-[6px] overflow-y-auto" style={{ minHeight: 80, maxHeight: 'calc(100vh - 200px)' }}>
        {issues.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: 100, color: '#94A3B8', fontSize: 12 }}>
            No issues
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null}
              onCardClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ASSIGNEE FILTER POPOVER
   ═══════════════════════════════════════════════ */

function AssigneeFilterPopover({
  allAssignees,
  selected,
  onChange,
  avatarsByName,
}: {
  allAssignees: { name: string; count: number }[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  avatarsByName: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = allAssignees.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = selected.size > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger — show avatar stack when selected, else show button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-1"
        style={{
          height: 32, padding: '0 10px', borderRadius: 6,
          border: isActive ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: isActive ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
          color: isActive ? '#2563EB' : '#0F172A',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 150ms',
        }}
      >
        <User size={14} />
        Assignee
        {isActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#2563EB', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
          }}>{selected.size}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          width: 280, background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assignees"
                autoFocus
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: 8,
                  border: '1.5px solid #E2E8F0', borderRadius: 6,
                  fontSize: 13, color: '#0F172A', background: '#FFFFFF',
                  outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>
          <div style={{ padding: '4px 0', maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(a => {
              const isSelected = selected.has(a.name);
              const url = avatarsByName.get(a.name.toLowerCase());
              return (
                <button
                  key={a.name}
                  onClick={() => {
                    const next = new Set(selected);
                    if (isSelected) next.delete(a.name); else next.add(a.name);
                    onChange(next);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '6px 12px', border: 'none',
                    background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                    cursor: 'pointer', fontSize: 13, color: '#0F172A',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Check size={14} color="#2563EB" />}
                  </div>
                  <AssigneeAvatar name={a.name} avatarUrl={url} size={22} />
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{a.count}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No assignees found</div>
            )}
          </div>
          {isActive && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => onChange(new Set())}
                style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GROUP BY POPOVER
   ═══════════════════════════════════════════════ */

type GroupByKey = 'none' | 'status' | 'assignee' | 'priority' | 'type';
const GROUP_OPTIONS: { key: GroupByKey; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'priority', label: 'Priority' },
  { key: 'type', label: 'Issue Type' },
];

function GroupByPopover({ value, onChange }: { value: GroupByKey; onChange: (v: GroupByKey) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = GROUP_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = value !== 'none';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px', borderRadius: 6,
          border: isActive ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: isActive ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
          color: isActive ? '#2563EB' : '#0F172A',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 150ms',
        }}
      >
        <Layers size={14} />
        Group
        {isActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#2563EB', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
          }}>1</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          width: 280, background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search grouping options"
                autoFocus
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: 8,
                  border: '1.5px solid #E2E8F0', borderRadius: 6,
                  fontSize: 13, color: '#0F172A', background: '#FFFFFF',
                  outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>
          <div style={{ padding: '4px 0', maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ padding: '4px 12px 2px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              All fields
            </div>
            {filtered.map(opt => {
              const isSelected = value === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => { onChange(isSelected ? 'none' : opt.key); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '7px 12px', border: 'none',
                    background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                    cursor: 'pointer', fontSize: 13, color: isSelected ? '#2563EB' : '#0F172A',
                    fontWeight: isSelected ? 600 : 400,
                    fontFamily: "'Inter', sans-serif",
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
                >
                  <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Check size={14} color="#2563EB" />}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════ */

function BoardSkeleton() {
  return (
    <div className="flex gap-0 flex-1 min-h-0">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.name} className="flex flex-col" style={{ width: 240, minWidth: 240 }}>
          <div className="h-10" style={{ background: '#F4F5F7' }} />
          <div className="flex flex-col gap-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-[3px] animate-pulse" style={{ background: '#EBECF0' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function KanbanBoardPage() {
  const { key } = useParams<{ key: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;
  const avatarsByName = useProfileAvatarsByName();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByKey>('none');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string[]>>({});
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Resolve projectId from key
  const { data: projectMeta } = useQuery({
    queryKey: ['ph-project-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      return data;
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  // Fetch issues
  const { data: rawIssues = [], isLoading } = useQuery({
    queryKey: ['kanban-issues', key],
    queryFn: async () => {
      if (!key) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key')
        .eq('project_key', key.toUpperCase())
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r): BoardIssue => ({
        id: r.id,
        issueKey: r.issue_key,
        summary: r.summary ?? '',
        issueType: r.issue_type ?? 'Task',
        priority: r.priority ?? 'Medium',
        status: r.status ?? 'Backlog',
        assigneeName: r.assignee_display_name,
        labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
        sprintName: r.sprint_name,
        storyPoints: r.story_points ? Number(r.story_points) : null,
        parentKey: r.parent_key,
      }));
    },
    enabled: !!key,
    staleTime: 30_000,
  });

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  // Build unique assignee list
  const allAssignees = useMemo(() => {
    const map = new Map<string, number>();
    rawIssues.forEach(i => {
      const name = i.assigneeName || 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawIssues]);

  // Build filter categories
  const filterCategories = useMemo((): FilterCategory[] => {
    const types = new Map<string, number>();
    const priorities = new Map<string, number>();
    const statuses = new Map<string, number>();
    rawIssues.forEach(i => {
      types.set(i.issueType, (types.get(i.issueType) ?? 0) + 1);
      priorities.set(i.priority, (priorities.get(i.priority) ?? 0) + 1);
      statuses.set(i.status, (statuses.get(i.status) ?? 0) + 1);
    });
    return [
      { key: 'type', label: 'Type', options: Array.from(types.entries()).map(([v, c]) => ({ value: v, label: v, count: c })) },
      { key: 'priority', label: 'Priority', options: Array.from(priorities.entries()).map(([v, c]) => ({ value: v, label: v, count: c })) },
      { key: 'status', label: 'Status', options: Array.from(statuses.entries()).map(([v, c]) => ({ value: v, label: v, count: c })) },
    ];
  }, [rawIssues]);

  const advancedFilterCount = Object.values(advancedFilters).reduce((acc, v) => acc + v.length, 0);

  // Filter + bucket into columns
  const columnData = useMemo(() => {
    let issues = rawIssues;

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      issues = issues.filter(
        (i) =>
          i.summary.toLowerCase().includes(q) ||
          i.issueKey.toLowerCase().includes(q) ||
          (i.assigneeName ?? '').toLowerCase().includes(q)
      );
    }

    // Assignee filter
    if (selectedAssignees.size > 0) {
      issues = issues.filter(i => {
        const name = i.assigneeName || 'Unassigned';
        return selectedAssignees.has(name);
      });
    }

    // Advanced filters
    if (advancedFilters.type?.length) {
      issues = issues.filter(i => advancedFilters.type.includes(i.issueType));
    }
    if (advancedFilters.priority?.length) {
      issues = issues.filter(i => advancedFilters.priority.includes(i.priority));
    }
    if (advancedFilters.status?.length) {
      issues = issues.filter(i => advancedFilters.status.includes(i.status));
    }

    // Build status→column lookup
    const statusToCol = new Map<string, number>();
    KANBAN_COLUMNS.forEach((col, idx) => {
      col.statuses.forEach((s) => statusToCol.set(s.toLowerCase(), idx));
    });

    // Bucket issues
    const buckets: BoardIssue[][] = KANBAN_COLUMNS.map(() => []);
    issues.forEach((issue) => {
      const colIdx = statusToCol.get(issue.status.toLowerCase());
      if (colIdx !== undefined) {
        buckets[colIdx].push(issue);
      }
    });

    return buckets;
  }, [rawIssues, debouncedSearch, selectedAssignees, advancedFilters]);

  const totalVisible = columnData.reduce((acc, col) => acc + col.length, 0);

  const handleFilterChange = useCallback((cat: string, values: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, [cat]: values }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setAdvancedFilters({});
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#F4F5F7' }}>
        {/* Header skeleton */}
        <div className="px-6 pt-5 pb-3 border-b" style={{ borderColor: '#E2E8F0', background: '#FFFFFF' }}>
          <div className="h-7 w-32 rounded animate-pulse" style={{ background: '#EBECF0' }} />
          <div className="h-4 w-64 rounded animate-pulse mt-1.5" style={{ background: '#EBECF0' }} />
        </div>
        <div className="h-12" style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }} />
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#F4F5F7' }}>
      {/* ── Header — matches StoryBacklog pattern ── */}
      <div className="px-6 pt-5 pb-3 border-b" style={{ borderColor: tk.border, background: tk.pageBg }}>
        <h1 className="text-xl font-semibold" style={{ color: tk.t1, fontFamily: "'Sora', sans-serif", fontWeight: 650 }}>Board</h1>
        <p className="text-sm mt-0.5" style={{ color: tk.t2 }}>Visualize and track work items across workflow stages</p>
      </div>

      {/* ── Toolbar: Search | Assignee | Filter | Group | Count ── */}
      <div className="flex items-center gap-3 px-6 py-2.5" style={{ background: tk.pageBg, borderBottom: `1px solid ${tk.border}` }}>
        {/* Search */}
        <div className="relative" style={{ width: 220 }}>
          <Search size={14} color="#94A3B8" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search board"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1 border rounded text-sm outline-none"
            style={{
              height: 32, borderColor: '#E2E8F0', fontSize: 13, color: '#172B4D', background: '#FAFBFC',
              borderRadius: 6, fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Assignee filter */}
        <AssigneeFilterPopover
          allAssignees={allAssignees}
          selected={selectedAssignees}
          onChange={setSelectedAssignees}
          avatarsByName={avatarsByName}
        />

        {/* Filter */}
        <div style={{ position: 'relative', zIndex: 50 }}>
          <FilterTriggerButton
            count={advancedFilterCount}
            onClick={() => setFilterPanelOpen(p => !p)}
            isOpen={filterPanelOpen}
          />
          {filterPanelOpen && (
            <JiraBasicFilter
              categories={filterCategories}
              selected={advancedFilters}
              onSelectionChange={handleFilterChange}
              onClearAll={handleClearAllFilters}
              onClose={() => setFilterPanelOpen(false)}
            />
          )}
        </div>

        {/* Group By */}
        <GroupByPopover value={groupBy} onChange={setGroupBy} />

        <div className="flex-1" />

        {/* Total count */}
        <span style={{ fontSize: 13, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
          {totalVisible} issues
        </span>
      </div>

      {/* ── Board columns ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="flex" style={{ minWidth: KANBAN_COLUMNS.length * 240 }}>
          {KANBAN_COLUMNS.map((col, i) => (
            <Column
              key={col.name}
              column={col}
              issues={columnData[i]}
              avatarsByName={avatarsByName}
              onCardClick={(id) => setSelectedIssueId(id)}
            />
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selectedIssueId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={!!selectedIssueId}
            onClose={() => setSelectedIssueId(null)}
            itemId={selectedIssueId}
            projectId={projectMeta?.id ?? ''}
            projectKey={key}
          />
        </Suspense>
      )}
    </div>
  );
}
