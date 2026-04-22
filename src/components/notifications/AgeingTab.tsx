// ─────────────────────────────────────────────────────────────────────────────
// Ageing Tab — SLA-based portfolio health monitor (Catalyst-owned)
// Design: Atlaskit-first · @atlaskit/lozenge statuses · section-message banners
// Data:   useAgeingItems hook (shared with governance score badge)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAgeingItems } from '@/hooks/useAgeingItems';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import { token } from '@atlaskit/tokens';
import { useGovernanceScore } from '@/hooks/useGovernanceScore';
import { useAuth } from '@/hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── SLA thresholds (business rules) ──────────────────────────────────────────

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

const GROUP_ACCENT: Record<TimeGroup, string> = {
  critical:  token('color.border.danger', '#EF4444'),
  thisWeek:  token('color.border.information', '#0052CC'),
  thisMonth: token('color.border.warning', '#F59E0B'),
  quarter:   token('color.border', '#94A3B8'),
  older:     token('color.border', '#64748B'),
};

// ── Canonical Jira Work Item SVG icons ───────────────────────────────────────

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

// ── Status Lozenge — @atlaskit/lozenge with CLAUDE.md §5 appearances ─────────

function StatusLozenge({ status }: { status: StatusType }) {
  // appearance="inprogress" → #DEEBFF / #0747A6 = BLUE (CLAUDE.md §5 ✅)
  // appearance="default"    → #DFE1E6 / #253858 = GREY  (CLAUDE.md §5 ✅)
  return (
    <Lozenge appearance={status === 'IN PROGRESS' ? 'inprogress' : 'default'}>
      {status}
    </Lozenge>
  );
}

// ── Mappers (unchanged business logic) ───────────────────────────────────────

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

// ── Filter Pill — Atlaskit token-backed interactive pill ─────────────────────

const PILL_ACTIVE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  All:      { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' },
  Story:    { bg: '#F0FDF4', border: '#16A34A', text: '#166534' },
  Bug:      { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B' },
  Incident: { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B' },
};

function FilterPill({ label, isActive, count, onClick }: {
  label: string; isActive: boolean; count: number; onClick: () => void;
}) {
  const active = PILL_ACTIVE_STYLES[label] || PILL_ACTIVE_STYLES.All;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: `1px solid ${isActive ? active.border : token('color.border', '#091E4224')}`,
        background: isActive ? active.bg : token('color.background.neutral', 'transparent'),
        color: isActive ? active.text : token('color.text.subtle', '#44546F'),
        borderRadius: 16,
        padding: '3px 10px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 120ms ease',
      }}
    >
      {label}
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        background: isActive
          ? (label === 'All' ? '#DBEAFE' : label === 'Story' ? '#DCFCE7' : '#FEE2E2')
          : token('color.background.neutral', '#F1F5F9'),
        color: isActive ? active.text : token('color.text.subtlest', '#626F86'),
        borderRadius: 8,
        padding: '1px 5px',
        minWidth: 18,
        textAlign: 'center',
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Group header row ──────────────────────────────────────────────────────────

function GroupHeader({ label, count, isOpen, onToggle, accentColor }: {
  label: string; count: number; isOpen: boolean; onToggle: () => void; accentColor: string;
}) {
  return (
    <tr>
      <td colSpan={5} style={{ padding: 0 }}>
        <button
          onClick={onToggle}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            border: 'none',
            cursor: 'pointer',
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            borderBottom: `1px solid ${token('color.border', '#091E4224')}`,
            borderLeft: `3px solid ${accentColor}`,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isOpen
            ? <ChevronDown size={13} color={token('color.icon.subtle', '#626F86')} />
            : <ChevronRight size={13} color={token('color.icon.subtle', '#626F86')} />
          }
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: token('color.text.subtle', '#44546F'),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {label}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#FFFFFF',
            background: accentColor,
            borderRadius: 3,
            padding: '1px 6px',
            minWidth: 20,
            textAlign: 'center',
          }}>
            {count}
          </span>
        </button>
      </td>
    </tr>
  );
}

// ── Ageing data row ───────────────────────────────────────────────────────────

function AgeingRow({ item }: { item: AgeingItem }) {
  const sla = SLA_THRESHOLDS[item.item_type];
  const burnPct = (item.days_assigned / sla) * 100;
  const daysColor = burnPct > 80
    ? token('color.text.danger', '#AE2A19')
    : burnPct >= 50
      ? token('color.text.warning', '#974F0C')
      : token('color.text.success', '#216E4E');

  return (
    <tr
      style={{
        height: 36,
        maxHeight: 36,
        borderBottom: `1px solid ${token('color.border.subtle', '#F1F5F9')}`,
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(0,0,0,0.02)'))}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Type icon */}
      <td style={{ ...tdStyle, paddingLeft: 14 }}>
        <TypeIcon type={item.item_type} />
      </td>

      {/* Key */}
      <td style={tdStyle}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 700,
          color: token('color.link', '#0C66E4'),
          cursor: 'pointer',
        }}>
          {item.jira_key}
        </span>
      </td>

      {/* Summary */}
      <td style={{
        ...tdStyle,
        fontSize: 13,
        fontWeight: 500,
        color: token('color.text', '#172B4D'),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {item.summary}
      </td>

      {/* Status — @atlaskit/lozenge */}
      <td style={tdStyle}>
        <StatusLozenge status={item.status} />
      </td>

      {/* Days assigned + SLA badge */}
      <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 14, verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: daysColor }}>
            {item.days_assigned}d
          </span>
          {burnPct > 80 && (
            <Lozenge appearance="removed">Overdue</Lozenge>
          )}
          {burnPct >= 50 && burnPct <= 80 && (
            <Lozenge appearance="moved">Watch</Lozenge>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Governance RAG Pill — Catalyst-owned design ───────────────────────────────

function GovernanceRagPill({ onCleanupClick }: { onCleanupClick: () => void }) {
  const { data } = useGovernanceScore();
  const ragStatus = data?.ragStatus ?? 'green';

  const cfg = {
    green: { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', dot: '#10B981', anim: 'none' },
    amber: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', dot: '#F59E0B', anim: 'rag-pulse 1.5s ease-in-out infinite' },
    red:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B', dot: '#EF4444', anim: 'rag-pulse 0.8s ease-in-out infinite' },
  }[ragStatus];

  return (
    <>
      <style>{`@keyframes rag-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <button
        onClick={onCleanupClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 20,
          padding: '3px 9px',
          fontSize: 11,
          fontWeight: 700,
          background: cfg.bg,
          border: `1.5px solid ${cfg.border}`,
          color: cfg.color,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dot,
          display: 'inline-block',
          animation: cfg.anim,
        }} />
        {ragStatus.toUpperCase()}
      </button>
    </>
  );
}

// ── Stat chip — summary bar ───────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{
        fontSize: 14,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'Inter, sans-serif',
      }}>
        {value}
      </span>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: token('color.text.subtlest', '#626F86'),
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: 'Inter, sans-serif',
      }}>
        {label}
      </span>
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────

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

// ── Count badge hook (exported — drives tab badge) ────────────────────────────

export function useAgeingCount(): number {
  const { data: sharedItems, isLoading } = useAgeingItems();
  if (isLoading || !sharedItems) return 0;
  return sharedItems.length;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgeingTab({ onClose }: { onClose?: () => void }) {
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: govData } = useGovernanceScore();

  const { data: sharedItems, isLoading: sharedLoading } = useAgeingItems();

  useEffect(() => {
    if (sharedItems) {
      const mapped: AgeingItem[] = sharedItems.map(row => {
        const status = mapStatusCategory(row.status_category ?? '');
        return {
          id: row.id,
          jira_key: row.jira_key,
          item_type: mapIssueType(row.item_type ?? ''),
          summary: row.summary,
          status: status || 'TODO' as StatusType,
          days_assigned: row.days_open,
        } as AgeingItem;
      });
      setItems(mapped);
      setLoading(false);
    }
  }, [sharedItems]);

  useEffect(() => {
    if (sharedLoading) setLoading(true);
  }, [sharedLoading]);

  // Sync count into governance cache
  useEffect(() => {
    if (!loading && user?.id && items.length >= 0) {
      const totalCount = items.length;
      queryClient.setQueryData(
        ['governance-score', user.id],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => ({
          ...(old || {}),
          staleCount: totalCount,
          ragStatus: totalCount === 0 ? 'green' : totalCount <= 20 ? 'amber' : 'red',
          scorePct: Math.max(0, 100 - Math.min(totalCount * 2, 100)),
        })
      );
    }
  }, [loading, items.length, user?.id, queryClient]);

  const handleGoToCleanup = useCallback(() => {
    if (onClose) onClose();
    setTimeout(() => navigate('/cleanup'), 50);
  }, [onClose, navigate]);

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

  // Group
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

  // Type counts
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

  const overduePct = useMemo(() => {
    if (filtered.length === 0) return 0;
    const overdue = filtered.filter(i => (i.days_assigned / SLA_THRESHOLDS[i.item_type]) * 100 > 80).length;
    return Math.round((overdue / filtered.length) * 100);
  }, [filtered]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${token('color.border', '#091E4224')}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: token('color.text.subtlest', '#626F86'),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
            fontFamily: 'Inter, sans-serif',
          }}>
            Assigned to You
          </span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <GovernanceRagPill onCleanupClick={handleGoToCleanup} />
            <Button
              appearance="primary"
              onClick={handleGoToCleanup}
              iconBefore={() => <Sparkles size={12} strokeWidth={1.5} />}
            >
              AI Cleanup
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary bar ── */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '8px 14px',
          borderBottom: `1px solid ${token('color.border.subtle', '#091E4224')}`,
          background: token('color.background.neutral.subtle', '#F7F8F9'),
        }}>
          <StatChip label="Total" value={filtered.length} color={token('color.text.subtle', '#44546F')} />
          <StatChip label="Critical" value={grouped.critical.length} color={token('color.text.danger', '#AE2A19')} />
          <StatChip label="This Week" value={grouped.thisWeek.length} color={token('color.text.information', '#0055CC')} />
          <StatChip label="This Month" value={grouped.thisMonth.length} color={token('color.text.warning', '#974F0C')} />
          <StatChip label="Overdue" value={`${overduePct}%`} color={overduePct > 50 ? token('color.text.danger', '#AE2A19') : token('color.text.warning', '#974F0C')} />
        </div>
      )}

      {/* ── Governance banner — @atlaskit/section-message ── */}
      {!loading && govData?.ragStatus === 'amber' && (
        <div style={{ padding: '8px 14px' }}>
          <SectionMessage appearance="warning">
            <strong>{items.length} ageing items</strong> assigned to you.
            Address them before they reach governance breach.
          </SectionMessage>
        </div>
      )}
      {!loading && govData?.ragStatus === 'red' && (
        <div style={{ padding: '8px 14px' }}>
          <SectionMessage appearance="error">
            Governance breach — <strong>{items.length} ageing items</strong>
            {govData.breachStreak ? `, ${govData.breachStreak} day streak` : ''}.{' '}
            <span
              onClick={handleGoToCleanup}
              style={{ color: token('color.link', '#0C66E4'), cursor: 'pointer', fontWeight: 600 }}
            >
              Open AI Cleanup
            </span>
          </SectionMessage>
        </div>
      )}

      {/* ── Table ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '56px 24px',
            gap: 12,
          }}>
            <Spinner size="large" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            gap: 8,
          }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: token('color.text', '#172B4D'),
              fontFamily: 'Inter, sans-serif',
            }}>
              All caught up
            </span>
            <span style={{
              fontSize: 13,
              color: token('color.text.subtlest', '#626F86'),
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif',
            }}>
              No ageing items assigned to you. Open work items will appear here with SLA tracking.
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
                background: token('color.background.neutral.subtle', '#F7F8F9'),
                borderBottom: `1px solid ${token('color.border', '#091E4224')}`,
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

      {/* ── Footer legend ── */}
      <div style={{
        padding: '8px 14px',
        borderTop: `1px solid ${token('color.border.subtle', '#091E4224')}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { color: token('color.text.success', '#216E4E'), label: 'Safe <50% SLA' },
            { color: token('color.text.warning', '#974F0C'), label: 'Watch 50–80%' },
            { color: token('color.text.danger', '#AE2A19'), label: 'Overdue >80%' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: 11, color: token('color.text.subtlest', '#626F86'), fontFamily: 'Inter, sans-serif' }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 11, color: token('color.text.disabled', '#8590A2'), fontFamily: 'Inter, sans-serif' }}>
          SLA: Incident 1d · Bug 3d · Story 10d · Feature 15d
        </span>
      </div>
    </div>
  );
}

// ── Table style constants ─────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: token('color.text.subtlest', '#626F86'),
  textAlign: 'left',
  fontFamily: 'Inter, sans-serif',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'middle',
};
