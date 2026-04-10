import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import AgeingSkeleton from './AgeingSkeleton';

/* ═══════════════════════════════════════
   Ageing Tab — Grouped by Time Period
   V12 Hybrid Precision + Jira Solid Pills
   ═══════════════════════════════════════ */

type ItemType = 'Production Incident' | 'Story' | 'QA Bug' | 'Feature' | 'Sub-task';
type StatusType = 'TODO' | 'IN PROGRESS';

interface AgeingItem {
  id: string;
  jira_key: string;
  item_type: ItemType;
  summary: string;
  status: StatusType;
  days_assigned: number;
}

type TimeGroup = 'critical' | 'thisWeek' | 'thisMonth' | 'quarter' | 'older';

const SLA_THRESHOLDS: Record<ItemType, number> = {
  'Production Incident': 1,
  'QA Bug': 3,
  'Sub-task': 5,
  'Story': 10,
  'Feature': 15,
};

const TYPE_FILTER_MAP: Record<string, ItemType[]> = {
  All: [],
  Story: ['Story'],
  Bug: ['QA Bug'],
  Incident: ['Production Incident'],
};

const GROUP_CONFIG: Record<TimeGroup, { label: string; defaultOpen: boolean }> = {
  critical:  { label: 'CRITICAL — OVERDUE SLA', defaultOpen: true },
  thisWeek:  { label: 'THIS WEEK (1–7 DAYS)', defaultOpen: true },
  thisMonth: { label: 'THIS MONTH (8–30 DAYS)', defaultOpen: true },
  quarter:   { label: '1–3 MONTHS', defaultOpen: false },
  older:     { label: '3+ MONTHS', defaultOpen: false },
};

const GROUP_ORDER: TimeGroup[] = ['critical', 'thisWeek', 'thisMonth', 'quarter', 'older'];

/* ── Canonical Jira Work Item SVG Icons ── */
function TypeIcon({ type }: { type: ItemType }) {
  const size = 16;
  const icons: Record<ItemType, JSX.Element> = {
    Story: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <title>Story</title>
        <path fill="#63BA3C" fillRule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M15.647,19.515 L16.937,17.987 L12,13.82 L7.061,17.987 L7,18.153 L7,6.688 C7,6.348 7.412,6 8,6 L16,6 C16.587,6 17,6.349 17,6.688 L17,18.153 Z" />
      </svg>
    ),
    Feature: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <title>Feature</title>
        <path fill="#63BA3C" fillRule="evenodd" d="M13,11 L13,5 C13,4.448 12.552,4 12,4 C11.448,4 11,4.448 11,5 L11,11 L5,11 C4.448,11 4,11.448 4,12 C4,12.552 4.448,13 5,13 L11,13 L11,19 C11,19.552 11.448,20 12,20 C12.552,20 13,19.552 13,19 L13,13 L19,13 C19.552,13 20,12.552 20,12 C20,11.448 19.552,11 19,11 Z M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z" />
      </svg>
    ),
    'Sub-task': (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <title>Sub-task</title>
        <path fill="#4BADE8" fillRule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M6,4 C4.895,4 4,4.895 4,6 L4,18 C4,19.105 4.895,20 6,20 L18,20 C19.105,20 20,19.105 20,18 L20,6 C20,4.895 19.105,4 18,4 L6,4 Z M6,6 L18,6 L18,18 L6,18 Z" />
      </svg>
    ),
    'QA Bug': (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <title>QA Bug</title>
        <path fill="#E5493A" fillRule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,17 C14.761,17 17,14.761 17,12 C17,9.239 14.761,7 12,7 C9.239,7 7,9.239 7,12 C7,14.761 9.239,17 12,17 Z" />
      </svg>
    ),
    'Production Incident': (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <title>Production Incident</title>
        <path fill="#E5493A" fillRule="evenodd" d="M3,0 L21,0 C22.657,0 24,1.343 24,3 L24,21 C24,22.657 22.657,24 21,24 L3,24 C1.343,24 0,22.657 0,21 L0,3 C0,1.343 1.343,0 3,0 Z M12,4 C11.448,4 11,4.448 11,5 L11,14 C11,14.552 11.448,15 12,15 C12.552,15 13,14.552 13,14 L13,5 C13,4.448 12.552,4 12,4 Z M12,17 C11.448,17 11,17.448 11,18 C11,18.552 11.448,19 12,19 C12.552,19 13,18.552 13,18 C13,17.448 12.552,17 12,17 Z" />
      </svg>
    ),
  };
  return icons[type] || null;
}

function StatusLozenge({ status }: { status: StatusType }) {
  /* 3-color pale lozenge guardrail — Grey for TODO, Blue for IN PROGRESS */
  const isActive = status === 'IN PROGRESS';
  const bg = isActive ? '#DEEBFF' : '#DFE1E6';
  const fg = isActive ? '#0747A6' : '#253858';
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', borderRadius: 3, padding: '0 7px',
      background: bg, color: fg, whiteSpace: 'nowrap',
      fontFamily: 'Inter, sans-serif',
    }}>
      {status}
    </span>
  );
}

function mapIssueType(raw: string): ItemType {
  const v = raw.toLowerCase();
  if (v.includes('incident')) return 'Production Incident';
  if (v.includes('bug')) return 'QA Bug';
  if (v.includes('sub')) return 'Sub-task';
  if (v.includes('feature') || v.includes('new feature')) return 'Feature';
  return 'Story';
}

function mapStatusCategory(statusCategory: string): StatusType | null {
  const v = statusCategory.toLowerCase().replace(/[\s_-]/g, '');
  if (v === 'todo' || v === 'new') return 'TODO';
  if (v === 'inprogress') return 'IN PROGRESS';
  if (v === 'done') return null;
  return 'TODO';
}

function classifyTimeGroup(item: AgeingItem): TimeGroup {
  const burnPct = (item.days_assigned / SLA_THRESHOLDS[item.item_type]) * 100;
  if (burnPct > 80) return 'critical';
  if (item.days_assigned <= 7) return 'thisWeek';
  if (item.days_assigned <= 30) return 'thisMonth';
  if (item.days_assigned <= 90) return 'quarter';
  return 'older';
}

/* ── Filter Pill (Outline at rest, subtle tint when active) ── */
const PILL_ACTIVE: Record<string, { bg: string; border: string; text: string; countBg: string }> = {
  All:      { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF', countBg: '#DBEAFE' },
  Story:    { bg: '#F0FDF4', border: '#16A34A', text: '#166534', countBg: '#DCFCE7' },
  Bug:      { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', countBg: '#FEE2E2' },
  Incident: { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', countBg: '#FEE2E2' },
};

function FilterPill({ label, isActive, count, onClick }: {
  label: string; isActive: boolean; count: number; onClick: () => void;
}) {
  const active = PILL_ACTIVE[label] || PILL_ACTIVE.All;
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${isActive ? active.border : '#CBD5E1'}`,
        background: isActive ? active.bg : 'transparent',
        color: isActive ? active.text : '#64748B',
        borderRadius: 16, padding: '3px 10px',
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 120ms ease',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {label}
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: isActive ? active.countBg : '#F1F5F9',
        color: isActive ? active.text : '#64748B',
        borderRadius: 8, padding: '1px 5px',
        minWidth: 18, textAlign: 'center',
      }}>
        {count}
      </span>
    </button>
  );
}

/* ── Group Header (collapsible) ── */
function GroupHeader({ label, count, isOpen, onToggle, accentColor }: {
  label: string; count: number; isOpen: boolean; onToggle: () => void; accentColor: string;
}) {
  return (
    <tr>
      <td colSpan={5} style={{ padding: 0 }}>
        <button
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', border: 'none', cursor: 'pointer',
            background: 'var(--cp-surface, #F8FAFC)',
            borderBottom: '0.75px solid var(--cp-border, #E2E8F0)',
            borderLeft: `3px solid ${accentColor}`,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isOpen ? <ChevronDown size={13} color="#64748B" /> : <ChevronRight size={13} color="#64748B" />}
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {label}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#FFFFFF',
            background: accentColor, borderRadius: 3,
            padding: '1px 6px', minWidth: 20, textAlign: 'center',
          }}>
            {count}
          </span>
        </button>
      </td>
    </tr>
  );
}

/* ── Ageing Item Row ── */
function AgeingRow({ item }: { item: AgeingItem }) {
  const sla = SLA_THRESHOLDS[item.item_type];
  const burnPct = (item.days_assigned / sla) * 100;
  const daysColor = burnPct > 80 ? '#EF4444' : burnPct >= 50 ? '#F59E0B' : '#22C55E';

  return (
    <tr
      style={{
        height: 36, maxHeight: 36,
        borderBottom: '0.75px solid var(--cp-border-lt, #F1F5F9)',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <td style={{ ...tdStyle, paddingLeft: 14 }}>
        <TypeIcon type={item.item_type} />
      </td>
      <td style={tdStyle}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11.5, fontWeight: 700, color: 'var(--cp-primary, #2563EB)',
          cursor: 'pointer',
        }}>
          {item.jira_key}
        </span>
      </td>
      <td style={{
        ...tdStyle, fontSize: 12, fontWeight: 500,
        color: 'var(--cp-ink-1, #0F172A)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.summary}
      </td>
      <td style={tdStyle}>
        <StatusLozenge status={item.status} />
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 14, verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: daysColor }}>
            {item.days_assigned}d
          </span>
          {burnPct > 80 && (
            <span style={{
              fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '1px 5px',
              background: '#FEE2E2', color: '#991B1B',
            }}>
              Overdue
            </span>
          )}
          {burnPct >= 50 && burnPct <= 80 && (
            <span style={{
              fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '1px 5px',
              background: '#FEF3C7', color: '#92400E',
            }}>
              Watch
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Count badge hook (exported) ── */
export function useAgeingCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: identityRows } = await supabase
        .from('jira_identity_map')
        .select('jira_account_id')
        .eq('catalyst_user_id', user.id)
        .limit(1);
      if (cancelled || !identityRows?.length) return;
      const jiraAccountId = identityRows[0].jira_account_id;
      const { count: total } = await supabase
        .from('ph_issues')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_account_id', jiraAccountId)
        .neq('status_category', 'done')
        .is('deleted_at', null);
      if (!cancelled) setCount(total ?? 0);
    })();
    return () => { cancelled = true; };
  }, []);
  return count;
}

const GROUP_ACCENT: Record<TimeGroup, string> = {
  critical:  '#EF4444',
  thisWeek:  '#0052CC',
  thisMonth: '#F59E0B',
  quarter:   '#94A3B8',
  older:     '#64748B',
};

/* ── Main Component ── */
export default function AgeingTab() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortAsc, setSortAsc] = useState(false);
  const [items, setItems] = useState<AgeingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<TimeGroup, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    GROUP_ORDER.forEach(g => { initial[g] = GROUP_CONFIG[g].defaultOpen; });
    return initial as Record<TimeGroup, boolean>;
  });
  const [visibleCount, setVisibleCount] = useState(40);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data: identityRows } = await supabase
        .from('jira_identity_map')
        .select('jira_account_id')
        .eq('catalyst_user_id', user.id)
        .limit(1);

      if (cancelled || !identityRows?.length) { setLoading(false); return; }
      const jiraAccountId = identityRows[0].jira_account_id;

      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, issue_type, summary, status, status_category, jira_created_at')
        .eq('assignee_account_id', jiraAccountId)
        .neq('status_category', 'done')
        .is('deleted_at', null)
        .order('jira_created_at', { ascending: false });

      if (cancelled) return;

      const mapped: AgeingItem[] = (data ?? [])
        .map(row => {
          const status = mapStatusCategory(row.status_category ?? '');
          if (!status) return null;
          const createdAt = row.jira_created_at ? new Date(row.jira_created_at).getTime() : Date.now();
          const daysAssigned = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)));
          return {
            id: row.id,
            jira_key: row.issue_key,
            item_type: mapIssueType(row.issue_type),
            summary: row.summary,
            status,
            days_assigned: daysAssigned,
          } as AgeingItem;
        })
        .filter(Boolean) as AgeingItem[];

      setItems(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...items];
    const typeFilter = TYPE_FILTER_MAP[activeFilter];
    if (typeFilter && typeFilter.length > 0) {
      list = list.filter(i => typeFilter.includes(i.item_type));
    }
    list.sort((a, b) => {
      const burnA = (a.days_assigned / SLA_THRESHOLDS[a.item_type]) * 100;
      const burnB = (b.days_assigned / SLA_THRESHOLDS[b.item_type]) * 100;
      return sortAsc ? burnA - burnB : burnB - burnA;
    });
    return list;
  }, [items, activeFilter, sortAsc]);

  // Group items
  const grouped = useMemo(() => {
    const groups: Record<TimeGroup, AgeingItem[]> = {
      critical: [], thisWeek: [], thisMonth: [], quarter: [], older: [],
    };
    filtered.forEach(item => {
      const g = classifyTimeGroup(item);
      groups[g].push(item);
    });
    return groups;
  }, [filtered]);

  // Type counts for pills
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    Object.keys(TYPE_FILTER_MAP).forEach(key => {
      if (key === 'All') return;
      const types = TYPE_FILTER_MAP[key];
      counts[key] = items.filter(i => types.includes(i.item_type)).length;
    });
    return counts;
  }, [items]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => Math.min(prev + 30, filtered.length));
    }
  }, [filtered.length]);

  const toggleGroup = (g: TimeGroup) => {
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }));
  };

  const filters = ['All', 'Story', 'Bug', 'Incident'];

  // Summary stats
  const overduePct = useMemo(() => {
    if (filtered.length === 0) return 0;
    const overdue = filtered.filter(i => (i.days_assigned / SLA_THRESHOLDS[i.item_type]) * 100 > 80).length;
    return Math.round((overdue / filtered.length) * 100);
  }, [filtered]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '0.75px solid var(--cp-border-lt, #F1F5F9)',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--cp-ink-3, #64748B)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Ageing — Assigned to You
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {filters.map(f => (
            <FilterPill
              key={f}
              label={f}
              isActive={activeFilter === f}
              count={typeCounts[f] || 0}
              onClick={() => setActiveFilter(f)}
            />
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'flex', gap: 16, padding: '8px 14px',
          borderBottom: '0.75px solid var(--cp-border-lt, #F1F5F9)',
          background: 'var(--cp-surface, #F8FAFC)',
        }}>
          <StatChip label="Total" value={filtered.length} color="#475569" />
          <StatChip label="Critical" value={grouped.critical.length} color="#EF4444" />
          <StatChip label="This Week" value={grouped.thisWeek.length} color="#0052CC" />
          <StatChip label="This Month" value={grouped.thisMonth.length} color="#F59E0B" />
          <StatChip label="Overdue" value={`${overduePct}%`} color={overduePct > 50 ? '#EF4444' : '#F59E0B'} />
        </div>
      )}

      {/* Table */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {loading ? (
          <AgeingSkeleton />
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '48px 24px', gap: 8,
          }}>
            <span style={{ fontSize: 13, color: 'var(--cp-ink-3, #64748B)' }}>
              No ageing items assigned to you
            </span>
            <span style={{ fontSize: 11, color: 'var(--cp-ink-4, #94A3B8)' }}>
              Open work items will appear here with SLA tracking
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 26 }} />
              <col style={{ width: 96 }} />
              <col />
              <col style={{ width: 92 }} />
              <col style={{ width: 72 }} />
            </colgroup>
            <thead>
              <tr style={{
                background: 'var(--cp-surface, #F8FAFC)',
                borderBottom: '0.75px solid var(--cp-border, #E2E8F0)',
              }}>
                <th style={{ ...thStyle, paddingLeft: 14 }} />
                <th style={thStyle}>KEY</th>
                <th style={thStyle}>SUMMARY</th>
                <th style={thStyle}>STATUS</th>
                <th
                  style={{ ...thStyle, textAlign: 'right', paddingRight: 14, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  Days {sortAsc ? '↑' : '↓'}
                </th>
              </tr>
            </thead>
            <tbody>
              {GROUP_ORDER.map(groupKey => {
                const groupItems = grouped[groupKey];
                if (groupItems.length === 0) return null;
                const isOpen = openGroups[groupKey];
                const visibleItems = isOpen ? groupItems.slice(0, visibleCount) : [];

                return (
                  <GroupSection
                    key={groupKey}
                    groupKey={groupKey}
                    items={visibleItems}
                    totalCount={groupItems.length}
                    isOpen={isOpen}
                    onToggle={() => toggleGroup(groupKey)}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px',
        borderTop: '0.75px solid var(--cp-border-lt, #F1F5F9)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { color: '#22C55E', label: 'Safe <50% SLA' },
            { color: '#F59E0B', label: 'Watch 50–80%' },
            { color: '#EF4444', label: 'Overdue >80%' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: 10, color: 'var(--cp-ink-3, #64748B)' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--cp-ink-4, #94A3B8)' }}>
          SLA: Incident 1d · Bug 3d · Story 10d · Feature 15d
        </span>
      </div>
    </div>
  );
}

/* ── Group Section ── */
function GroupSection({ groupKey, items, totalCount, isOpen, onToggle }: {
  groupKey: TimeGroup; items: AgeingItem[]; totalCount: number;
  isOpen: boolean; onToggle: () => void;
}) {
  const cfg = GROUP_CONFIG[groupKey];
  const accent = GROUP_ACCENT[groupKey];

  return (
    <>
      <GroupHeader
        label={cfg.label}
        count={totalCount}
        isOpen={isOpen}
        onToggle={onToggle}
        accentColor={accent}
      />
      {isOpen && items.map(item => (
        <AgeingRow key={item.id} item={item} />
      ))}
    </>
  );
}

/* ── Stat Chip ── */
function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--cp-ink-3, #64748B)',
  textAlign: 'left',
  fontFamily: 'Inter, sans-serif',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'middle',
};
