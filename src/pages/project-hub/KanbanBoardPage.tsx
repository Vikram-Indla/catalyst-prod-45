/**
 * KanbanBoardPage — Jira Cloud–parity Kanban board for ProjectHub
 * 
 * Fixes applied (7-point Jira parity):
 * 1) Board chrome — project name, view controls, search, filters, group by
 * 2) Column headers — compact 32px, toolbar-aligned, issue count pill
 * 3) Swimlanes — full-width horizontal bands spanning ALL columns
 * 4) Column separators — 1px left border, no gutters, flat neutral bg
 * 5) Card styling — flat, tight padding, subtle border, minimal shadow
 * 6) Card metadata — summary top, key+type bottom-left, avatar bottom-right
 * 7) Text clamping — consistent line-height, tight spacing
 */
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronDown, ChevronRight, Check, User } from 'lucide-react';
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

/* ═══ TYPES ═══ */

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

/* Issue types visible on the board — Jira parity: Epics as swimlanes, Stories/Features as cards */
const BOARD_ISSUE_TYPES = new Set(['Story', 'Epic', 'Feature', 'New Feature']);

interface GroupBucket {
  groupKey: string;
  groupLabel: string;
  issueIds: string[];
}

/* ═══ COLUMN CONFIG ═══ */

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-requirements', name: 'IN REQUIREMENTS', statuses: ['In Requirements', 'In Design', 'Awaiting Info'] },
  { id: 'col-ready-dev', name: 'READY FOR DEV', statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'] },
  { id: 'col-dev', name: 'IN DEVELOPMENT', statuses: ['In Development', 'In Progress', 'Under Implementation'] },
  { id: 'col-testing', name: 'IN QA', statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA'] },
  { id: 'col-uat', name: 'READY FOR UAT', statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration'] },
  { id: 'col-done', name: 'DONE', statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked'] },
];

const COL_COUNT = KANBAN_COLUMNS.length;
const COL_PRIMARY_STATUS: Record<string, string> = {};
const STATUS_TO_COL_ID: Map<string, string> = new Map();
KANBAN_COLUMNS.forEach(col => {
  COL_PRIMARY_STATUS[col.id] = col.statuses[0];
  col.statuses.forEach(s => STATUS_TO_COL_ID.set(s.toLowerCase(), col.id));
});
const COLUMN_ID_SET = new Set(KANBAN_COLUMNS.map(c => c.id));

/* ═══ GROUP BY LOGIC ═══ */

const PRIORITY_ORDER = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

function groupIssues(issues: BoardIssue[], mode: GroupByMode): GroupBucket[] {
  if (mode === 'none') return [];
  const buckets = new Map<string, { label: string; ids: string[] }>();

  for (const issue of issues) {
    let key: string, label: string;
    switch (mode) {
      case 'assignee': key = issue.assigneeName || 'UNASSIGNED'; label = issue.assigneeName || 'Unassigned'; break;
      case 'epic': key = issue.parentKey || 'NO_EPIC'; label = issue.parentKey || 'No Epic'; break;
      case 'priority': key = issue.priority || 'NO_PRIORITY'; label = issue.priority || 'No priority'; break;
      case 'fixVersion': key = issue.fixVersion || 'NO_FIX_VERSION'; label = issue.fixVersion || 'No fix version'; break;
      default: key = '__all__'; label = '';
    }
    if (!buckets.has(key)) buckets.set(key, { label, ids: [] });
    buckets.get(key)!.ids.push(issue.id);
  }

  const entries = Array.from(buckets.entries());
  if (mode === 'priority') {
    entries.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a[1].label), bi = PRIORITY_ORDER.indexOf(b[1].label);
      return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    });
  } else if (mode === 'assignee') {
    entries.sort((a, b) => { if (a[0] === 'UNASSIGNED') return 1; if (b[0] === 'UNASSIGNED') return -1; return a[1].label.localeCompare(b[1].label); });
  } else if (mode === 'epic') {
    entries.sort((a, b) => { if (a[0] === 'NO_EPIC') return 1; if (b[0] === 'NO_EPIC') return -1; return a[1].label.localeCompare(b[1].label); });
  } else if (mode === 'fixVersion') {
    entries.sort((a, b) => { if (a[0] === 'NO_FIX_VERSION') return 1; if (b[0] === 'NO_FIX_VERSION') return -1; return a[1].label.localeCompare(b[1].label); });
  }

  return entries.map(([key, val]) => ({ groupKey: key, groupLabel: val.label, issueIds: val.ids }));
}

/* ═══ AVATAR (Jira-compact: 24px) ═══ */

function Av({ name, url, size = 24 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name || ''} className="rounded-full flex-shrink-0 object-cover" style={{ width: size, height: size }} />;
  if (!name) return <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={{ width: size, height: size, background: '#DFE1E6' }}><User size={size * 0.55} color="#97A0AF" /></span>;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777', '#FF8B00'];
  return <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={{ width: size, height: size, background: colors[name.charCodeAt(0) % colors.length], fontSize: size * 0.42, fontWeight: 700, color: '#fff' }} title={name}>{initials}</span>;
}

/* ═══ JIRA-PARITY CARD ═══
   Layout: Summary (1-2 lines) → bottom row: type icon + key + priority + points | avatar
   Flat: 1px border, no shadow at rest, subtle hover.
   Tight: 6px 8px padding, 2px radius.
*/

const CARD_REST: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 2,
  border: '1px solid #DDDEE1',
  padding: '6px 8px',
  cursor: 'pointer',
  transition: 'background 80ms, box-shadow 80ms',
};
const CARD_HOVER_SHADOW = '0 1px 4px rgba(9,30,66,.15)';

function JiraCardContent({ issue, avatarUrl }: { issue: BoardIssue; avatarUrl?: string | null }) {
  return (
    <>
      {/* Row 1: Summary — 2-line clamp */}
      <div style={{ fontSize: 12, lineHeight: '16px', color: '#172B4D', fontWeight: 400, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
        {issue.summary}
      </div>

      {/* Row 2: Labels inline (max 1, truncated) + Sprint tag */}
      {(issue.labels.length > 0 || issue.sprintName) && (
        <div className="flex items-center gap-1 mb-1" style={{ overflow: 'hidden' }}>
          {issue.labels.slice(0, 1).map(l => (
            <span key={l} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#DFE1E6', color: '#42526E', padding: '0 4px', borderRadius: 2, lineHeight: '16px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', flexShrink: 0 }}>{l}</span>
          ))}
          {issue.sprintName && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#5E6C84', lineHeight: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid #DFE1E6', borderRadius: 2, padding: '0 4px' }}>{issue.sprintName}</span>
          )}
        </div>
      )}

      {/* Row 3: Footer: type + key + priority + points ... avatar */}
      <div className="flex items-center" style={{ gap: 4, minHeight: 20 }}>
        <JiraIssueTypeIcon type={issue.issueType} size={14} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#42526E', fontFamily: "'JetBrains Mono', monospace", lineHeight: '14px' }}>{issue.issueKey}</span>
        <PriorityBars priority={normalisePriority(issue.priority)} />
        {issue.storyPoints != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#5E6C84', background: '#EBECF0', borderRadius: 10, padding: '0 5px', lineHeight: '16px' }}>{issue.storyPoints}</span>
        )}
        <span className="flex-1" />
        <Av name={issue.assigneeName} url={avatarUrl} size={22} />
      </div>
    </>
  );
}

function JiraCard({ issue, avatarUrl, onClick }: { issue: BoardIssue; avatarUrl?: string | null; onClick: () => void }) {
  return (
    <div
      style={CARD_REST}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.boxShadow = CARD_HOVER_SHADOW; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <JiraCardContent issue={issue} avatarUrl={avatarUrl} />
    </div>
  );
}

/* ═══ SORTABLE CARD (DnD wrapper) ═══ */

function SortableCard({ issue, avatarUrl, onClick }: { issue: BoardIssue; avatarUrl?: string | null; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  return (
    <div
      ref={setNodeRef}
      style={{ ...CARD_REST, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 999 : 'auto', boxShadow: isDragging ? '0 8px 16px rgba(9,30,66,.25)' : 'none' }}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onClick(); }}
      tabIndex={0}
      role="button"
      aria-label={issue.issueKey}
    >
      <JiraCardContent issue={issue} avatarUrl={avatarUrl} />
    </div>
  );
}

/* ═══ DRAG OVERLAY ═══ */

function OverlayCard({ issue, avatarUrl }: { issue: BoardIssue; avatarUrl?: string | null }) {
  return (
    <div style={{ ...CARD_REST, width: 220, boxShadow: '0 8px 16px rgba(9,30,66,.25)', transform: 'rotate(2deg)', cursor: 'grabbing' }}>
      <div style={{ fontSize: 12, lineHeight: '16px', color: '#172B4D', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{issue.summary}</div>
      <div className="flex items-center" style={{ gap: 4 }}>
        <JiraIssueTypeIcon type={issue.issueType} size={14} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#42526E', fontFamily: "'JetBrains Mono', monospace" }}>{issue.issueKey}</span>
        <span className="flex-1" />
        <Av name={issue.assigneeName} url={avatarUrl} size={22} />
      </div>
    </div>
  );
}

/* ═══ COLUMN HEADER (Jira: compact 32px, 1px left border separator) ═══ */

function ColHeader({ name, count }: { name: string; count: number }) {
  return (
    <div className="flex items-center gap-1 px-2 sticky top-0 z-10" style={{ height: 32, background: '#F4F5F7', borderBottom: '1px solid #DDDEE1' }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.04em', lineHeight: '14px' }}>{name}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#5E6C84', background: 'rgba(9,30,66,.08)', borderRadius: 10, padding: '0 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center' }}>{count}</span>
    </div>
  );
}

/* ═══ DROPPABLE COLUMN ═══ */

function DroppableColumn({ column, issueIds, issuesById, avatarsByName, onCardClick, isFirst }: {
  column: KanbanColumnDef; issueIds: string[]; issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>; onCardClick: (id: string) => void; isFirst: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex flex-col flex-shrink-0" style={{ flex: '1 1 0', minWidth: 180, borderLeft: isFirst ? 'none' : '1px solid #DDDEE1' }}>
      <ColHeader name={column.name} count={issueIds.length} />
      <div ref={setNodeRef} className="flex flex-col gap-1 p-1 overflow-y-auto" style={{ minHeight: 60, maxHeight: 'calc(100vh - 180px)', background: isOver ? 'rgba(37,99,235,0.03)' : 'transparent', transition: 'background 100ms' }}>
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 && (
            <div className="flex items-center justify-center" style={{ minHeight: 40, color: '#94A3B8', fontSize: 11 }}>{isOver ? 'Drop here' : ''}</div>
          )}
          {issueIds.map(id => {
            const issue = issuesById.get(id);
            if (!issue) return null;
            return <SortableCard key={id} issue={issue} avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null} onClick={() => onCardClick(id)} />;
          })}
        </SortableContext>
      </div>
    </div>
  );
}

/* ═══ SWIMLANE ROW (Jira parity: full-width band spanning ALL columns, DnD enabled) ═══ */

function SwimlaneRow({ group, mode, issuesById, avatarsByName, onCardClick, defaultOpen }: {
  group: GroupBucket; mode: GroupByMode; issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>; onCardClick: (id: string) => void; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const colMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    group.issueIds.forEach(id => {
      const issue = issuesById.get(id);
      if (!issue) return;
      const cid = STATUS_TO_COL_ID.get(issue.status.toLowerCase());
      if (cid && m[cid]) m[cid].push(id);
    });
    return m;
  }, [group.issueIds, issuesById]);

  const icon = () => {
    if (mode === 'assignee') {
      const name = group.groupKey === 'UNASSIGNED' ? null : group.groupLabel;
      return <Av name={name} url={name ? avatarsByName.get(name.toLowerCase()) : null} size={24} />;
    }
    if (mode === 'epic' && group.groupKey !== 'NO_EPIC') return <JiraIssueTypeIcon type="Epic" size={16} />;
    if (mode === 'priority') return <PriorityBars priority={normalisePriority(group.groupLabel)} />;
    return null;
  };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left"
        style={{ padding: '10px 16px', background: '#FAFBFC', border: 'none', borderBottom: '1px solid #DDDEE1', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#FAFBFC'; }}
      >
        {open ? <ChevronDown size={14} color="#5E6C84" /> : <ChevronRight size={14} color="#5E6C84" />}
        {icon()}
        {mode === 'epic' && group.groupKey !== 'NO_EPIC' && (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#42526E', fontFamily: "'JetBrains Mono', monospace" }}>{group.groupKey}</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#172B4D' }}>{group.groupLabel}</span>
        <span style={{ fontSize: 12, color: '#5E6C84' }}>({group.issueIds.length} work item{group.issueIds.length !== 1 ? 's' : ''})</span>
        {mode === 'epic' && group.groupKey !== 'NO_EPIC' && (
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '1px 6px', borderRadius: 3, lineHeight: '20px', background: '#DEEBFF', color: '#0747A6' }}>IN PROGRESS</span>
        )}
      </button>

      {open && (
        <div className="flex" style={{ borderBottom: '1px solid #DDDEE1' }}>
          {KANBAN_COLUMNS.map((col, i) => {
            const ids = colMap[col.id] ?? [];
            return <SwimlaneDndColumn key={col.id} colId={col.id} groupKey={group.groupKey} issueIds={ids} issuesById={issuesById} avatarsByName={avatarsByName} onCardClick={onCardClick} isFirst={i === 0} />;
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ SWIMLANE DROPPABLE COLUMN CELL ═══ */

function SwimlaneDndColumn({ colId, groupKey, issueIds, issuesById, avatarsByName, onCardClick, isFirst }: {
  colId: string; groupKey: string; issueIds: string[]; issuesById: Map<string, BoardIssue>;
  avatarsByName: Map<string, string>; onCardClick: (id: string) => void; isFirst: boolean;
}) {
  const droppableId = `${groupKey}::${colId}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div className="flex flex-col" style={{ flex: '1 1 0', minWidth: 180, borderLeft: isFirst ? 'none' : '1px solid #DDDEE1' }}>
      <div ref={setNodeRef} className="flex flex-col gap-1 p-1" style={{ minHeight: 40, background: isOver ? 'rgba(37,99,235,0.03)' : '#FFFFFF', transition: 'background 100ms' }}>
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issueIds.length === 0 && isOver && (
            <div className="flex items-center justify-center" style={{ minHeight: 40, color: '#94A3B8', fontSize: 11 }}>Drop here</div>
          )}
          {issueIds.map(id => {
            const issue = issuesById.get(id);
            if (!issue) return null;
            return <SortableCard key={id} issue={issue} avatarUrl={issue.assigneeName ? avatarsByName.get(issue.assigneeName.toLowerCase()) : null} onClick={() => onCardClick(id)} />;
          })}
        </SortableContext>
      </div>
    </div>
  );
}

/* ═══ AVATAR STACK FILTER (Jira parity: clickable team avatars) ═══ */

function AvatarStackFilter({ allAssignees, selected, onChange, avatarsByName }: {
  allAssignees: { name: string; count: number }[]; selected: Set<string>;
  onChange: (s: Set<string>) => void; avatarsByName: Map<string, string>;
}) {
  const top = allAssignees.filter(a => a.name !== 'Unassigned').slice(0, 6);
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {top.map((a, i) => {
        const isSel = selected.has(a.name);
        const url = avatarsByName.get(a.name.toLowerCase());
        return (
          <button
            key={a.name}
            onClick={() => { const n = new Set(selected); if (isSel) n.delete(a.name); else n.add(a.name); onChange(n); }}
            title={a.name}
            style={{
              position: 'relative', marginLeft: i === 0 ? 0 : -6, zIndex: top.length - i,
              width: 28, height: 28, borderRadius: '50%',
              border: isSel ? '2px solid #2563EB' : '2px solid #FFFFFF',
              background: '#FFFFFF', cursor: 'pointer', padding: 0,
              transition: 'transform 80ms, border-color 80ms',
              transform: isSel ? 'scale(1.15)' : 'scale(1)',
              outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = '20'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = isSel ? 'scale(1.15)' : 'scale(1)'; e.currentTarget.style.zIndex = String(top.length - i); }}
          >
            <Av name={a.name} url={url} size={24} />
          </button>
        );
      })}
      {/* Overflow count */}
      {allAssignees.filter(a => a.name !== 'Unassigned').length > 6 && (
        <span style={{ marginLeft: -4, width: 28, height: 28, borderRadius: '50%', background: '#EBECF0', border: '2px solid #FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#42526E', zIndex: 0 }}>
          +{allAssignees.filter(a => a.name !== 'Unassigned').length - 6}
        </span>
      )}
      {selected.size > 0 && (
        <button onClick={() => onChange(new Set())} style={{ marginLeft: 4, fontSize: 10, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>×</button>
      )}
    </div>
  );
}

/* ═══ EPIC FILTER DROPDOWN ═══ */

function EpicFilterDropdown({ epics, selected, onChange }: {
  epics: { key: string; summary: string | null; count: number }[]; selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  const filtered = epics.filter(e => e.key.toLowerCase().includes(q.toLowerCase()) || (e.summary && e.summary.toLowerCase().includes(q.toLowerCase())));
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 3, border: active ? '2px solid #2563EB' : '1px solid #DDDEE1', background: active ? '#E8F0FE' : '#FFFFFF', color: active ? '#2563EB' : '#42526E', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
        Epic{active && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 9, background: '#2563EB', color: '#FFFFFF', fontSize: 10, fontWeight: 700 }}>{selected.length}</span>}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, width: 340, background: '#FFFFFF', border: '1px solid #DDDEE1', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          <div style={{ padding: '8px 8px', borderBottom: '1px solid #EBECF0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search epics" autoFocus style={{ width: '100%', height: 32, paddingLeft: 28, paddingRight: 8, border: '1px solid #DDDEE1', borderRadius: 4, fontSize: 13, color: '#0F172A', background: '#FFFFFF', outline: 'none' }} />
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(e => {
              const isSel = selected.includes(e.key);
              return (
                <button key={e.key} onClick={() => { onChange(isSel ? selected.filter(k => k !== e.key) : [...selected, e.key]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: isSel ? 'rgba(37,99,235,0.06)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={ev => { if (!isSel) (ev.currentTarget as HTMLElement).style.background = '#F4F5F7'; }} onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = isSel ? 'rgba(37,99,235,0.06)' : 'transparent'; }}>
                  <div style={{ width: 16, height: 16, border: isSel ? 'none' : '1.5px solid #C1C7D0', borderRadius: 3, background: isSel ? '#2563EB' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSel && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.summary || e.key}</div>
                    <div style={{ fontSize: 11, color: '#5E6C84', fontFamily: "'JetBrains Mono', monospace" }}>{e.key}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {active && <div style={{ padding: '6px 12px', borderTop: '1px solid #EBECF0' }}><button onClick={() => { onChange([]); }} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Clear all</button></div>}
        </div>
      )}
    </div>
  );
}

/* ═══ TYPE FILTER DROPDOWN ═══ */

function TypeFilterDropdown({ types, selected, onChange }: {
  types: { type: string; count: number }[]; selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 3, border: active ? '2px solid #2563EB' : '1px solid #DDDEE1', background: '#FFFFFF', color: active ? '#2563EB' : '#42526E', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
        Type{active && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 9, background: '#2563EB', color: '#FFFFFF', fontSize: 10, fontWeight: 700 }}>{selected.length}</span>}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, width: 200, background: '#FFFFFF', border: '1px solid #DDDEE1', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {types.map(t => {
              const isSel = selected.includes(t.type);
              return (
                <button key={t.type} onClick={() => { onChange(isSel ? selected.filter(k => k !== t.type) : [...selected, t.type]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px', border: 'none', background: isSel ? 'rgba(37,99,235,0.06)' : 'transparent', cursor: 'pointer', fontSize: 12, color: '#0F172A' }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSel ? 'rgba(37,99,235,0.06)' : 'transparent'; }}>
                  <div style={{ width: 14 }}>{isSel && <Check size={12} color="#2563EB" />}</div>
                  <JiraIssueTypeIcon type={t.type} size={14} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{t.type}</span>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>{t.count}</span>
                </button>
              );
            })}
          </div>
          {active && <div style={{ padding: '4px 8px', borderTop: '1px solid #EBECF0' }}><button onClick={() => { onChange([]); }} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Clear all</button></div>}
        </div>
      )}
    </div>
  );
}

/* ═══ GROUP BY BUTTON (Jira: right side, outlined when active) ═══ */

const GRP_OPTS: { key: GroupByMode; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'epic', label: 'Epic' },
  { key: 'priority', label: 'Priority' },
  { key: 'fixVersion', label: 'Fix Version' },
];

function GroupByBtn({ value, onChange }: { value: GroupByMode; onChange: (v: GroupByMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  const active = value !== 'none';
  const lbl = GRP_OPTS.find(o => o.key === value)?.label;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 3, border: active ? '2px solid #2563EB' : '1px solid #DDDEE1', background: '#FFFFFF', color: active ? '#2563EB' : '#42526E', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
        {active ? `Group: ${lbl}` : 'Group'}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100, width: 200, background: '#FFFFFF', border: '1px solid #DDDEE1', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          <div style={{ padding: '4px 8px 2px', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group by</div>
          {GRP_OPTS.map(o => {
            const sel = value === o.key;
            return (
              <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px', border: 'none', background: sel ? 'rgba(37,99,235,0.06)' : 'transparent', cursor: 'pointer', fontSize: 12, color: sel ? '#2563EB' : '#0F172A', fontWeight: sel ? 600 : 400 }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F4F5F7'; }} onMouseLeave={e => { e.currentTarget.style.background = sel ? 'rgba(37,99,235,0.06)' : 'transparent'; }}>
                <div style={{ width: 14 }}>{sel && <Check size={12} color="#2563EB" />}</div>
                {o.label}
              </button>
            );
          })}
          {active && <div style={{ padding: '4px 8px', borderTop: '1px solid #EBECF0' }}><button onClick={() => { onChange('none'); setOpen(false); }} style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Clear grouping</button></div>}
        </div>
      )}
    </div>
  );
}

/* ═══ DND HELPERS ═══ */

type ColMap = Record<string, string[]>;
function findCol(m: ColMap, id: string): string | null { for (const c of Object.keys(m)) { if (m[c].includes(id)) return c; } return null; }

/* ═══ MAIN PAGE ═══ */

export default function KanbanBoardPage() {
  const { key } = useParams<{ key: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;
  const avatarsByName = useProfileAvatarsByName();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [selEpics, setSelEpics] = useState<string[]>([]);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByMode>('epic');
  const [filterOpen, setFilterOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState<Record<string, string[]>>({});
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [selIssueId, setSelIssueId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [dragId, setDragId] = useState<string | null>(null);
  const [colMap, setColMap] = useState<ColMap>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: projMeta } = useQuery({
    queryKey: ['ph-project-meta', key],
    queryFn: async () => { if (!key) return null; const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', key.toUpperCase()).maybeSingle(); return data; },
    enabled: !!key, staleTime: 60_000,
  });

  const { data: rawIssues = [], isLoading } = useQuery({
    queryKey: ['kanban-issues', key],
    queryFn: async () => {
      if (!key) return [];
      const { data, error } = await supabase.from('ph_issues').select('id, issue_key, summary, status, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, fix_versions').eq('project_key', key.toUpperCase()).is('deleted_at', null).in('issue_type', ['Story', 'Epic', 'Feature', 'New Feature']).order('jira_updated_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return (data ?? []).map((r): BoardIssue => {
        let fv: string | null = null;
        if (r.fix_versions && Array.isArray(r.fix_versions) && (r.fix_versions as any[]).length > 0) { const f = (r.fix_versions as any[])[0]; fv = typeof f === 'string' ? f : f?.name ?? null; }
        return { id: r.id, issueKey: r.issue_key, summary: r.summary ?? '', issueType: r.issue_type ?? 'Task', priority: r.priority ?? 'Medium', status: r.status ?? 'Backlog', assigneeName: r.assignee_display_name, labels: Array.isArray(r.labels) ? (r.labels as string[]) : [], sprintName: r.sprint_name, storyPoints: r.story_points ? Number(r.story_points) : null, parentKey: r.parent_key, fixVersion: fv };
      });
    },
    enabled: !!key, staleTime: 30_000,
  });

  const issuesById = useMemo(() => { const m = new Map<string, BoardIssue>(); rawIssues.forEach(i => m.set(i.id, i)); return m; }, [rawIssues]);

  useEffect(() => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setDebSearch(search), 250); return () => clearTimeout(timerRef.current); }, [search]);

  const allAssignees = useMemo(() => { const m = new Map<string, number>(); rawIssues.forEach(i => { const n = i.assigneeName || 'Unassigned'; m.set(n, (m.get(n) ?? 0) + 1); }); return Array.from(m.entries()).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count); }, [rawIssues]);

  const allEpics = useMemo(() => {
    // Build epic key → summary lookup from epics in the dataset
    const epicSummaryMap = new Map<string, string>();
    rawIssues.forEach(i => { if (i.issueType === 'Epic') epicSummaryMap.set(i.issueKey, i.summary); });
    // Count children per parent key
    const m = new Map<string, number>();
    rawIssues.forEach(i => { if (i.parentKey) m.set(i.parentKey, (m.get(i.parentKey) ?? 0) + 1); });
    return Array.from(m.entries()).map(([k, c]) => ({ key: k, summary: epicSummaryMap.get(k) ?? null, count: c })).sort((a, b) => b.count - a.count);
  }, [rawIssues]);
  const allTypes = useMemo(() => { const m = new Map<string, number>(); rawIssues.forEach(i => { m.set(i.issueType, (m.get(i.issueType) ?? 0) + 1); }); return Array.from(m.entries()).map(([t, c]) => ({ type: t, count: c })); }, [rawIssues]);

  const filterCats = useMemo((): FilterCategory[] => {
    const p = new Map<string, number>(), s = new Map<string, number>();
    rawIssues.forEach(i => { p.set(i.priority, (p.get(i.priority) ?? 0) + 1); s.set(i.status, (s.get(i.status) ?? 0) + 1); });
    return [
      { id: 'priority', label: 'Priority', options: Array.from(p.entries()).map(([v, c]) => ({ id: v, value: v, label: v, count: c })) },
      { id: 'status', label: 'Status', options: Array.from(s.entries()).map(([v, c]) => ({ id: v, value: v, label: v, count: c })) },
    ];
  }, [rawIssues]);

  const advCount = Object.values(advFilters).reduce((a, v) => a + v.length, 0);

  const filtered = useMemo(() => {
    let issues = rawIssues;
    if (debSearch.trim()) { const q = debSearch.trim().toLowerCase(); issues = issues.filter(i => i.summary.toLowerCase().includes(q) || i.issueKey.toLowerCase().includes(q) || (i.assigneeName ?? '').toLowerCase().includes(q)); }
    if (selAssignees.size > 0) issues = issues.filter(i => selAssignees.has(i.assigneeName || 'Unassigned'));
    if (selEpics.length > 0) issues = issues.filter(i => i.parentKey && selEpics.includes(i.parentKey));
    if (selTypes.length > 0) issues = issues.filter(i => selTypes.includes(i.issueType));
    if (advFilters.priority?.length) issues = issues.filter(i => advFilters.priority.includes(i.priority));
    if (advFilters.status?.length) issues = issues.filter(i => advFilters.status.includes(i.status));
    return issues;
  }, [rawIssues, debSearch, selAssignees, selEpics, selTypes, advFilters]);

  useEffect(() => {
    if (dragId || groupBy !== 'none') return;
    const m: ColMap = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    filtered.forEach(i => { const c = STATUS_TO_COL_ID.get(i.status.toLowerCase()); if (c && m[c]) m[c].push(i.id); });
    setColMap(m);
  }, [filtered, dragId, groupBy]);

  const groups = useMemo(() => groupBy === 'none' ? [] : groupIssues(filtered, groupBy), [filtered, groupBy]);
  const total = groupBy === 'none' ? Object.values(colMap).reduce((a, ids) => a + ids.length, 0) : filtered.length;

  const onDragStart = useCallback((e: DragStartEvent) => setDragId(String(e.active.id)), []);

  /* Parse composite droppable IDs: "groupKey::col-id" → colId, or plain col-id / issue-id */
  const resolveColId = useCallback((overId: string): string | null => {
    if (overId.includes('::')) return overId.split('::')[1] ?? null;
    if (COLUMN_ID_SET.has(overId)) return overId;
    return null;
  }, []);

  const onDragOver = useCallback((e: DragOverEvent) => {
    if (groupBy !== 'none') return; // grouped mode handles drop differently
    const aid = String(e.active.id), oid = e.over?.id ? String(e.over.id) : null;
    if (!oid) return;
    setColMap(prev => {
      const from = findCol(prev, aid); if (!from) return prev;
      const isCol = COLUMN_ID_SET.has(oid); const to = isCol ? oid : findCol(prev, oid);
      if (!to || from === to) return prev;
      const f = [...prev[from]], t = [...prev[to]], idx = f.indexOf(aid); if (idx < 0) return prev; f.splice(idx, 1);
      if (!isCol) { const oi = t.indexOf(oid); t.splice(oi >= 0 ? oi : 0, 0, aid); } else t.unshift(aid);
      return { ...prev, [from]: f, [to]: t };
    });
  }, [groupBy]);

  /* Persist status update to ph_issues AND catalyst_issues for canonical sync */
  const persistStatusChange = useCallback((issueId: string, newStatus: string) => {
    const issue = issuesById.get(issueId);
    if (!issue || issue.status === newStatus) return;
    // Optimistic local update
    issue.status = newStatus;
    // Persist to ph_issues
    Promise.resolve(supabase.from('ph_issues').update({ status: newStatus }).eq('id', issueId))
      .then(() => {
        // Also sync to catalyst_issues by issue_key for canonical status
        return Promise.resolve(
          supabase.from('catalyst_issues').update({ status: newStatus }).eq('issue_key', issue.issueKey)
        );
      })
      .then(() => qc.invalidateQueries({ queryKey: ['kanban-issues', key] }));
  }, [issuesById, key, qc]);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const aid = String(e.active.id), oid = e.over?.id ? String(e.over.id) : null;
    setDragId(null);
    if (!oid) return;

    if (groupBy !== 'none') {
      // Grouped mode: resolve target column from composite droppable ID
      const targetColId = resolveColId(oid);
      if (!targetColId) return;
      const newStatus = COL_PRIMARY_STATUS[targetColId];
      if (newStatus) persistStatusChange(aid, newStatus);
      return;
    }

    // Flat mode: reorder within column
    setColMap(prev => {
      const c = findCol(prev, aid); if (!c) return prev;
      if (COLUMN_ID_SET.has(oid)) return prev;
      const ids = prev[c], oi = ids.indexOf(aid), ni = ids.indexOf(oid);
      if (oi < 0 || ni < 0 || oi === ni) return prev;
      return { ...prev, [c]: arrayMove(ids, oi, ni) };
    });
    // Persist status change for flat mode
    setColMap(prev => {
      const c = findCol(prev, aid); if (!c) return prev;
      const ns = COL_PRIMARY_STATUS[c];
      if (ns) persistStatusChange(aid, ns);
      return prev;
    });
  }, [groupBy, resolveColId, persistStatusChange]);

  const dragIssue = dragId ? issuesById.get(dragId) : null;

  if (isLoading) return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#F4F5F7' }}>
      <div style={{ height: 44, borderBottom: '1px solid #DDDEE1', background: '#FFFFFF' }} />
      <div className="flex flex-1">{KANBAN_COLUMNS.map(c => <div key={c.id} className="flex-1" style={{ borderLeft: '1px solid #DDDEE1' }}><div style={{ height: 32, background: '#F4F5F7' }} /><div className="p-1 flex flex-col gap-1">{[0, 1, 2].map(i => <div key={i} className="h-14 rounded animate-pulse" style={{ background: '#EBECF0' }} />)}</div></div>)}</div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: '#F4F5F7' }}>
      {/* ── Page header ── */}
      <div className="flex items-center px-6" style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #EBECF0', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#172B4D', lineHeight: '24px', margin: 0, fontFamily: "'Sora', sans-serif" }}>Board</h1>
          <p style={{ fontSize: 12, color: '#6B778C', lineHeight: '16px', margin: 0, fontFamily: "'Inter', sans-serif" }}>Stories, Features &amp; Epics — grouped by Epic hierarchy</p>
        </div>
      </div>
      {/* ── Board chrome toolbar ── */}
      <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#FFFFFF', borderBottom: '1px solid #DDDEE1', flexShrink: 0 }}>
        {/* Search */}
        <div className="relative" style={{ width: 180 }}>
          <Search size={13} color="#94A3B8" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" placeholder="Search board" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 28, paddingLeft: 24, paddingRight: 6, border: '1px solid #DDDEE1', borderRadius: 3, fontSize: 12, color: '#172B4D', background: '#FAFBFC', outline: 'none', fontFamily: "'Inter', sans-serif" }} />
        </div>

        {/* Avatar stack assignee filter */}
        <AvatarStackFilter allAssignees={allAssignees} selected={selAssignees} onChange={setSelAssignees} avatarsByName={avatarsByName} />

        {/* Epic filter */}
        <EpicFilterDropdown epics={allEpics} selected={selEpics} onChange={setSelEpics} />

        {/* Type filter */}
        <TypeFilterDropdown types={allTypes} selected={selTypes} onChange={setSelTypes} />

        {/* Quick filters (priority/status) */}
        <div style={{ position: 'relative', zIndex: 50 }}>
          <FilterTriggerButton count={advCount} onClick={() => setFilterOpen(p => !p)} isOpen={filterOpen} />
          {filterOpen && <JiraBasicFilter categories={filterCats} selected={advFilters} onSelectionChange={(c, v) => setAdvFilters(p => ({ ...p, [c]: v }))} onClearAll={() => setAdvFilters({})} onClose={() => setFilterOpen(false)} />}
        </div>

        <div className="flex-1" />

        <span style={{ fontSize: 12, color: '#5E6C84' }}>{total} issues</span>

        {/* Group by */}
        <GroupByBtn value={groupBy} onChange={setGroupBy} />
      </div>

      {/* ── Board content ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {groupBy !== 'none' ? (
          /* ── GROUPED: swimlane rows with DnD ── */
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div style={{ background: '#FFFFFF' }}>
              {/* Column headers row (sticky) */}
              <div className="flex sticky top-0 z-20" style={{ background: '#F4F5F7', borderBottom: '1px solid #DDDEE1' }}>
                {KANBAN_COLUMNS.map((col, i) => {
                  const count = groups.reduce((sum, g) => {
                    return sum + g.issueIds.filter(id => {
                      const issue = issuesById.get(id);
                      if (!issue) return false;
                      return STATUS_TO_COL_ID.get(issue.status.toLowerCase()) === col.id;
                    }).length;
                  }, 0);
                  return (
                    <div key={col.id} className="flex items-center gap-1 px-2" style={{ flex: '1 1 0', minWidth: 180, height: 32, borderLeft: i === 0 ? 'none' : '1px solid #DDDEE1' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#5E6C84', letterSpacing: '0.04em' }}>{col.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#5E6C84', background: 'rgba(9,30,66,.08)', borderRadius: 10, padding: '0 5px', lineHeight: '16px', minWidth: 16, textAlign: 'center' }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Swimlane rows */}
              {groups.map(g => (
                <SwimlaneRow key={g.groupKey} group={g} mode={groupBy} issuesById={issuesById} avatarsByName={avatarsByName} onCardClick={id => setSelIssueId(id)} defaultOpen={true} />
              ))}
              {groups.length === 0 && <div className="flex items-center justify-center py-12" style={{ color: '#94A3B8', fontSize: 13 }}>No issues match filters</div>}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragIssue ? <OverlayCard issue={dragIssue} avatarUrl={dragIssue.assigneeName ? avatarsByName.get(dragIssue.assigneeName.toLowerCase()) : null} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          /* ── FLAT BOARD with DnD ── */
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div className="flex h-full">
              {KANBAN_COLUMNS.map((col, i) => (
                <DroppableColumn key={col.id} column={col} issueIds={colMap[col.id] ?? []} issuesById={issuesById} avatarsByName={avatarsByName} onCardClick={id => setSelIssueId(id)} isFirst={i === 0} />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragIssue ? <OverlayCard issue={dragIssue} avatarUrl={dragIssue.assigneeName ? avatarsByName.get(dragIssue.assigneeName.toLowerCase()) : null} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {selIssueId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter isOpen={!!selIssueId} onClose={() => setSelIssueId(null)} itemId={selIssueId} projectId={projMeta?.id ?? ''} projectKey={key} />
        </Suspense>
      )}
    </div>
  );
}
