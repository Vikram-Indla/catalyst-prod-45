/**
 * KanbanBoardPage — Jira-style Kanban board for ProjectHub
 * Data: ph_issues (local DB), structure: Jira board layout
 * DnD: @dnd-kit/core + @dnd-kit/sortable — cross-column + reorder
 * Group By: None / Assignee / Epic / Priority / Fix Version
 */
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Layers, Filter, ChevronDown, Check, X, User } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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
  fixVersion: string | null;
}

interface KanbanColumnDef {
  id: string;
  name: string;
  statuses: string[];
}

type GroupByMode = 'none' | 'assignee' | 'epic' | 'priority' | 'fixVersion';

interface GroupBucket {
  groupKey: string;
  groupLabel: string;
  issueIds: string[];
}

/* ═══════════════════════════════════════════════
   COLUMN CONFIG
   ═══════════════════════════════════════════════ */

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-requirements', name: 'IN REQUIREMENTS', statuses: ['In Requirements', 'In Design', 'Awaiting Info'] },
  { id: 'col-ready-dev', name: 'READY FOR DEVELOPMENT', statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'] },
  { id: 'col-dev', name: 'IN DEVELOPMENT', statuses: ['In Development', 'In Progress', 'Under Implementation'] },
  { id: 'col-testing', name: 'IN TESTING', statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA'] },
  { id: 'col-uat', name: 'IN UAT', statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration'] },
  { id: 'col-done', name: 'DONE', statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked'] },
];

const COL_PRIMARY_STATUS: Record<string, string> = {};
const STATUS_TO_COL_ID: Map<string, string> = new Map();
KANBAN_COLUMNS.forEach(col => {
  COL_PRIMARY_STATUS[col.id] = col.statuses[0];
  col.statuses.forEach(s => STATUS_TO_COL_ID.set(s.toLowerCase(), col.id));
});
const COLUMN_ID_SET = new Set(KANBAN_COLUMNS.map(c => c.id));

/* ═══════════════════════════════════════════════
   GROUP BY LOGIC
   ═══════════════════════════════════════════════ */

const PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

function groupIssuesInColumn(
  issueIds: string[],
  issuesById: Map<string, BoardIssue>,
  mode: GroupByMode,
): GroupBucket[] {
  if (mode === 'none') {
    return [{ groupKey: '__all__', groupLabel: '', issueIds }];
  }

  const buckets = new Map<string, { label: string; ids: string[] }>();

  for (const id of issueIds) {
    const issue = issuesById.get(id);
    if (!issue) continue;

    let key: string;
    let label: string;

    switch (mode) {
      case 'assignee':
        key = issue.assigneeName || 'UNASSIGNED';
        label = issue.assigneeName || 'Unassigned';
        break;
      case 'epic':
        key = issue.parentKey || 'NO_EPIC';
        label = issue.parentKey || 'No epic';
        break;
      case 'priority':
        key = issue.priority || 'NO_PRIORITY';
        label = issue.priority || 'No priority';
        break;
      case 'fixVersion':
        key = issue.fixVersion || 'NO_FIX_VERSION';
        label = issue.fixVersion || 'No fix version';
        break;
      default:
        key = '__all__';
        label = '';
    }

    if (!buckets.has(key)) {
      buckets.set(key, { label, ids: [] });
    }
    buckets.get(key)!.ids.push(id);
  }

  // Sort buckets
  const entries = Array.from(buckets.entries());

  if (mode === 'priority') {
    entries.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a[1].label);
      const bi = PRIORITY_ORDER.indexOf(b[1].label);
      const aidx = ai >= 0 ? ai : 999;
      const bidx = bi >= 0 ? bi : 999;
      return aidx - bidx;
    });
  } else if (mode === 'assignee') {
    entries.sort((a, b) => {
      if (a[0] === 'UNASSIGNED') return -1;
      if (b[0] === 'UNASSIGNED') return 1;
      return a[1].label.localeCompare(b[1].label);
    });
  } else if (mode === 'epic') {
    entries.sort((a, b) => {
      if (a[0] === 'NO_EPIC') return -1;
      if (b[0] === 'NO_EPIC') return 1;
      return a[1].label.localeCompare(b[1].label);
    });
  } else if (mode === 'fixVersion') {
    entries.sort((a, b) => {
      if (a[0] === 'NO_FIX_VERSION') return -1;
      if (b[0] === 'NO_FIX_VERSION') return 1;
      return a[1].label.localeCompare(b[1].label);
    });
  }

  return entries.map(([key, val]) => ({
    groupKey: key,
    groupLabel: val.label,
    issueIds: val.ids,
  }));
}

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
   SORTABLE ISSUE CARD — Jira reference parity
   ═══════════════════════════════════════════════ */

function SortableIssueCard({
  issue,
  avatarUrl,
  onCardClick,
}: {
  issue: BoardIssue;
  avatarUrl?: string | null;
  onCardClick: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: '#FFFFFF',
    borderRadius: 3,
    padding: '8px 10px',
    boxShadow: isDragging
      ? '0 8px 24px rgba(9,30,66,.25)'
      : '0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)',
    cursor: 'grab',
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (!isDragging) onCardClick(issue.id); }}
      tabIndex={0}
      role="button"
      aria-label={`Drag ${issue.issueKey}`}
    >
      {/* Labels row */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-[3px] mb-[5px]">
          {issue.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="uppercase"
              style={{
                height: 16, padding: '0 6px', borderRadius: 2, fontSize: 10, fontWeight: 700,
                background: '#DFE1E6', color: '#42526E', lineHeight: '16px',
                display: 'inline-block', maxWidth: 140, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Sprint name */}
      {issue.sprintName && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#5E6C84', marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {issue.sprintName}
        </div>
      )}

      {/* Summary — 2 line clamp */}
      <p style={{
        fontSize: 13, lineHeight: 1.43, color: '#172B4D', marginBottom: 6,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {issue.summary}
      </p>

      {/* Footer: type icon + key + priority + points + spacer + avatar */}
      <div className="flex items-center gap-[5px]">
        <JiraIssueTypeIcon type={issue.issueType} size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#42526E', fontFamily: "'JetBrains Mono', monospace" }}>
          {issue.issueKey}
        </span>
        <PriorityBars priority={normalisePriority(issue.priority)} />
        {issue.storyPoints != null && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#5E6C84', background: '#EBECF0',
            borderRadius: 10, padding: '0 6px', lineHeight: '18px', marginLeft: 2,
          }}>
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
   OVERLAY CARD (drag preview)
   ═══════════════════════════════════════════════ */

function OverlayCard({ issue, avatarUrl }: { issue: BoardIssue; avatarUrl?: string | null }) {
  return (
    <div style={{
      width: 230, background: '#FFFFFF', borderRadius: 3, padding: 8,
      boxShadow: '0 8px 24px rgba(9,30,66,.25)', cursor: 'grabbing', transform: 'rotate(2deg)',
    }}>
      <p style={{
        fontSize: 13, lineHeight: 1.43, color: '#172B4D',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 6,
      }}>
        {issue.summary}
      </p>
      <div className="flex items-center gap-[5px]">
        <JiraIssueTypeIcon type={issue.issueType} size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#42526E', fontFamily: "'JetBrains Mono', monospace" }}>{issue.issueKey}</span>
        <span className="flex-1" />
        <AssigneeAvatar name={issue.assigneeName} avatarUrl={avatarUrl} size={24} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GROUP SECTION HEADER
   ═══════════════════════════════════════════════ */

function GroupSectionHeader({ label, count, mode }: { label: string; count: number; mode: GroupByMode }) {
  const prefix = mode === 'assignee' ? '' : mode === 'epic' ? 'Epic: ' : mode === 'priority' ? '' : mode === 'fixVersion' ? 'Version: ' : '';
  return (
    <div className="flex items-center gap-1.5 py-1.5 px-1" style={{ borderBottom: '1px solid #EBECF0' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {prefix}{label}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 600, color: '#5E6C84',
        background: 'rgba(9,30,66,.06)', borderRadius: 10,
        padding: '0 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center',
      }}>
        {count}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DROPPABLE COLUMN (with Group By support)
   ═══════════════════════════════════════════════ */

function DroppableColumn({
  column,
  issueIds,
  issuesById,
  avatarsByName,
  onCardClick,
  groupBy,
}: {
  column: KanbanColumnDef;
  issueIds: string[];
  issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>;
  onCardClick: (id: string) => void;
  groupBy: GroupByMode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const groups = useMemo(() => groupIssuesInColumn(issueIds, issuesById, groupBy), [issueIds, issuesById, groupBy]);

  // Flatten all issue ids for SortableContext (must match rendered order)
  const flatIds = useMemo(() => groups.flatMap(g => g.issueIds), [groups]);

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
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#5E6C84',
          background: 'rgba(9,30,66,.06)', borderRadius: 10,
          padding: '0 6px', lineHeight: '18px', minWidth: 18, textAlign: 'center',
        }}>
          {issueIds.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-[6px] px-[5px] py-[6px] overflow-y-auto transition-colors duration-150"
        style={{
          minHeight: 100,
          maxHeight: 'calc(100vh - 200px)',
          background: isOver ? 'rgba(37,99,235,0.04)' : 'transparent',
          borderRadius: 4,
        }}
      >
        <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{
                minHeight: 80, color: '#94A3B8', fontSize: 12,
                border: isOver ? '1.5px dashed #2563EB' : '1.5px dashed #E2E8F0',
                borderRadius: 4, transition: 'all 150ms',
              }}
            >
              {isOver ? 'Drop here' : 'No issues'}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.groupKey}>
                {groupBy !== 'none' && (
                  <GroupSectionHeader label={group.groupLabel} count={group.issueIds.length} mode={groupBy} />
                )}
                <div className="flex flex-col gap-[6px]" style={{ marginTop: groupBy !== 'none' ? 4 : 0 }}>
                  {group.issueIds.map((id) => {
                    const issue = issuesById.get(id);
                    if (!issue) return null;
                    const avatarUrl = issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null;
                    return (
                      <SortableIssueCard
                        key={id}
                        issue={issue}
                        avatarUrl={avatarUrl}
                        onCardClick={onCardClick}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </SortableContext>

        {issueIds.length > 0 && isOver && (
          <div style={{ height: 2, background: '#2563EB', borderRadius: 1, boxShadow: '0 0 4px rgba(37,99,235,0.5)' }} />
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

  const filtered = allAssignees.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  const isActive = selected.size > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-1"
        style={{
          height: 32, padding: '0 10px', borderRadius: 6,
          border: isActive ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: isActive ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
          color: isActive ? '#2563EB' : '#0F172A',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", transition: 'all 150ms',
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
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden',
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
                    fontFamily: "'Inter', sans-serif", transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
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

const GROUP_OPTIONS: { key: GroupByMode; label: string }[] = [
  { key: 'assignee', label: 'Assignee' },
  { key: 'epic', label: 'Epic' },
  { key: 'priority', label: 'Priority' },
  { key: 'fixVersion', label: 'Fix Version' },
];

function GroupByPopover({ value, onChange }: { value: GroupByMode; onChange: (v: GroupByMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isActive = value !== 'none';
  const activeLabel = GROUP_OPTIONS.find(o => o.key === value)?.label;

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
          fontFamily: "'Inter', sans-serif", transition: 'all 150ms',
        }}
      >
        <Layers size={14} />
        {isActive ? `Group: ${activeLabel}` : 'Group'}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          width: 220, background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 8px 4px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Group by
          </div>
          {GROUP_OPTIONS.map(opt => {
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
                  fontFamily: "'Inter', sans-serif", transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
              >
                <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <Check size={14} color="#2563EB" />}
                </div>
                {opt.label}
              </button>
            );
          })}
          {isActive && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => { onChange('none'); setOpen(false); }}
                style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Clear grouping
              </button>
            </div>
          )}
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
        <div key={col.id} className="flex flex-col" style={{ width: 240, minWidth: 240 }}>
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
   DND HELPERS
   ═══════════════════════════════════════════════ */

type ColumnIssueMap = Record<string, string[]>;

function findColumnByCardId(columns: ColumnIssueMap, cardId: string): string | null {
  for (const colId of Object.keys(columns)) {
    if (columns[colId].includes(cardId)) return colId;
  }
  return null;
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function KanbanBoardPage() {
  const { key } = useParams<{ key: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;
  const avatarsByName = useProfileAvatarsByName();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string[]>>({});
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [columnIssueMap, setColumnIssueMap] = useState<ColumnIssueMap>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  const { data: rawIssues = [], isLoading } = useQuery({
    queryKey: ['kanban-issues', key],
    queryFn: async () => {
      if (!key) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, fix_versions')
        .eq('project_key', key.toUpperCase())
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r): BoardIssue => {
        // Extract first fix version name from JSON
        let fixVersion: string | null = null;
        if (r.fix_versions && Array.isArray(r.fix_versions) && (r.fix_versions as any[]).length > 0) {
          const fv = (r.fix_versions as any[])[0];
          fixVersion = typeof fv === 'string' ? fv : fv?.name ?? null;
        }
        return {
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
          fixVersion,
        };
      });
    },
    enabled: !!key,
    staleTime: 30_000,
  });

  const issuesById = useMemo(() => {
    const map = new Map<string, BoardIssue>();
    rawIssues.forEach(i => map.set(i.id, i));
    return map;
  }, [rawIssues]);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

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
      { id: 'type', label: 'Type', options: Array.from(types.entries()).map(([v, c]) => ({ id: v, value: v, label: v, count: c })) },
      { id: 'priority', label: 'Priority', options: Array.from(priorities.entries()).map(([v, c]) => ({ id: v, value: v, label: v, count: c })) },
      { id: 'status', label: 'Status', options: Array.from(statuses.entries()).map(([v, c]) => ({ id: v, value: v, label: v, count: c })) },
    ];
  }, [rawIssues]);

  const advancedFilterCount = Object.values(advancedFilters).reduce((acc, v) => acc + v.length, 0);

  const filteredIssues = useMemo(() => {
    let issues = rawIssues;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      issues = issues.filter(i =>
        i.summary.toLowerCase().includes(q) ||
        i.issueKey.toLowerCase().includes(q) ||
        (i.assigneeName ?? '').toLowerCase().includes(q)
      );
    }
    if (selectedAssignees.size > 0) {
      issues = issues.filter(i => {
        const name = i.assigneeName || 'Unassigned';
        return selectedAssignees.has(name);
      });
    }
    if (advancedFilters.type?.length) issues = issues.filter(i => advancedFilters.type.includes(i.issueType));
    if (advancedFilters.priority?.length) issues = issues.filter(i => advancedFilters.priority.includes(i.priority));
    if (advancedFilters.status?.length) issues = issues.filter(i => advancedFilters.status.includes(i.status));
    return issues;
  }, [rawIssues, debouncedSearch, selectedAssignees, advancedFilters]);

  useEffect(() => {
    if (activeCardId) return;
    const map: ColumnIssueMap = {};
    KANBAN_COLUMNS.forEach(col => { map[col.id] = []; });
    filteredIssues.forEach(issue => {
      const colId = STATUS_TO_COL_ID.get(issue.status.toLowerCase());
      if (colId && map[colId]) map[colId].push(issue.id);
    });
    setColumnIssueMap(map);
  }, [filteredIssues, activeCardId]);

  const totalVisible = Object.values(columnIssueMap).reduce((acc, ids) => acc + ids.length, 0);

  const handleFilterChange = useCallback((cat: string, values: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, [cat]: values }));
  }, []);

  const handleClearAllFilters = useCallback(() => { setAdvancedFilters({}); }, []);

  const handleDragStart = useCallback((e: DragStartEvent) => { setActiveCardId(String(e.active.id)); }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    setColumnIssueMap(prev => {
      const fromColId = findColumnByCardId(prev, activeId);
      if (!fromColId) return prev;
      const overIsColumn = COLUMN_ID_SET.has(overId);
      const toColId = overIsColumn ? overId : findColumnByCardId(prev, overId);
      if (!toColId || fromColId === toColId) return prev;

      const fromIds = [...prev[fromColId]];
      const toIds = [...prev[toColId]];
      const activeIdx = fromIds.indexOf(activeId);
      if (activeIdx < 0) return prev;
      fromIds.splice(activeIdx, 1);

      if (!overIsColumn) {
        const overIdx = toIds.indexOf(overId);
        toIds.splice(overIdx >= 0 ? overIdx : 0, 0, activeId);
      } else {
        toIds.unshift(activeId);
      }

      return { ...prev, [fromColId]: fromIds, [toColId]: toIds };
    });
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    setActiveCardId(null);
    if (!overId) return;

    setColumnIssueMap(prev => {
      const colId = findColumnByCardId(prev, activeId);
      if (!colId) return prev;
      if (COLUMN_ID_SET.has(overId)) return prev;
      const ids = prev[colId];
      const oldIdx = ids.indexOf(activeId);
      const newIdx = ids.indexOf(overId);
      if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return prev;
      return { ...prev, [colId]: arrayMove(ids, oldIdx, newIdx) };
    });

    // Persist status change
    setColumnIssueMap(prev => {
      const colId = findColumnByCardId(prev, activeId);
      if (!colId) return prev;
      const issue = issuesById.get(activeId);
      const newStatus = COL_PRIMARY_STATUS[colId];
      if (!issue || !newStatus) return prev;
      if (issue.status !== newStatus) {
        issue.status = newStatus;
        Promise.resolve(
          supabase.from('ph_issues').update({ status: newStatus }).eq('id', activeId)
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: ['kanban-issues', key] });
        });
      }
      return prev;
    });
  }, [issuesById, key, queryClient]);

  const activeIssue = activeCardId ? issuesById.get(activeCardId) : null;

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ background: '#F4F5F7' }}>
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
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b" style={{ borderColor: tk.border, background: tk.pageBg }}>
        <h1 className="text-xl font-semibold" style={{ color: tk.t1, fontFamily: "'Sora', sans-serif", fontWeight: 650 }}>Board</h1>
        <p className="text-sm mt-0.5" style={{ color: tk.t2 }}>Visualize and track work items across workflow stages</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2.5" style={{ background: tk.pageBg, borderBottom: `1px solid ${tk.border}` }}>
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

        <AssigneeFilterPopover
          allAssignees={allAssignees}
          selected={selectedAssignees}
          onChange={setSelectedAssignees}
          avatarsByName={avatarsByName}
        />

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

        <GroupByPopover value={groupBy} onChange={setGroupBy} />

        <div className="flex-1" />

        <span style={{ fontSize: 13, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
          {totalVisible} issues
        </span>
      </div>

      {/* Board with DnD */}
      <div className="flex-1 min-h-0 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex" style={{ minWidth: KANBAN_COLUMNS.length * 240 }}>
            {KANBAN_COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                column={col}
                issueIds={columnIssueMap[col.id] ?? []}
                issuesById={issuesById}
                avatarsByName={avatarsByName}
                onCardClick={(id) => setSelectedIssueId(id)}
                groupBy={groupBy}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeIssue ? (
              <OverlayCard
                issue={activeIssue}
                avatarUrl={activeIssue.assigneeName ? avatarsByName.get(activeIssue.assigneeName.toLowerCase()) : null}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
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
