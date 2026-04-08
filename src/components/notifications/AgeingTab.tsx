import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════
   Ageing Tab — Live Data
   Design: V12 Hybrid Precision
   ═══════════════════════════════════════ */

type ItemType = 'Production Incident' | 'Story' | 'QA Bug' | 'Feature' | 'Sub-task';
type StatusType = 'TODO' | 'IN PROGRESS';

interface AgeingItem {
  id: string;
  jira_key: string;
  jira_url: string;
  item_type: ItemType;
  summary: string;
  status: StatusType;
  days_assigned: number;
}

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

const T = {
  ink1: 'var(--cp-ink-1, #0F172A)',
  ink3: 'var(--cp-ink-3, #64748B)',
  ink4: 'var(--cp-ink-4, #94A3B8)',
  surface: 'var(--cp-surface, #F8FAFC)',
  border: 'var(--cp-border, #E2E8F0)',
  borderLt: 'var(--cp-border-lt, #F1F5F9)',
  primary: 'var(--cp-primary, #2563EB)',
  primaryLight: 'var(--cp-primary-light, #EFF6FF)',
  primaryBorder: 'var(--cp-primary-border, #BFDBFE)',
  primaryHover: 'var(--cp-primary-hover, #1D4ED8)',
  slTodoBg: 'var(--sl-todo-bg, #DFE1E6)',
  slTodoText: 'var(--sl-todo-text, #253858)',
  slInprogBg: 'var(--sl-inprog-bg, #DEEBFF)',
  slInprogText: 'var(--sl-inprog-text, #0747A6)',
  dangerLight: 'var(--cp-danger-light, #FEE2E2)',
  dangerText: 'var(--cp-danger-text, #991B1B)',
  warningLight: 'var(--cp-warning-light, #FEF3C7)',
  warningText: 'var(--cp-warning-text, #92400E)',
};

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
  const bg = status === 'TODO' ? T.slTodoBg : T.slInprogBg;
  const color = status === 'TODO' ? T.slTodoText : T.slInprogText;
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', borderRadius: 3, padding: '0 7px',
      background: bg, color, whiteSpace: 'nowrap',
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
  if (v.includes('feature')) return 'Feature';
  return 'Story';
}

function mapStatus(raw: string): StatusType | null {
  const v = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (v === 'todo' || v === 'backlog' || v === 'open' || v === 'new') return 'TODO';
  if (v === 'inprogress' || v === 'inreview' || v === 'active') return 'IN PROGRESS';
  return null; // Done items excluded
}

export function useAgeingCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('catalyst_issues')
        .select('id, status')
        .eq('assignee_id', user.id);
      if (cancelled) return;
      const openCount = (data ?? []).filter(i => {
        const s = mapStatus(i.status);
        return s !== null;
      }).length;
      setCount(openCount);
    })();
    return () => { cancelled = true; };
  }, []);
  return count;
}

export default function AgeingTab() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortAsc, setSortAsc] = useState(false); // descending by default
  const [items, setItems] = useState<AgeingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, issue_type, title, status, created_at')
        .eq('assignee_id', user.id);

      if (cancelled) return;

      const mapped: AgeingItem[] = (data ?? [])
        .map(row => {
          const status = mapStatus(row.status);
          if (!status) return null;
          const daysAssigned = Math.max(1, Math.floor((Date.now() - new Date(row.created_at ?? '').getTime()) / (1000 * 60 * 60 * 24)));
          return {
            id: row.id,
            jira_key: row.issue_key,
            jira_url: '#',
            item_type: mapIssueType(row.issue_type),
            summary: row.title,
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

  const filters = ['All', 'Story', 'Bug', 'Incident'];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: `0.75px solid ${T.borderLt}`,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Ageing — Assigned to You
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {filters.map(f => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  border: `0.75px solid ${isActive ? T.primaryBorder : T.border}`,
                  background: isActive ? T.primaryLight : '#FFFFFF',
                  color: isActive ? T.primaryHover : T.ink3,
                  borderRadius: 3, padding: '3px 9px',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 120ms ease',
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={20} style={{ color: T.ink4, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '48px 24px', gap: 8,
          }}>
            <span style={{ fontSize: 13, color: T.ink3, fontFamily: 'Inter, sans-serif' }}>
              No ageing items assigned to you
            </span>
            <span style={{ fontSize: 11, color: T.ink4, fontFamily: 'Inter, sans-serif' }}>
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
                background: T.surface,
                borderBottom: `0.75px solid ${T.border}`,
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
              {filtered.map(item => {
                const sla = SLA_THRESHOLDS[item.item_type];
                const burnPct = (item.days_assigned / sla) * 100;
                const daysColor = burnPct > 80 ? '#EF4444' : burnPct >= 50 ? '#F59E0B' : '#22C55E';

                return (
                  <tr
                    key={item.id}
                    style={{
                      height: 36, maxHeight: 36,
                      borderBottom: `0.75px solid ${T.borderLt}`,
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ ...tdStyle, paddingLeft: 14 }}>
                      <TypeIcon type={item.item_type} />
                    </td>
                    <td style={tdStyle}>
                      <a
                        href={item.jira_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11.5, fontWeight: 700, color: T.primary,
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {item.jira_key}
                      </a>
                    </td>
                    <td style={{
                      ...tdStyle,
                      fontSize: 12, fontWeight: 500, color: T.ink1,
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
                            fontSize: 9, fontWeight: 700, borderRadius: 3,
                            padding: '1px 5px',
                            background: T.dangerLight, color: T.dangerText,
                          }}>
                            Overdue
                          </span>
                        )}
                        {burnPct >= 50 && burnPct <= 80 && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, borderRadius: 3,
                            padding: '1px 5px',
                            background: T.warningLight, color: T.warningText,
                          }}>
                            Watch
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px',
        borderTop: `0.75px solid ${T.borderLt}`,
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
              <span style={{ fontSize: 10, color: T.ink3 }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: T.ink4 }}>
          SLA: Incident 1d · Bug 3d · Story 10d · Feature 15d
        </span>
      </div>
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
