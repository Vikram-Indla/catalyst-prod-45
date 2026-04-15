import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronDown } from 'lucide-react';

const StoryDetailModal = lazy(
  () => import('@/modules/project-work-hub/components/dialogs/StoryDetailModal')
);

/* ═══════════════════════════════════════════════
   WORK ITEM TYPE SVG ICONS — CANONICAL, NO LUCIDE
   ═══════════════════════════════════════════════ */

function StoryIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1" fill="#36B37E" />
      <path d="M5 4h6M5 7h6M5 10h4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#2684FF" />
      <path d="M4.5 8.5L7 11l4.5-5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BugIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#FF5630" />
      <circle cx="8" cy="8" r="3" fill="#fff" />
    </svg>
  );
}

function EpicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2" />
      <path d="M9 3L6 8.5h4L7 13" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SubtaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="#4BADE8" />
      <path d="M5.5 8.5L7 10l3.5-4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImprovementIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8" />
      <path d="M8 12V5M5 7.5L8 4.5l3 3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewFeatureIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#36B37E" />
      <path d="M8 4v8M4 8h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Story: StoryIcon,
  Task: TaskIcon,
  Bug: BugIcon,
  Epic: EpicIcon,
  Subtask: SubtaskIcon,
  Improvement: ImprovementIcon,
  'New Feature': NewFeatureIcon,
};

function WorkItemTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const Icon = TYPE_ICON_MAP[type] ?? TaskIcon;
  return <Icon size={size} />;
}

/* ═══════════════════════════════════════════════
   PRIORITY ICONS
   ═══════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#FF5630',
  High: '#FF7452',
  Medium: '#FFAB00',
  Low: '#4BADE8',
  Lowest: '#8590A2',
};

function PriorityIcon({ priority, size = 14 }: { priority: string; size?: number }) {
  const color = PRIORITY_COLORS[priority] ?? '#8590A2';
  if (priority === 'Medium') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <rect x="3" y="7" width="10" height="2" rx="1" fill={color} />
      </svg>
    );
  }
  const isUp = priority === 'Highest' || priority === 'High';
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d={isUp ? 'M8 13V3M4 7l4-4 4 4' : 'M8 3v10M4 9l4 4 4-4'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   ASSIGNEE AVATAR
   ═══════════════════════════════════════════════ */

function AssigneeAvatar({ name, size = 24 }: { name?: string | null; size?: number }) {
  if (!name) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: '#DFE1E6' }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="6" r="3" fill="#97A0AF" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#97A0AF" />
        </svg>
      </span>
    );
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#FF5630', '#6554C0', '#36B37E', '#0052CC', '#FF8B00', '#00B8D9'];
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
   TYPES
   ═══════════════════════════════════════════════ */

interface KanbanIssue {
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
   COLUMN CONFIG — matches Jira reference
   ═══════════════════════════════════════════════ */

const KANBAN_COLUMNS: KanbanColumn[] = [
  { name: 'IN REQUIREMENTS', statuses: ['In Requirements', 'In Design', 'Awaiting Info'] },
  { name: 'READY FOR DEVELOPMENT', statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'] },
  { name: 'IN DEVELOPMENT', statuses: ['In Development', 'In Progress', 'Under Implementation'] },
  { name: 'IN TESTING', statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA'] },
  { name: 'IN UAT', statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration'] },
  { name: 'DONE', statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked'] },
];

const COLUMN_WIDTH = 240;

/* ═══════════════════════════════════════════════
   ISSUE CARD — matches Jira reference
   ═══════════════════════════════════════════════ */

function IssueCard({ issue, onCardClick }: { issue: KanbanIssue; onCardClick: (id: string) => void }) {
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(issue.id);
        }
      }}
    >
      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-[3px] mb-[5px]">
          {issue.labels.map((label) => (
            <span
              key={label}
              className="uppercase"
              style={{ height: 16, padding: '0 6px', borderRadius: 2, fontSize: 10, fontWeight: 700, background: '#DFE1E6', color: '#42526E', lineHeight: '16px', display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Sprint name */}
      {issue.sprintName && (
        <div className="mb-[4px]">
          <span
            className="uppercase"
            style={{ height: 16, padding: '0 6px', borderRadius: 2, fontSize: 10, fontWeight: 700, background: '#E9F2FF', color: '#0052CC', lineHeight: '16px', display: 'inline-block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {issue.sprintName}
          </span>
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
        <WorkItemTypeIcon type={issue.issueType} size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#42526E' }}>{issue.issueKey}</span>
        <PriorityIcon priority={issue.priority} size={14} />
        <span className="flex-1" />
        <AssigneeAvatar name={issue.assigneeName} size={24} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COLUMN
   ═══════════════════════════════════════════════ */

function Column({ column, issues, onCardClick }: { column: KanbanColumn; issues: KanbanIssue[]; onCardClick: (id: string) => void }) {
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-1.5 px-2 sticky top-0 z-10"
        style={{
          height: 40,
          background: '#F4F5F7',
        }}
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
      <div className="flex flex-col gap-[6px] px-[5px] py-[6px]" style={{ minHeight: 80 }}>
        {issues.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: 200 }} />
        ) : (
          issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onCardClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SEARCH BAR — matching Jira reference (top right)
   ═══════════════════════════════════════════════ */

function BoardSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search size={14} color="#626F86" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        placeholder="Search board"
        className="pl-7 pr-2 py-1 border rounded text-sm outline-none"
        style={{ width: 200, height: 32, borderColor: '#DFE1E6', fontSize: 13, color: '#172B4D', background: '#FAFBFC' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
        <div key={col.name} className="flex flex-col" style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}>
          <div className="h-10 bg-[#F4F5F7]" />
          <div className="flex flex-col gap-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] bg-[#EBECF0] rounded-[3px] animate-pulse" />
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
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  // Fetch issues for this project
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
      return (data ?? []).map((r): KanbanIssue => ({
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

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  // Filter + bucket into columns
  const columnData = useMemo(() => {
    let issues = rawIssues;

    // Apply search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      issues = issues.filter(
        (i) =>
          i.summary.toLowerCase().includes(q) ||
          i.issueKey.toLowerCase().includes(q) ||
          (i.assigneeName ?? '').toLowerCase().includes(q)
      );
    }

    // Build status→column lookup
    const statusToCol = new Map<string, number>();
    KANBAN_COLUMNS.forEach((col, idx) => {
      col.statuses.forEach((s) => statusToCol.set(s.toLowerCase(), idx));
    });

    // Bucket issues
    const buckets: KanbanIssue[][] = KANBAN_COLUMNS.map(() => []);
    issues.forEach((issue) => {
      const colIdx = statusToCol.get(issue.status.toLowerCase());
      if (colIdx !== undefined) {
        buckets[colIdx].push(issue);
      }
      // Skip issues with unmapped statuses
    });

    return buckets;
  }, [rawIssues, debouncedSearch]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#F4F5F7' }}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#F4F5F7' }}>
      {/* Toolbar — minimal, matching reference: just search + "See older work items" links handled in columns */}
      <div className="flex items-center gap-3 px-3 py-2" style={{ background: '#FFFFFF', borderBottom: '1px solid #DFE1E6' }}>
        <BoardSearch value={search} onChange={setSearch} />
      </div>

      {/* Board columns */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="flex" style={{ minWidth: KANBAN_COLUMNS.length * COLUMN_WIDTH }}>
          {KANBAN_COLUMNS.map((col, i) => (
            <Column
              key={col.name}
              column={col}
              issues={columnData[i]}
              onCardClick={(id) => setSelectedIssueId(id)}
            />
          ))}
        </div>
      </div>

      {/* StoryDetailModal */}
      {selectedIssueId && (
        <Suspense fallback={null}>
          <StoryDetailModal
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
