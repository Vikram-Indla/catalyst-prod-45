import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBoardConfig } from '@/modules/project-hub/hooks/useBoardConfig';
import { useBoardIssues } from '@/modules/project-hub/hooks/useBoardIssues';
import { useBoardPrefs } from '@/modules/project-hub/hooks/useBoardPrefs';
import { useBoardSearch } from '@/modules/project-hub/hooks/useBoardSearch';
import { useDragDrop } from '@/modules/project-hub/hooks/useDragDrop';
import { boardApi } from '@/modules/project-hub/api/boardApi';
import {
  DEFAULT_BOARD_FILTERS,
  BOARD_COLUMN_WIDTH,
  SEARCH_DEBOUNCE_MS,
} from '@/modules/project-hub/constants/kanban';
import type {
  BoardIssue,
  BoardFilters,
  Swimlane,
  PhBoardColumn,
  DragState,
  MoveResult,
} from '@/modules/project-hub/types/kanban';
import { Search, ChevronDown, ChevronRight, Settings, Download, MoreHorizontal, Zap } from 'lucide-react';

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
      <path d="M8.5 1L4 9h4l-.5 6L12 7H8l.5-6z" fill="#6554C0" />
    </svg>
  );
}

function ImprovementIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8" />
      <path d="M8 11V5M5.5 7.5L8 5l2.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewFeatureIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="#36B37E" />
      <path d="M8 3l1.76 3.56L14 7.27l-3 2.92.71 4.11L8 12.27 4.29 14.3 5 10.19 2 7.27l4.24-.71L8 3z" fill="#fff" />
    </svg>
  );
}

function SubtaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="#4BADE8" />
      <path d="M5.5 8.5L7 10l3.5-4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TYPE_ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Story: StoryIcon,
  Task: TaskIcon,
  Bug: BugIcon,
  Epic: EpicIcon,
  Improvement: ImprovementIcon,
  'New Feature': NewFeatureIcon,
  Subtask: SubtaskIcon,
};

function WorkItemTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const Icon = TYPE_ICON_MAP[type] ?? TaskIcon;
  return <Icon size={size} />;
}

/* ═══════════════════════════════════════════════
   PRIORITY ICONS — INLINE SVG ARROWS
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

  if (priority === 'Highest') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 13V3M4 7l4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 11l4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
      </svg>
    );
  }
  if (priority === 'High') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 13V3M4 7l4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (priority === 'Medium') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <rect x="3" y="7" width="10" height="2" rx="1" fill={color} />
      </svg>
    );
  }
  if (priority === 'Low') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M4 9l4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Lowest
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M4 9l4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5l4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   SP DOTS
   ═══════════════════════════════════════════════ */

function SpDots({ sp }: { sp?: number }) {
  if (!sp) return null;
  const filled = Math.min(sp, 4);
  return (
    <span className="inline-flex items-center gap-[2px]">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-[6px] h-[6px] rounded-full"
          style={{ background: i < filled ? '#FF8B00' : '#DFE1E6' }}
        />
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   ASSIGNEE AVATAR
   ═══════════════════════════════════════════════ */

function AssigneeAvatar({ name, avatar, size = 20 }: { name?: string; avatar?: string; size?: number }) {
  if (!name) return null;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#FF5630', '#6554C0', '#36B37E', '#0052CC', '#FF8B00', '#00B8D9'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: avatar ? undefined : bg, fontSize: size * 0.45, fontWeight: 700, color: '#fff' }}
      title={name}
    >
      {avatar ? <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" /> : initials}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   STATUS LOZENGE — 3 COLORS ONLY
   ═══════════════════════════════════════════════ */

function StatusLozenge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let bg = '#DFE1E6', text = '#42526E';
  if (s.includes('progress') || s.includes('review') || s.includes('active')) {
    bg = '#DEEBFF'; text = '#0747A6';
  } else if (s.includes('done') || s.includes('approved') || s.includes('complete') || s.includes('closed')) {
    bg = '#E3FCEF'; text = '#006644';
  }
  return (
    <span
      className="inline-flex items-center px-1.5 uppercase tracking-[0.03em]"
      style={{ height: 20, borderRadius: 3, background: bg, color: text, fontSize: 11, fontWeight: 700, lineHeight: '20px', whiteSpace: 'nowrap' }}
    >
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   ISSUE CARD
   ═══════════════════════════════════════════════ */

interface IssueCardProps {
  issue: BoardIssue;
  isDragging: boolean;
  onDragStart: (issueId: string, colId: string) => void;
  onDragEnd: () => void;
  onCardClick: (issueId: string) => void;
}

function IssueCard({ issue, isDragging, onDragStart, onDragEnd, onCardClick }: IssueCardProps) {
  const wasDraggedRef = useRef(false);

  return (
    <div
      draggable
      className="group cursor-pointer select-none transition-shadow duration-150"
      style={{
        background: isDragging ? '#FFFFFF' : '#FFFFFF',
        borderRadius: 3,
        padding: 8,
        opacity: isDragging ? 0.35 : 1,
        boxShadow: isDragging
          ? '0 8px 16px rgba(9,30,66,.15), 0 0 1px rgba(9,30,66,.31)'
          : '0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.background = '#FAFBFC';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 8px rgba(9,30,66,.2), 0 0 1px rgba(9,30,66,.31)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF';
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)';
        }
      }}
      onDragStart={(e) => {
        wasDraggedRef.current = true;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('issueId', issue.id);
        onDragStart(issue.id, issue.boardColumnId ?? '');
      }}
      onDragEnd={() => {
        setTimeout(() => { wasDraggedRef.current = false; }, 80);
        onDragEnd();
      }}
      onClick={() => {
        if (wasDraggedRef.current) return;
        onCardClick(issue.id);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open issue ${issue.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(issue.id);
        }
      }}
    >
      {/* Row 1 — Labels */}
      {issue.labels && Array.isArray(issue.labels) && (issue.labels as string[]).length > 0 && (
        <div className="flex flex-wrap gap-[3px] mb-[5px]">
          {(issue.labels as string[]).map((label) => (
            <span
              key={label}
              className="uppercase"
              style={{ height: 16, padding: '0 6px', borderRadius: 2, fontSize: 10, fontWeight: 700, background: '#DFE1E6', color: '#42526E', lineHeight: '16px', display: 'inline-block' }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Row 2 — Summary */}
      <p
        className="mb-[6px]"
        style={{ fontSize: 13, lineHeight: 1.43, color: '#172B4D', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {issue.summary}
      </p>

      {/* Row 3 — Footer */}
      <div className="flex items-center gap-[5px]">
        <WorkItemTypeIcon type={issue.type} size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#0052CC' }}>{issue.id}</span>
        <SpDots sp={issue.sp} />
        <PriorityIcon priority={issue.priority} size={14} />
        <span className="flex-1" />
        <AssigneeAvatar name={issue.assigneeName} avatar={issue.assigneeAvatar} size={20} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COLUMN CELL
   ═══════════════════════════════════════════════ */

interface ColumnCellProps {
  column: PhBoardColumn;
  issues: BoardIssue[];
  isLast: boolean;
  isDragTarget: boolean;
  epicId: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onCardClick: (issueId: string) => void;
  draggingId: string | null;
  onDragStart: (issueId: string, colId: string) => void;
  onDragEnd: () => void;
}

function ColumnCell({
  column, issues, isLast, isDragTarget, onDragOver, onDragLeave, onDrop, onCardClick, draggingId, onDragStart, onDragEnd,
}: ColumnCellProps) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: BOARD_COLUMN_WIDTH,
        minWidth: BOARD_COLUMN_WIDTH,
        borderRight: isLast ? 'none' : '1px solid #DFE1E6',
        background: isDragTarget ? 'rgba(233,242,255,.35)' : 'transparent',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-2"
        style={{
          height: 34,
          background: '#F7F8F9',
          borderBottom: isDragTarget ? '2px solid #388BFF' : '1px solid #DFE1E6',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#626F86', letterSpacing: '0.04em' }}>
          {column.name}
        </span>
        <span
          style={{ fontSize: 11, fontWeight: 600, color: '#626F86', background: 'rgba(9,30,66,.06)', borderRadius: 3, padding: '0 4px', lineHeight: '18px' }}
        >
          {issues.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2" style={{ minHeight: 80 }}>
        {issues.length === 0 && isDragTarget ? (
          <div
            className="flex items-center justify-center"
            style={{ border: '2px dashed #388BFF', borderRadius: 3, minHeight: 56, color: '#388BFF', fontSize: 12, fontWeight: 500 }}
          >
            Drop here
          </div>
        ) : issues.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: 56, color: '#626F86', fontSize: 12 }}>
            Drop issues here
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isDragging={draggingId === issue.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onCardClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SWIMLANE ROW
   ═══════════════════════════════════════════════ */

interface SwimlaneRowProps {
  lane: Swimlane;
  collapsed: boolean;
  onToggle: () => void;
  dragState: DragState;
  onDragStart: (issueId: string, colId: string) => void;
  onDragEnd: () => void;
  onDrop: (colId: string, epicId?: string) => Promise<MoveResult>;
  onCardClick: (issueId: string) => void;
}

function SwimlaneRow({ lane, collapsed, onToggle, dragState, onDragStart, onDragEnd, onDrop, onCardClick }: SwimlaneRowProps) {
  const [dropTargetCol, setDropTargetCol] = useState<string | null>(null);

  const doneCount = lane.columns.reduce(
    (acc, sc) => acc + (sc.column.isDoneColumn ? sc.issues.length : 0),
    0
  );
  const progressPct = lane.totalCount > 0 ? (doneCount / lane.totalCount) * 100 : 0;

  return (
    <div className="border border-[#DFE1E6]" style={{ borderRadius: collapsed ? 3 : '3px 3px 0 0' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 cursor-pointer select-none"
        style={{ height: 38, background: '#FFFFFF', borderBottom: collapsed ? 'none' : '1px solid #DFE1E6' }}
        onClick={onToggle}
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown size={14} color="#626F86" />
        </span>
        <EpicIcon size={16} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#44546F' }}>{lane.epicKey}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>{lane.epicName}</span>
        <span style={{ fontSize: 12, color: '#626F86' }}>({lane.totalCount})</span>
        <StatusLozenge status={lane.epicStatus} />
        <span className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div style={{ width: 60, height: 4, background: '#DFE1E6', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: '#00875A', borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* Column grid */}
      {!collapsed && (
        <div className="flex overflow-x-auto">
          {lane.columns.map((sc, i) => (
            <ColumnCell
              key={sc.column.id}
              column={sc.column}
              issues={sc.issues}
              isLast={i === lane.columns.length - 1}
              isDragTarget={dropTargetCol === sc.column.id}
              epicId={lane.epicId}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetCol(sc.column.id);
              }}
              onDragLeave={() => setDropTargetCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDropTargetCol(null);
                onDrop(sc.column.id, lane.epicId);
              }}
              onCardClick={onCardClick}
              draggingId={dragState.draggingId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BOARD SKELETON
   ═══════════════════════════════════════════════ */

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((lane) => (
        <div key={lane} className="border border-[#DFE1E6] rounded-[3px]">
          <div className="h-[38px] bg-[#F7F8F9] animate-pulse rounded-t-[3px]" />
          <div className="flex">
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="flex flex-col gap-2 p-2" style={{ width: BOARD_COLUMN_WIDTH, minWidth: BOARD_COLUMN_WIDTH, borderRight: col < 6 ? '1px solid #DFE1E6' : 'none' }}>
                <div className="h-[34px] bg-[#F7F8F9] rounded-[3px]" />
                {[0, 1].map((card) => (
                  <div key={card} className="h-[88px] bg-[#F4F5F7] rounded-[3px] animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BOARD EMPTY STATE
   ═══════════════════════════════════════════════ */

function BoardEmptyState({ hasSearch, onClear }: { hasSearch: boolean; onClear: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20">
      <p style={{ fontSize: 16, color: '#44546F' }}>
        {hasSearch ? 'No issues match your search' : 'No issues on this board yet'}
      </p>
      {hasSearch && (
        <button
          onClick={onClear}
          className="mt-3 px-3 py-1.5 rounded text-sm font-medium"
          style={{ background: '#0052CC', color: '#fff' }}
        >
          Clear search
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BOARD NAV TABS
   ═══════════════════════════════════════════════ */

function BoardNavTabs() {
  const tabs = ['Backlog', 'Board', 'Roadmap', 'Reports', 'Settings'];
  return (
    <div className="flex items-center" style={{ height: 40, borderBottom: '1px solid #DFE1E6' }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className="relative px-4 h-full text-sm transition-colors"
          style={{
            fontWeight: tab === 'Board' ? 600 : 400,
            color: tab === 'Board' ? '#0052CC' : '#44546F',
          }}
        >
          {tab}
          {tab === 'Board' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#0052CC' }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BOARD TOOLBAR
   ═══════════════════════════════════════════════ */

interface BoardToolbarProps {
  searchRef: React.RefObject<HTMLInputElement | null>;
  onSearch: (value: string) => void;
  filters: BoardFilters;
  setFilters: React.Dispatch<React.SetStateAction<BoardFilters>>;
}

function BoardToolbar({ searchRef, onSearch, filters, setFilters }: BoardToolbarProps) {
  const avatars = [
    { name: 'AA', color: '#FF5630' },
    { name: 'AA', color: '#6554C0' },
    { name: 'H', color: '#36B37E' },
    { name: 'KA', color: '#0052CC' },
    { name: 'MA', color: '#FF8B00' },
  ];

  return (
    <div
      className="flex items-center gap-3 px-4"
      style={{ height: 52, borderBottom: '1px solid #DFE1E6', background: '#FFFFFF' }}
    >
      {/* Search */}
      <div className="relative">
        <Search size={14} color="#626F86" className="absolute left-2 top-1/2 -translate-y-1/2" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search board"
          className="pl-7 pr-2 py-1 border rounded text-sm"
          style={{ width: 200, height: 32, borderColor: '#DFE1E6', fontSize: 13, color: '#172B4D' }}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Avatar group */}
      <div className="flex items-center -space-x-[5px]">
        {avatars.map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-full border-2 border-white"
            style={{ width: 28, height: 28, background: a.color, fontSize: 10, fontWeight: 700, color: '#fff' }}
          >
            {a.name}
          </span>
        ))}
        <span
          className="inline-flex items-center justify-center rounded-full border-2 border-white"
          style={{ width: 28, height: 28, background: '#97A0AF', fontSize: 10, fontWeight: 700, color: '#fff' }}
        >
          +10
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: '#DFE1E6' }} />

      {/* Filter buttons */}
      <button className="px-2.5 py-1 text-xs font-medium rounded border" style={{ borderColor: '#DFE1E6', color: '#44546F', background: '#fff', height: 32 }}>
        Epic <ChevronDown size={12} className="inline ml-1" />
      </button>
      <button className="px-2.5 py-1 text-xs font-medium rounded border" style={{ borderColor: '#DFE1E6', color: '#44546F', background: '#fff', height: 32 }}>
        Type <ChevronDown size={12} className="inline ml-1" />
      </button>
      <button className="px-2.5 py-1 text-xs font-medium rounded border" style={{ borderColor: '#DFE1E6', color: '#44546F', background: '#fff', height: 32 }}>
        Quick filters <ChevronDown size={12} className="inline ml-1" />
      </button>

      <span className="flex-1" />

      {/* Right side */}
      <button
        className="px-2.5 py-1 text-xs font-semibold rounded"
        style={{ background: '#E9F2FF', border: '1.5px solid #0052CC', color: '#0052CC', height: 32 }}
      >
        Group: Epic
      </button>
      <button className="p-1.5 rounded hover:bg-[rgba(9,30,66,.04)]"><Download size={16} color="#44546F" /></button>
      <button className="p-1.5 rounded hover:bg-[rgba(9,30,66,.04)]"><Settings size={16} color="#44546F" /></button>
      <button className="p-1.5 rounded hover:bg-[rgba(9,30,66,.04)]"><MoreHorizontal size={16} color="#44546F" /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */

export default function KanbanBoardPage() {
  const { key, boardId } = useParams<{ key: string; boardId: string }>();
  const { user } = useAuth();

  // ── Data hooks ──
  const { data: boardConfig, isLoading: configLoading, error: configError } =
    useBoardConfig(boardId ?? '');
  const { data: issues = [], isLoading: issuesLoading } =
    useBoardIssues(boardId ?? '', user?.id);
  const { prefs, savePrefs } =
    useBoardPrefs(boardId ?? '', user?.id ?? '');
  const { dragState, onDragStart, onDragEnd, onDrop } =
    useDragDrop(boardId ?? '', user?.id ?? '');

  // ── Local state ──
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(
    new Set(prefs?.collapsedEpics ?? [])
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Filtered issues ──
  const filtered = useBoardSearch(issues, filters);

  // ── Build swimlanes ──
  const swimlanes: Swimlane[] = useMemo(() => {
    const epicMap = new Map<string, BoardIssue[]>();
    filtered.forEach((issue) => {
      const k = issue.epicId ?? '__no_epic__';
      if (!epicMap.has(k)) epicMap.set(k, []);
      epicMap.get(k)!.push(issue);
    });

    return Array.from(epicMap.entries()).map(([epicId, epicIssues]) => {
      const first = epicIssues[0];
      return {
        epicId,
        epicKey: first?.epicKey ?? epicId,
        epicName: first?.epicName ?? 'No Epic',
        epicStatus: 'In Progress' as const,
        totalCount: epicIssues.length,
        columns: (boardConfig?.columnConfig ?? []).map((col) => ({
          column: col,
          issues: epicIssues.filter((i) => i.boardColumnId === col.id),
        })),
      };
    });
  }, [filtered, boardConfig]);

  // ── Swimlane collapse ──
  const toggleSwimlane = useCallback(
    (epicId: string) => {
      setCollapsedEpics((prev) => {
        const next = new Set(prev);
        next.has(epicId) ? next.delete(epicId) : next.add(epicId);
        savePrefs({
          collapsedEpics: Array.from(next),
          assigneeFilter: prefs?.assigneeFilter ?? [],
          typeFilter: prefs?.typeFilter ?? [],
        });
        return next;
      });
      boardApi.trackBoardEvent({
        boardId: boardId ?? '',
        eventType: 'swimlane_collapsed',
        metadata: { epicId },
      });
    },
    [boardId, prefs, savePrefs]
  );

  // ── Debounced search ──
  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value }));
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // ── "/" shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Track board view ──
  useEffect(() => {
    if (boardId) {
      boardApi.trackBoardEvent({ boardId, eventType: 'board_viewed' });
    }
  }, [boardId]);

  // ── Error state ──
  if (configError) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p style={{ fontSize: 16, fontWeight: 600, color: '#172B4D' }}>Failed to load board</p>
            <button
              className="mt-3 px-4 py-1.5 rounded text-sm font-medium"
              style={{ background: '#0052CC', color: '#fff' }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#FFFFFF' }}>
      {/* Board nav tabs */}
      <BoardNavTabs />

      {/* Toolbar */}
      <BoardToolbar
        searchRef={searchRef}
        onSearch={handleSearch}
        filters={filters}
        setFilters={setFilters}
      />

      {/* Board scroll area */}
      <div className="flex-1 min-h-0 overflow-auto" style={{ background: '#F4F5F7' }}>
        <div className="p-4 flex flex-col gap-3" style={{ minWidth: (boardConfig?.columnConfig?.length ?? 7) * BOARD_COLUMN_WIDTH + 32 }}>
          {configLoading || issuesLoading ? (
            <BoardSkeleton />
          ) : swimlanes.length === 0 ? (
            <BoardEmptyState
              hasSearch={!!filters.search}
              onClear={() => setFilters(DEFAULT_BOARD_FILTERS)}
            />
          ) : (
            swimlanes.map((lane) => (
              <SwimlaneRow
                key={lane.epicId}
                lane={lane}
                collapsed={collapsedEpics.has(lane.epicId)}
                onToggle={() => toggleSwimlane(lane.epicId)}
                dragState={dragState}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
                onCardClick={(issueId) => setSelectedIssueId(issueId)}
              />
            ))
          )}
        </div>
      </div>

      {/* StoryDetailModal — wired to card clicks */}
      {selectedIssueId && (
        <Suspense fallback={null}>
          <StoryDetailModal
            isOpen={!!selectedIssueId}
            onClose={() => setSelectedIssueId(null)}
            itemId={selectedIssueId}
            projectId={boardConfig?.projectId ?? ''}
            projectKey={key}
          />
        </Suspense>
      )}
    </div>
  );
}
