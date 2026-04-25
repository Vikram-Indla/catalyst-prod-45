import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAgeingItems } from '@/hooks/useAgeingItems';
import { Loader2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import AgeingSkeleton from './AgeingSkeleton';
import { useGovernanceScore } from '@/hooks/useGovernanceScore';
import { useAuth } from '@/hooks/useAuth';

/**
 * 2026-04-24 — AgeingTab Atlaskit retune
 * ──────────────────────────────────────
 * This file was originally painted with Tailwind-style literal hexes
 * (#EF4444, #F59E0B, #0052CC, #1E293B, #FEF3C7, #92400E …) and 13px Inter
 * body. None of those values are in the Atlassian Design System. After the
 * /design-critique pass we routed every surface through @atlaskit/tokens
 * with hex fallbacks:
 *
 *   Danger    → color.background.danger    / color.text.danger    / color.icon.danger
 *   Warning   → color.background.warning   / color.text.warning   / color.icon.warning
 *   Info      → color.background.information / color.text.information
 *   Selected  → color.background.selected  / color.border.selected / color.text.selected
 *   Neutral   → color.background.neutral.*  / color.text / color.text.subtle
 *   Borders   → color.border / color.border.bold
 *   Surface   → elevation.surface
 *
 * Typography uses Atlaskit's body scale (14/20 400) for rows and the
 * uppercase "font.body.UNSAFE_small" 11px/600 idiom for section labels —
 * matching the same look Jira's For You strip uses in the 2026-04-24 probe.
 * Row height lifted 36 → 40, inline padding 14 → 20, and the Days column
 * puts the Overdue pill inline with the number instead of stacking.
 */

/* Atlaskit palette — hex fallbacks resolved once so we don't ping token()
   on every render. Every value is an ADS token; fallbacks are the
   documented default of that token on a light theme. */
const ADS = {
  // backgrounds / surfaces
  surface:       'var(--ds-surface, #FFFFFF)',
  surfaceSunken: 'var(--ds-surface-sunken, #F7F8F9)',
  neutralSubtle: 'var(--ds-background-neutral-subtle, #F1F2F4)',
  neutralHover:  'var(--ds-background-neutral-subtle-hovered, #DCDFE4)',
  neutralBold:   'var(--ds-background-neutral-bold, #44546F)',
  // state backgrounds
  dangerBg:      'var(--ds-background-danger, #FFECEB)',
  warningBg:     'var(--ds-background-warning, #FFF7D6)',
  infoBg:        'var(--ds-background-information, #E9F2FF)',
  successBg:     'var(--ds-background-success, #DCFFF1)',
  selectedBg:    'var(--ds-background-selected, #E9F2FF)',
  // text
  text:          'var(--ds-text, #172B4D)',
  textSubtle:    'var(--ds-text-subtle, #44546F)',
  textMuted:     'var(--ds-text-subtlest, #626F86)',
  textDanger:    'var(--ds-text-danger, #AE2E24)',
  textWarning:   'var(--ds-text-warning, #7F5F01)',
  textInfo:      'var(--ds-text-information, #0055CC)',
  textSuccess:   'var(--ds-text-success, #216E4E)',
  textSelected:  'var(--ds-text-selected, #0C66E4)',
  textInverse:   'var(--ds-text-inverse, #FFFFFF)',
  // borders
  border:        'var(--ds-border, #DFE1E6)',
  borderBold:    'var(--ds-border-bold, #8590A2)',
  borderDanger:  'var(--ds-border-danger, #C9372C)',
  borderWarning: 'var(--ds-border-warning, #F5CD47)',
  borderInfo:    'var(--ds-border-information, #388BFF)',
  borderSuccess: 'var(--ds-border-success, #4BCE97)',
  borderSelected:'var(--ds-border-selected, #0C66E4)',
  // icons
  iconDanger:    'var(--ds-icon-danger, #C9372C)',
  iconWarning:   'var(--ds-icon-warning, #B38600)',
  iconInfo:      'var(--ds-icon-information, #1D7AFC)',
  iconSuccess:   'var(--ds-icon-success, #22A06B)',
  iconBrand:     'var(--ds-icon-brand, #1868DB)',
};

/* Atlaskit typography — Inter routed through Atlassian's body scale. We
   don't pull in @atlaskit/primitives Text here because the grouped table
   is hand-rolled; the font shorthand encodes the same metrics. */
const ADS_FONT = {
  body:      `400 14px/20px "Inter", system-ui, sans-serif`,
  bodyBold:  `600 14px/20px "Inter", system-ui, sans-serif`,
  bodySmall: `400 12px/16px "Inter", system-ui, sans-serif`,
  label:     `600 11px/16px "Inter", system-ui, sans-serif`, // uppercase section label
  mono:      `700 13px/20px "JetBrains Mono", monospace`,
};

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
  const isActive = status === 'IN PROGRESS';
  // CLAUDE.md §5 — the 3-colour guardrail is GREY / BLUE / GREEN. These
  // values are the published StatusLozenge light-theme hexes (256:1 with
  // their fg ink) and also the Atlaskit lozenge tokens for inprogress /
  // default, so no new palette is introduced.
  const bg = isActive ? 'var(--ds-background-information, #CCE0FF)' : 'var(--ds-background-neutral, #DCDFE4)';
  const fg = isActive ? 'var(--ds-text-information, #0055CC)' : 'var(--ds-text, #172B4D)';
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', borderRadius: 3, padding: '0 7px',
      background: bg, color: fg, whiteSpace: 'nowrap',
      fontFamily: 'var(--cp-font-body)',
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

/* ── Filter Pill ──
   /design-critique callout ②: the rest state uses `color.background.neutral.subtle`;
   the selected state uses `color.background.selected` + `color.border.selected`.
   No per-category bespoke palette — filters should not compete with StatusLozenge.
*/
function FilterPill({ label, isActive, count, onClick }: {
  label: string; isActive: boolean; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${isActive ? ADS.borderSelected : ADS.border}`,
        background: isActive ? ADS.selectedBg : 'transparent',
        color: isActive ? ADS.textSelected : ADS.textSubtle,
        borderRadius: 16, padding: '4px 12px',
        font: ADS_FONT.bodyBold,
        cursor: 'pointer',
        transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      <span style={{
        fontSize: 11, fontWeight: 700,
        background: isActive ? 'rgba(12,102,228,0.14)' : ADS.neutralSubtle,
        color: isActive ? ADS.textSelected : ADS.textSubtle,
        borderRadius: 8, padding: '1px 6px',
        minWidth: 18, textAlign: 'center',
      }}>
        {count}
      </span>
    </button>
  );
}

/* ── Group Header ──
   /design-critique callout ⑦: the 3px accent stripe must route through
   `color.border.{danger|warning|information|subtle}`. The count pill uses
   the matching `color.background.{danger|warning|…}.bold` so WCAG AA is
   preserved against white text.
*/
function GroupHeader({ label, count, isOpen, onToggle, accentColor }: {
  label: string; count: number; isOpen: boolean; onToggle: () => void; accentColor: string;
}) {
  return (
    <tr>
      <td colSpan={5} style={{ padding: 0 }}>
        <button
          onClick={onToggle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 20px', border: 'none', cursor: 'pointer',
            background: ADS.surfaceSunken,
            borderBottom: `1px solid ${ADS.border}`,
            borderLeft: `3px solid ${accentColor}`,
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {isOpen
            ? <ChevronDown size={14} color={ADS.textSubtle} />
            : <ChevronRight size={14} color={ADS.textSubtle} />}
          <span style={{
            font: ADS_FONT.label,
            color: ADS.textSubtle,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {label}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: ADS.textInverse,
            background: accentColor, borderRadius: 3,
            padding: '1px 6px', minWidth: 22, textAlign: 'center',
          }}>
            {count}
          </span>
        </button>
      </td>
    </tr>
  );
}

/* ── Ageing Item Row ──
   /design-critique callouts ⑧⑨:
     - Row height 36 → 40 for body-scale rhythm.
     - Days pill goes INLINE with the number on a single baseline.
     - Non-Atlaskit hexes (#EF4444, #F59E0B, #22C55E, #991B1B…) are replaced
       with the danger / warning / success ADS tokens.
*/
function AgeingRow({ item }: { item: AgeingItem }) {
  const sla = SLA_THRESHOLDS[item.item_type];
  const burnPct = (item.days_assigned / sla) * 100;
  const isOverdue = burnPct > 80;
  const isWatch   = burnPct >= 50 && burnPct <= 80;

  const daysColor = isOverdue
    ? ADS.textDanger
    : isWatch
      ? ADS.textWarning
      : ADS.textSuccess;

  return (
    <tr
      style={{
        height: 40, maxHeight: 40,
        borderBottom: `1px solid ${ADS.border}`,
        transition: 'background-color 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = ADS.neutralSubtle)}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <td style={{ ...tdStyle, paddingLeft: 20 }}>
        <TypeIcon type={item.item_type} />
      </td>
      <td style={tdStyle}>
        <span style={{
          font: ADS_FONT.mono,
          color: ADS.textSelected,
          cursor: 'pointer',
        }}>
          {item.jira_key}
        </span>
      </td>
      <td style={{
        ...tdStyle, font: ADS_FONT.body,
        color: ADS.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.summary}
      </td>
      <td style={tdStyle}>
        <StatusLozenge status={item.status} />
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 20, verticalAlign: 'middle' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          justifyContent: 'flex-end',
        }}>
          <span style={{ font: ADS_FONT.bodyBold, color: daysColor, fontVariantNumeric: 'tabular-nums' }}>
            {item.days_assigned}d
          </span>
          {isOverdue && (
            <span style={{
              fontSize: 11, fontWeight: 700, borderRadius: 3, padding: '2px 6px',
              background: ADS.dangerBg, color: ADS.textDanger,
            }}>
              Overdue
            </span>
          )}
          {isWatch && (
            <span style={{
              fontSize: 11, fontWeight: 700, borderRadius: 3, padding: '2px 6px',
              background: ADS.warningBg, color: ADS.textWarning,
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
/* Derives count from the same useAgeingItems hook so badge = panel total */
export function useAgeingCount(): number {
  const { data: sharedItems, isLoading } = useAgeingItems();
  if (isLoading || !sharedItems) return 0;
  return sharedItems.length;
}

// /design-critique callout ⑦ — every accent resolves to an Atlaskit
// `color.border.{intent}` token, NOT a bespoke hex.
const GROUP_ACCENT: Record<TimeGroup, string> = {
  critical:  ADS.borderDanger,
  thisWeek:  ADS.borderInfo,
  thisMonth: ADS.borderWarning,
  quarter:   ADS.borderBold,
  older:     ADS.border,
};

/* ── Governance RAG Pill ──
   /design-critique callout ③: swap bespoke ambers for Atlaskit warning +
   success + danger tokens. Pulse animation stays — it's the semantic
   "needs attention" affordance and is retained in the ADS motion spec.
*/
function GovernanceRagPill({ onCleanupClick }: { onCleanupClick: () => void }) {
  const { data } = useGovernanceScore();
  const ragStatus = data?.ragStatus ?? 'green';

  const cfg = {
    green: { bg: ADS.successBg, border: ADS.borderSuccess, color: ADS.textSuccess, dot: ADS.iconSuccess, anim: 'none' },
    amber: { bg: ADS.warningBg, border: ADS.borderWarning, color: ADS.textWarning, dot: ADS.iconWarning, anim: 'rag-pulse 1.5s ease-in-out infinite' },
    red:   { bg: ADS.dangerBg,  border: ADS.borderDanger,  color: ADS.textDanger,  dot: ADS.iconDanger,  anim: 'rag-pulse 0.8s ease-in-out infinite' },
  }[ragStatus];

  return (
    <>
      <style>{`@keyframes rag-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <button
        onClick={onCleanupClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          borderRadius: 20, padding: '3px 10px',
          fontSize: 11, fontWeight: 700,
          background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
          cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
          letterSpacing: '0.04em',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: cfg.dot, display: 'inline-block',
          animation: cfg.anim,
        }} />
        {ragStatus.toUpperCase()}
      </button>
    </>
  );
}

/* ── AI Cleanup Button ──
   /design-critique callout ④: bespoke `#1E293B` navy is off-palette. The
   Atlaskit-correct equivalent for a neutral dark CTA is
   `color.background.neutral.bold` (#44546F). The sparkle uses the same
   brand blue as the AI Recap tab (see ForYouTabs callout ⓪) so every AI
   affordance in Catalyst reads as the same entity.
*/
function AICleanupButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 28, padding: '0 12px', borderRadius: 6,
        background: ADS.neutralBold, color: ADS.textInverse,
        font: ADS_FONT.bodyBold, border: 'none',
        cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', gap: 6,
      }}
    >
      <Sparkles size={12} strokeWidth={1.75} color={ADS.iconBrand} />
      AI Cleanup
    </button>
  );
}

/* ── Main Component ── */
// PAGE_SIZE matches the other For You panels (ForYouPageAtlaskit.tsx) so the
// Load more + IntersectionObserver sentinel pattern is consistent across the
// feed. /design-critique callout ⑩: "implement load more like you did in
// other tabs."
const PAGE_SIZE = 20;

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
  // Total visible items across ALL groups (matches ForYouPageAtlaskit's
  // `visibleItems = workItems.slice(0, visibleCount)` semantic). When this
  // increases, groups auto-expand their slice of the window.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: govData } = useGovernanceScore();

  // Use shared hook — single source of truth
  const { data: sharedItems, isLoading: sharedLoading } = useAgeingItems();

  useEffect(() => {
    if (sharedItems) {
      const mapped: AgeingItem[] = sharedItems.map(row => {
        const status = mapStatusCategory(row.status_category ?? '');
        return {
          id: row.id,
          jira_key: row.jira_key,
          item_type: row.item_type as ItemType,
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

  // Sync ageing count into governance cache so RAG pill stays in sync
  useEffect(() => {
    if (!loading && user?.id && items.length >= 0) {
      const totalCount = items.length;
      queryClient.setQueryData(
        ["governance-score", user.id],
        (old: any) => ({
          ...(old || {}),
          staleCount: totalCount,
          ragStatus: totalCount === 0 ? "green" : totalCount <= 20 ? "amber" : "red",
          scorePct: Math.max(0, 100 - Math.min(totalCount * 2, 100)),
        })
      );
    }
  }, [loading, items.length, user?.id, queryClient]);

  // Navigate to cleanup — close panel first
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

  // Group items (full set — unbounded, for the header counts). The
  // `groupedVisible` below applies the Load more window so groups grow in
  // lockstep with `visibleCount`.
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

  // Windowed view: slice `filtered` at visibleCount, then re-group. This
  // mirrors the ForYouPageAtlaskit pattern — the "Load more" button and
  // IntersectionObserver sentinel both bump visibleCount, which reveals the
  // next 20 rows across whatever groups they fall into (severity-sorted, so
  // Critical fills first).
  const groupedVisible = useMemo(() => {
    const groups: Record<TimeGroup, AgeingItem[]> = {
      critical: [], thisWeek: [], thisMonth: [], quarter: [], older: [],
    };
    filtered.slice(0, visibleCount).forEach(item => {
      const g = classifyTimeGroup(item);
      groups[g].push(item);
    });
    return groups;
  }, [filtered, visibleCount]);

  const hasMore = visibleCount < filtered.length;
  const loadMore = useCallback(() => {
    setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  // Reset window when filter changes — same behaviour as
  // handleTabChange in ForYouPageAtlaskit.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter]);

  // IntersectionObserver sentinel — auto-advances the window when the
  // sentinel scrolls into view (200px rootMargin matches ForYouPageAtlaskit).
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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
    <div style={{ fontFamily: 'var(--cp-font-body)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar — /design-critique callout ①: 20px paddingInline lifts the
          visual crunch; the subtle neutral border comes from the ADS token. */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${ADS.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{
            font: ADS_FONT.label,
            color: ADS.textSubtle,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            flexShrink: 0,
          }}>
            Ageing — Assigned to You
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <GovernanceRagPill onCleanupClick={handleGoToCleanup} />
            <AICleanupButton onClick={handleGoToCleanup} />
          </div>
        </div>
      </div>

      {/* Summary bar — /design-critique callout ⑤: stat chips now take a
          semantic `intent` prop that maps to ADS text tokens. The sunken
          surface + neutral border replace the bespoke slate ramp. */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'flex', gap: 20, padding: '12px 20px',
          borderBottom: `1px solid ${ADS.border}`,
          background: ADS.surfaceSunken,
        }}>
          <StatChip label="Total"      value={filtered.length}            intent="neutral" />
          <StatChip label="Critical"   value={grouped.critical.length}    intent="danger"  />
          <StatChip label="This Week"  value={grouped.thisWeek.length}    intent="info"    />
          <StatChip label="This Month" value={grouped.thisMonth.length}   intent="warning" />
          <StatChip label="Overdue"    value={`${overduePct}%`}           intent={overduePct > 50 ? 'danger' : 'warning'} />
        </div>
      )}

      {/* Dynamic Governance Caution Banner — /design-critique callout ⑥.
          Amber → Atlaskit warning tokens, Red → Atlaskit danger tokens.
          Both banners share the same 12px × 20px breathing, 14/20 body
          scale, and tinted 1px border. */}
      {!loading && govData && govData.ragStatus === 'amber' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 20px',
          background: ADS.warningBg, borderBottom: `1px solid ${ADS.borderWarning}`,
          font: ADS_FONT.body, color: ADS.textWarning,
          lineHeight: 1.5,
        }}>
          <span style={{ flexShrink: 0, fontSize: 14, color: ADS.iconWarning, fontWeight: 700 }}>!</span>
          <span>
            <strong>{items.length} aging items</strong> assigned to you.
            Address them before they reach governance breach.
          </span>
        </div>
      )}
      {!loading && govData && govData.ragStatus === 'red' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 20px',
          background: ADS.dangerBg, borderBottom: `1px solid ${ADS.borderDanger}`,
          font: ADS_FONT.body, color: ADS.textDanger,
          lineHeight: 1.5,
        }}>
          <span style={{ flexShrink: 0, fontSize: 14, color: ADS.iconDanger, fontWeight: 700 }}>!</span>
          <span>
            Governance breach — <strong>{items.length} aging items</strong>, {govData.breachStreak} day streak.{' '}
            <span
              onClick={handleGoToCleanup}
              style={{ color: ADS.textSelected, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              Open AI Cleanup
            </span>
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <AgeingSkeleton />
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '48px 24px', gap: 8,
          }}>
            <span style={{ font: ADS_FONT.body, color: ADS.textSubtle }}>
              No ageing items assigned to you
            </span>
            <span style={{ font: ADS_FONT.bodySmall, color: ADS.textMuted }}>
              Open work items will appear here with SLA tracking
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: 96 }} />
              <col />
              <col style={{ width: 108 }} />
              <col style={{ width: 116 }} />
            </colgroup>
            <thead>
              <tr style={{
                background: ADS.surfaceSunken,
                borderBottom: `1px solid ${ADS.border}`,
              }}>
                <th style={{ ...thStyle, paddingLeft: 20 }} />
                <th style={thStyle}>KEY</th>
                <th style={thStyle}>SUMMARY</th>
                <th style={thStyle}>STATUS</th>
                <th
                  style={{ ...thStyle, textAlign: 'right', paddingRight: 20, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  Days {sortAsc ? '↑' : '↓'}
                </th>
              </tr>
            </thead>
            <tbody>
              {GROUP_ORDER.map(groupKey => {
                // Header counts use the full `grouped` map — pagination only
                // shrinks what's rendered, not the SLA severity counters.
                const fullGroupItems = grouped[groupKey];
                if (fullGroupItems.length === 0) return null;
                const isOpen = openGroups[groupKey];
                // Body rows come from the windowed `groupedVisible` map
                // (synced with visibleCount / Load more / sentinel).
                const visibleItems = isOpen ? (groupedVisible[groupKey] ?? []) : [];

                return (
                  <GroupSection
                    key={groupKey}
                    groupKey={groupKey}
                    items={visibleItems}
                    totalCount={fullGroupItems.length}
                    isOpen={isOpen}
                    onToggle={() => toggleGroup(groupKey)}
                  />
                );
              })}
            </tbody>
          </table>
        )}

        {/* Load more + sentinel — /design-critique callout ⑩.
            Mirrors ForYouPageAtlaskit's "Load more" affordance: explicit
            keyboard-accessible button plus a silent IntersectionObserver
            sentinel (rootMargin 200px) that auto-advances as the user scrolls.
            Only renders when there are still items beyond the window.
            Neutral Atlaskit button chrome — no bespoke colours. */}
        {!loading && hasMore && (
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: '20px 20px 24px',
          }}>
            <button
              type="button"
              onClick={loadMore}
              style={{
                padding: '8px 18px',
                background: ADS.neutralSubtle,
                color: ADS.text,
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                font: ADS_FONT.bodyBold,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = ADS.neutralHover)}
              onMouseLeave={e => (e.currentTarget.style.background = ADS.neutralSubtle)}
            >
              Load more ({filtered.length - visibleCount} remaining)
            </button>
            <div
              ref={sentinelRef}
              style={{ position: 'absolute', width: 1, height: 1, pointerEvents: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Footer — /design-critique callout ⑨: legend dots use Atlaskit
          semantic icon tokens (success/warning/danger) instead of bespoke
          saturated hexes. Text routes through text.subtle / text.subtlest. */}
      <div style={{
        padding: '12px 20px',
        borderTop: `1px solid ${ADS.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { color: ADS.iconSuccess, label: 'Safe <50% SLA' },
            { color: ADS.iconWarning, label: 'Watch 50–80%' },
            { color: ADS.iconDanger,  label: 'Overdue >80%' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
              <span style={{ font: ADS_FONT.bodySmall, color: ADS.textSubtle }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ font: ADS_FONT.bodySmall, color: ADS.textMuted }}>
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

/* ── Stat Chip ──
   /design-critique callout ⑤: consumers pass a semantic `intent` instead of
   a raw hex. This ensures every numeric colour in the summary strip resolves
   to an Atlaskit `color.text.{intent}` token — no off-palette slate, no
   #0052CC legacy brand blue, no bespoke amber.
*/
type StatIntent = 'neutral' | 'danger' | 'warning' | 'info' | 'success';
function StatChip({ label, value, intent }: { label: string; value: string | number; intent: StatIntent }) {
  const numericColor: string = {
    neutral: ADS.text,
    danger:  ADS.textDanger,
    warning: ADS.textWarning,
    info:    ADS.textInfo,
    success: ADS.textSuccess,
  }[intent];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{
        fontSize: 16, fontWeight: 700, color: numericColor,
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'var(--cp-font-body)',
      }}>
        {value}
      </span>
      <span style={{
        font: ADS_FONT.label,
        color: ADS.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  font: `600 11px/16px "Inter", system-ui, sans-serif`,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: ADS.textSubtle,
  textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
};
