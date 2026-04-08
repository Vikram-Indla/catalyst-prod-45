import { useState, useMemo } from 'react';

/* ═══════════════════════════════════════
   Ageing Tab — Stage C (Seed Data)
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

const SEED_DATA: AgeingItem[] = [
  { id: '1', jira_key: 'SAU-0421', jira_url: '#', item_type: 'Production Incident', summary: 'Login page 502 on mobile Safari', status: 'IN PROGRESS', days_assigned: 2 },
  { id: '2', jira_key: 'SAU-1103', jira_url: '#', item_type: 'Story', summary: 'Implement Ageing tab in NotifyHub panel', status: 'IN PROGRESS', days_assigned: 14 },
  { id: '3', jira_key: 'SAU-0877', jira_url: '#', item_type: 'QA Bug', summary: 'is_dismissed column missing on notifications', status: 'TODO', days_assigned: 6 },
  { id: '4', jira_key: 'SAU-1042', jira_url: '#', item_type: 'Feature', summary: 'R360 Ring view contrast fix primary text', status: 'IN PROGRESS', days_assigned: 9 },
  { id: '5', jira_key: 'SAU-0934', jira_url: '#', item_type: 'Sub-task', summary: 'Wire bell icon to NotifyHub panel open state', status: 'TODO', days_assigned: 4 },
];

function TypeIcon({ type }: { type: ItemType }) {
  const size = 18;
  const icons: Record<ItemType, JSX.Element> = {
    Story: (
      <svg width={size} height={size} viewBox="0 0 18 18">
        <title>Story</title>
        <rect width="18" height="18" rx="2" fill="#22C55E" />
        <text x="9" y="13" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">S</text>
      </svg>
    ),
    Feature: (
      <svg width={size} height={size} viewBox="0 0 18 18">
        <title>Feature</title>
        <rect width="18" height="18" rx="2" fill="#8B5CF6" />
        <text x="9" y="13" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="Inter, sans-serif">F</text>
      </svg>
    ),
    'Sub-task': (
      <svg width={size} height={size} viewBox="0 0 18 18">
        <title>Sub-task</title>
        <rect width="18" height="18" rx="2" fill="#3B82F6" />
        <path d="M9 12L9 6M9 6L6 9M9 6L12 9" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    'QA Bug': (
      <svg width={size} height={size} viewBox="0 0 18 18">
        <title>QA Bug</title>
        <rect width="18" height="18" rx="2" fill="#EF4444" />
        <circle cx="9" cy="7" r="2.5" fill="#FFFFFF" />
        <rect x="7.5" y="9" width="3" height="4" rx="1" fill="#FFFFFF" />
      </svg>
    ),
    'Production Incident': (
      <svg width={size} height={size} viewBox="0 0 18 18">
        <title>Production Incident</title>
        <rect width="18" height="18" rx="2" fill="#F97316" />
        <text x="9" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="Inter, sans-serif">!</text>
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

export function useAgeingCount(): number {
  return SEED_DATA.length;
}

export default function AgeingTab() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let items = [...SEED_DATA];
    const typeFilter = TYPE_FILTER_MAP[activeFilter];
    if (typeFilter && typeFilter.length > 0) {
      items = items.filter(i => typeFilter.includes(i.item_type));
    }
    items.sort((a, b) => {
      const burnA = (a.days_assigned / SLA_THRESHOLDS[a.item_type]) * 100;
      const burnB = (b.days_assigned / SLA_THRESHOLDS[b.item_type]) * 100;
      return sortAsc ? burnA - burnB : burnB - burnA;
    });
    return items;
  }, [activeFilter, sortAsc]);

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
