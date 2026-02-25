/**
 * R360 Member Detail Page
 * Route: /project-hub/resources/:resourceId
 * Contains: Profile Header, Week Nav, Ring/Chronology/Board views, Detail Panel
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useR360Overview, useR360WorkItems, useR360Siblings } from '@/hooks/useR360';
import { R360_DEPT_COLORS, R360_PROJECT_COLORS } from '@/constants/r360';
import { initials, slugify, ageBarPercent, ageBarColor, formatRelativeDate, formatDate } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, X, ChevronDown } from 'lucide-react';
import type { R360WorkItem, R360ViewType, R360Filters } from '@/types/r360';
import '@/styles/r360.css';

// ── Week helpers ──
function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day + offset * 7);
  sun.setHours(0, 0, 0, 0);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  sat.setHours(23, 59, 59, 999);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : offset === 1 ? 'Next Week' : `Week ${offset > 0 ? '+' : ''}${offset}`;
  const range = `${M[sun.getMonth()]} ${sun.getDate()} – ${M[sat.getMonth()]} ${sat.getDate()}, ${sat.getFullYear()}`;
  return { start: sun, end: sat, label, range };
}

// ── Status pill component ──
function StatusPill({ label, color, bg, dot }: { label: string; color: string; bg: string; dot: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, background: bg, color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: dot }} />
      {label}
    </span>
  );
}

// ── Project tag ──
function ProjTag({ projectKey }: { projectKey: string }) {
  const bg = R360_PROJECT_COLORS[projectKey] || '#64748B';
  return <span className="r3-proj-tag" style={{ background: bg }}>{projectKey}</span>;
}

// ── Age badge ──
function AgeBadge({ days, ageClass }: { days: number; ageClass: string }) {
  return <span className={`r3-age r3-age--${ageClass}`} style={{ fontSize: 12 }}>{days}d</span>;
}

// ── Priority dot color ──
function priorityDotColor(p: string) {
  const l = p?.toLowerCase();
  if (l === 'highest' || l === 'critical') return '#EF4444';
  if (l === 'high') return '#F97316';
  if (l === 'medium') return '#D97706';
  return '#94A3B8';
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function R360MemberDetail() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as R360ViewType) || 'ring';
  const [view, setView] = useState<R360ViewType>(initialView);
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<R360WorkItem | null>(null);

  const { data: overview, isLoading: overviewLoading } = useR360Overview(resourceId || '');

  const filters: R360Filters = useMemo(() => {
    const f: R360Filters = {};
    if (statusFilter) f.status_categories = [statusFilter];
    if (searchTerm.trim()) f.search = searchTerm;
    return f;
  }, [statusFilter, searchTerm]);

  const { data: workItems = [], isLoading: itemsLoading } = useR360WorkItems(resourceId || '', filters);

  const week = getWeekRange(weekOffset);

  // Filter items by week for ring/board (chronology shows all with date grouping)
  const weekItems = useMemo(() => {
    if (view === 'chronology') return workItems;
    return workItems.filter(item => {
      const d = new Date(item.updated_at);
      return d >= week.start && d <= week.end;
    });
  }, [workItems, week.start, week.end, view]);

  // Status counts
  const counts = useMemo(() => {
    const c = { all: weekItems.length, to_do: 0, in_progress: 0, in_qa: 0, done: 0, blocked: 0 };
    weekItems.forEach(i => { (c as any)[i.status_category] = ((c as any)[i.status_category] || 0) + 1; });
    return c;
  }, [weekItems]);

  // Avg age of open items
  const avgAge = useMemo(() => {
    const openItems = workItems.filter(i => i.status_category !== 'done');
    if (openItems.length === 0) return 0;
    return Math.round(openItems.reduce((s, i) => s + (i.age_days || 0), 0) / openItems.length);
  }, [workItems]);

  // Close panel on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (overviewLoading) {
    return (
      <div id="r360-root">
        <div className="r3-page">
          <div className="r3-skeleton" style={{ height: 120, marginBottom: 20 }} />
          <div className="r3-skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div id="r360-root">
        <div className="r3-page"><div className="r3-empty">Resource not found.</div></div>
      </div>
    );
  }

  const deptColor = R360_DEPT_COLORS[overview.department] || '#64748B';

  return (
    <div id="r360-root">
      <div className="r3-page">
        {/* ── Profile Header ── */}
        <div className="r3-profile">
          <div className="r3-profile-top">
            <div className="r3-profile-avatar" style={{ background: `linear-gradient(135deg, ${deptColor}, #0D9488)` }}>
              {overview.avatar_url ? (
                <img src={overview.avatar_url} alt={overview.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
              <span style={{ position: 'absolute', pointerEvents: 'none', ...(overview.avatar_url ? { display: 'none' } : {}) }}>{initials(overview.name)}</span>
            </div>
            <div>
              <div className="r3-profile-name">{overview.name}</div>
              <div className="r3-profile-role">{overview.role_name} · {overview.department}</div>
            </div>
            <div className="r3-kpis">
              <div className="r3-kpi">
                <div className="r3-kpi-val">{overview.total_items}</div>
                <div className="r3-kpi-label">Total</div>
              </div>
              <div className="r3-kpi" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                <div className="r3-kpi-val" style={{ color: '#16A34A' }}>{overview.total_items > 0 ? Math.round((overview.done_items / overview.total_items) * 100) : 0}%</div>
                <div className="r3-kpi-label">Closure</div>
              </div>
              <div className="r3-kpi" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                <div className="r3-kpi-val" style={{ color: '#EF4444' }}>{overview.open_items}</div>
                <div className="r3-kpi-label">Pending</div>
              </div>
              <div className="r3-kpi">
                <div className="r3-kpi-val">{avgAge}d</div>
                <div className="r3-kpi-label">Avg Age</div>
              </div>
              <div className="r3-kpi">
                <div className="r3-kpi-val">{overview.stale_items}</div>
                <div className="r3-kpi-label">Stale</div>
              </div>
            </div>
          </div>

          {/* ── Tabs + Actions ── */}
          <div className="r3-tabs">
            {(['ring', 'chronology', 'board'] as R360ViewType[]).map(v => (
              <button key={v} className={`r3-tab ${view === v ? 'r3-tab--active' : ''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className="r3-tab-spacer" />
            <button className="r3-btn" onClick={() => navigate('/project-hub/resources')}>
              <ChevronLeft size={14} /> Back
            </button>
            <button className="r3-btn">
              <Calendar size={14} /> Q1-2026
            </button>
            <button className="r3-btn r3-btn--primary">
              <Sparkles size={14} /> Intelligence
            </button>
          </div>
        </div>

        {/* ── Week Navigation ── */}
        <div className="r3-weeknav">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>ACTIVE</span>
          <button className={`r3-chip ${!statusFilter ? 'r3-chip--active' : ''}`} onClick={() => setStatusFilter(null)}>All ({counts.all})</button>
          <button className={`r3-chip ${statusFilter === 'to_do' ? 'r3-chip--active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'to_do' ? null : 'to_do')}>To Do ({counts.to_do})</button>
          <button className={`r3-chip ${statusFilter === 'in_progress' ? 'r3-chip--active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'in_progress' ? null : 'in_progress')}>In Progress ({counts.in_progress})</button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <Calendar size={14} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{week.label}</span>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{week.range}</span>
            <button className="r3-weeknav-arrow" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={14} /></button>
            <button className="r3-weeknav-arrow" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={14} /></button>
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>Q Search… (/)</span>
          <span className="r3-weeknav-count">{weekItems.length} items · Page 1/{Math.max(1, Math.ceil(weekItems.length / 8))}</span>
          <button className="r3-weeknav-arrow"><ChevronLeft size={14} /></button>
          <button className="r3-weeknav-arrow"><ChevronRight size={14} /></button>
        </div>

        {/* ── Views ── */}
        {itemsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="r3-skeleton" style={{ height: 60 }} />)}
          </div>
        ) : weekItems.length === 0 ? (
          <div className="r3-empty">No work items found for this period.</div>
        ) : (
          <>
            {view === 'ring' && <RingView items={weekItems} name={overview.name} role={overview.role_name} avatarUrl={overview.avatar_url} onSelect={setSelectedItem} selected={selectedItem} />}
            {view === 'chronology' && <ChronologyView items={weekItems} onSelect={setSelectedItem} />}
            {view === 'board' && <BoardView items={weekItems} onSelect={setSelectedItem} />}
          </>
        )}

        {/* ── Detail Panel ── */}
        {selectedItem && (
          <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} onSelectItem={setSelectedItem} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// RING VIEW
// ═══════════════════════════════════════════
function RingView({ items, name, role, avatarUrl, onSelect, selected }: {
  items: R360WorkItem[]; name: string; role: string; avatarUrl?: string | null;
  onSelect: (i: R360WorkItem) => void; selected: R360WorkItem | null;
}) {
  const nonDone = items.filter(i => i.status_category !== 'done');
  const doneCount = items.filter(i => i.status_category === 'done').length;
  const positions = [
    { x: 3, y: 3 }, { x: 36, y: 0 }, { x: 67, y: 5 }, { x: 0, y: 40 },
    { x: 70, y: 36 }, { x: 5, y: 72 }, { x: 36, y: 78 }, { x: 67, y: 70 },
  ];
  const visible = nonDone.slice(0, 8);

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'blocked' ? '#EF4444' : '#D97706';

  return (
    <div className="r3-ring-canvas">
      {/* SVG Spokes */}
      <svg className="r3-ring-spokes" viewBox="0 0 100 100" preserveAspectRatio="none">
        {visible.map((_, i) => {
          const p = positions[i];
          return (
            <line key={i} x1="50" y1="49" x2={p.x + 10} y2={p.y + 9}
              stroke="#94A3B8" strokeWidth="0.3" strokeDasharray="1.2 0.8" strokeLinecap="round" />
          );
        })}
      </svg>

      {/* Spoke labels */}
      {visible.map((item, i) => {
        const p = positions[i];
        const mx = (50 + p.x + 10) / 2;
        const my = (49 + p.y + 9) / 2;
        return (
          <div key={`label-${i}`} className="r3-spoke-label" style={{ left: `${mx}%`, top: `${my}%` }}>
            {item.age_days}d ago
          </div>
        );
      })}

      {/* Center */}
      <div className="r3-ring-center">
        <div className="r3-ring-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : null}
          <span style={{ position: 'absolute', pointerEvents: 'none', ...(avatarUrl ? { display: 'none' } : {}) }}>{initials(name)}</span>
        </div>
        <div className="r3-ring-name">{name}</div>
        <div className="r3-ring-role">{role}</div>
      </div>

      {/* Orbital Cards */}
      {visible.map((item, i) => {
        const p = positions[i];
        const isSelected = selected?.id === item.id;
        return (
          <div
            key={item.id}
            className={`r3-orbital-card ${isSelected ? 'r3-orbital-card--selected' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onSelect(item)}
          >
            <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: accentColor(item.status_category) }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="r3-type-badge">{getJiraIcon(item.item_type)} {item.item_type}</span>
              <span style={{ fontSize: 10.5, color: '#334155' }}>{item.priority}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="r3-card-key r3-card-key--sm">{item.item_key}</span>
              <ProjTag projectKey={item.project_key} />
              <span style={{ marginLeft: 'auto' }}><AgeBadge days={item.age_days} ageClass={item.age_class} /></span>
            </div>
            <div className="r3-card-title">{item.title}</div>
            <div style={{ marginTop: 6 }}>
              <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
            </div>
          </div>
        );
      })}

      {/* Completed Badge */}
      {doneCount > 0 && (
        <div className="r3-completed-badge">
          <div className="r3-completed-circle">{doneCount}</div>
          <div className="r3-completed-text">Completed</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CHRONOLOGY VIEW
// ═══════════════════════════════════════════
function ChronologyView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: R360WorkItem[] }>();
    items.forEach(item => {
      if (!map.has(item.group_date)) map.set(item.group_date, { label: item.date_label, items: [] });
      map.get(item.group_date)!.items.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div className="r3-chrono">
      <div className="r3-chrono-line" />
      {groups.map(([dateKey, group]) => {
        const isCollapsed = collapsed.has(dateKey);
        const dotClass = dateKey === todayStr ? 'r3-date-dot--today' : dateKey === yesterdayStr ? 'r3-date-dot--yesterday' : 'r3-date-dot--other';
        const statusDist = { done: 0, in_progress: 0, to_do: 0, blocked: 0 };
        group.items.forEach(i => {
          if (i.status_category === 'done') statusDist.done++;
          else if (i.status_category === 'in_progress' || i.status_category === 'in_qa') statusDist.in_progress++;
          else if (i.status_category === 'blocked') statusDist.blocked++;
          else statusDist.to_do++;
        });
        const total = group.items.length;

        return (
          <div key={dateKey} className="r3-date-group">
            <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(dateKey) ? n.delete(dateKey) : n.add(dateKey); return n; })}>
              <span className={`r3-date-dot ${dotClass}`} />
              <span className="r3-date-label">{group.label}</span>
              <span className="r3-date-count">{total} items</span>
              <div className="r3-minibar">
                {statusDist.done > 0 && <div style={{ width: `${statusDist.done / total * 100}%`, background: '#16A34A' }} />}
                {statusDist.in_progress > 0 && <div style={{ width: `${statusDist.in_progress / total * 100}%`, background: '#2563EB' }} />}
                {statusDist.to_do > 0 && <div style={{ width: `${statusDist.to_do / total * 100}%`, background: '#D97706' }} />}
                {statusDist.blocked > 0 && <div style={{ width: `${statusDist.blocked / total * 100}%`, background: '#EF4444' }} />}
              </div>
              <ChevronDown size={16} className={`r3-date-chevron ${isCollapsed ? 'r3-date-chevron--collapsed' : ''}`} />
            </div>
            {!isCollapsed && (
              <div className="r3-chrono-items">
                {group.items.map(item => (
                  <div key={item.id} className="r3-chrono-card" onClick={() => onSelect(item)}>
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: accentColor(item.status_category) }} />
                    <div style={{ width: 24, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{getJiraIcon(item.item_type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className="r3-card-key">{item.item_key}</span>
                        <ProjTag projectKey={item.project_key} />
                      </div>
                      <div className="r3-card-title r3-card-title--lg">{item.title}</div>
                      {item.parent_key && (
                        <div className="r3-parent-ref" style={{ marginTop: 4 }}>
                          ↳ <span className="r3-parent-key">{item.parent_key}</span> {item.parent_title}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, color: '#334155' }}>{item.assignee_name}</span>
                        <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
                      </div>
                      <AgeBadge days={item.age_days} ageClass={item.age_class} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// BOARD VIEW
// ═══════════════════════════════════════════
function BoardView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const columns = [
    { key: 'to_do', label: 'TO DO', color: '#D97706', items: items.filter(i => i.status_category === 'to_do' || i.status_category === 'blocked') },
    { key: 'in_progress', label: 'IN PROGRESS', color: '#2563EB', items: items.filter(i => i.status_category === 'in_progress' || i.status_category === 'in_qa') },
    { key: 'done', label: 'DONE', color: '#16A34A', items: items.filter(i => i.status_category === 'done') },
  ];

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div className="r3-board">
      {columns.map(col => (
        <div key={col.key}>
          <div className="r3-board-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
            <span className="r3-board-col-dot" style={{ background: col.color }} />
            <span className="r3-board-col-title">{col.label}</span>
            <span className="r3-board-col-count" style={{ background: col.color }}>{col.items.length}</span>
          </div>
          <div className="r3-board-cards">
            {col.items.map(item => (
              <div key={item.id} className="r3-board-card" onClick={() => onSelect(item)}>
                <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: accentColor(item.status_category) }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="r3-card-key">{item.item_key}</span>
                  <ProjTag projectKey={item.project_key} />
                  <span style={{ marginLeft: 'auto' }}><AgeBadge days={item.age_days} ageClass={item.age_class} /></span>
                </div>
                <div className="r3-card-title" style={{ fontSize: 13.5, marginBottom: 8 }}>{item.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="r3-priority-dot" style={{ background: priorityDotColor(item.priority) }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{item.priority}</span>
                  </div>
                  <span style={{ fontSize: 12.5, color: '#334155' }}>{item.assignee_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════
function DetailPanel({ item, onClose, onSelectItem }: {
  item: R360WorkItem; onClose: () => void; onSelectItem: (i: R360WorkItem) => void;
}) {
  const { data: siblings = [] } = useR360Siblings(item.parent_key);
  const doneCount = siblings.filter((s: any) => s.status_category === 'done').length;

  return (
    <>
      <div className="r3-overlay" onClick={onClose} />
      <div className="r3-panel r3-panel--open">
        {/* Header */}
        <div className="r3-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="r3-card-key" style={{ fontSize: 14 }}>{item.item_key}</span>
            <button className="r3-panel-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div className="r3-panel-pills">
            <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#334155' }}>{item.priority}</span>
            <span className="r3-type-badge">{getJiraIcon(item.item_type)} {item.item_type}</span>
            <ProjTag projectKey={item.project_key} />
          </div>
          <div className="r3-panel-title">{item.title}</div>
        </div>

        {/* Body */}
        <div className="r3-panel-body">
          {/* Meta Grid */}
          <div className="r3-meta">
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Project</div>
              <div className="r3-meta-value">{item.project_name}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Reporter</div>
              <div className="r3-meta-value">{item.reporter_name || '—'}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Assigned</div>
              <div className="r3-meta-value">{formatRelativeDate(item.created_at)}</div>
              <div style={{ fontSize: 11, color: '#334155' }}>{formatDate(item.created_at)}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Days Sitting</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`r3-age r3-age--${item.age_class}`} style={{ fontSize: 13, fontWeight: 600 }}>{item.age_days}</span>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${ageBarPercent(item.age_days)}%`, height: '100%', background: ageBarColor(item.age_days), borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Release</div>
              <div className="r3-meta-value">
                {item.fix_version ? item.fix_version
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '—'}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Due</div>
              <div className="r3-meta-value">
                {item.due_date ? formatDate(item.due_date)
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '—'}
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          {item.parent_key && (
            <div className="r3-hierarchy">
              <div className="r3-hierarchy-title">Hierarchy</div>
              <div className="r3-hier-item" style={{ padding: '6px 8px' }}>
                {getJiraIcon('Epic')}
                <span className="r3-card-key r3-card-key--sm">{item.parent_key}</span>
                <span style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
              </div>
              <div className="r3-hier-connector">↳</div>
              <div className="r3-hier-item r3-hier-item--current">
                {getJiraIcon(item.item_type)}
                <span className="r3-card-key r3-card-key--sm">{item.item_key}</span>
                <span style={{ fontSize: 12, color: '#020617', fontWeight: 500 }}>{item.title}</span>
              </div>
            </div>
          )}

          {/* Siblings */}
          {item.parent_key && siblings.length > 0 && (
            <div className="r3-siblings">
              <div className="r3-siblings-header">
                <span className="r3-siblings-title">Siblings</span>
                <span className="r3-siblings-count">{doneCount}/{siblings.length} done</span>
              </div>
              {siblings.map((s: any) => (
                <div
                  key={s.id}
                  className={`r3-sibling-row ${s.item_key === item.item_key ? 'r3-sibling-row--current' : ''}`}
                  onClick={() => {
                    if (s.item_key !== item.item_key) {
                      // Create a minimal work item for navigation
                      onSelectItem({
                        ...item,
                        id: s.id,
                        item_key: s.item_key,
                        title: s.title,
                        status_label: s.status_label,
                        status_color: s.status_color,
                        status_bg: s.status_bg,
                        status_dot: s.status_dot,
                        status_category: s.status_category,
                        age_days: s.age_days,
                        age_class: s.age_class,
                      });
                    }
                  }}
                >
                  <span className="r3-card-key r3-card-key--sm" style={{ width: 72, flexShrink: 0 }}>{s.item_key}</span>
                  <StatusPill label={s.status_label} color={s.status_color} bg={s.status_bg} dot={s.status_dot} />
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                  <AgeBadge days={s.age_days} ageClass={s.age_class} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
