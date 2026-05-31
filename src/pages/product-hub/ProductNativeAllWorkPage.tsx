/**
 * ProductNativeAllWorkPage — /product-hub/:key/allwork
 *
 * NATIVE product-hub all-work surface. Every field comes from the
 * canonical Business Request form (CreateBusinessRequestModal.tsx).
 * No Jira vocabulary, no ph_issues, no demand_process_steps.
 *
 * Canonical sources (do NOT diverge):
 *   • Field set         → CreateBusinessRequestModal FormState
 *                          (title, arabic_title, description, process_step,
 *                           request_type, urgency, category, theme,
 *                           project_manager_user_id, po_user_id, stakeholders,
 *                           planned_quarter, end_date, targeted_feature)
 *   • Status list       → useCatalystWorkflow('Business Request') — admin workflows
 *   • Request types     → REQUEST_TYPE_OPTIONS (feature / gap / integration / data_request)
 *   • Priorities        → 'High' / 'Normal' / 'Low'
 *   • Categories        → Industrial / Ministry Website / Internal Services / Innovation Platform
 *   • Themes            → THEME_OPTIONS
 *   • Stakeholders      → STAKEHOLDER_OPTIONS
 *   • Profiles (DM/PO)  → profiles table
 *   • Releases          → releases table
 *   • Icon              → JiraIssueTypeIcon with type='Business Request' (amber lightbulb)
 *   • Detail            → CatalystDetailRouter itemType='business_request'
 */

import React, {
  Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState,
  useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';

import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import Button, { IconButton } from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import Checkbox from '@atlaskit/checkbox';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import AkRefreshIcon from '@atlaskit/icon/core/refresh';
import AkSortIcon from '@atlaskit/icon/glyph/arrow-up';
import AkSortDownIcon from '@atlaskit/icon/glyph/arrow-down';

import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useBusinessRequestsByProduct } from '@/hooks/useBusinessRequests';
import { useCatalystWorkflow, type WorkflowStatus } from '@/hooks/useCatalystWorkflow';
import {
  THEME_OPTIONS, STAKEHOLDER_OPTIONS, REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
import type { BusinessRequest } from '@/types/business-request';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

// ─── Product info ─────────────────────────────────────────────────────────────

interface ProductInfo { id: string; name: string; code: string; }

function useProductInfo(key: string | undefined) {
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!key) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('products').select('id, name, code')
        .eq('code', key.toUpperCase()).eq('is_active', true).maybeSingle();
      setProduct(data ?? null);
      setLoading(false);
    })();
  }, [key]);
  return { product, loading };
}

// ─── Profile lookup ───────────────────────────────────────────────────────────

interface ProfileRow { id: string; full_name: string | null; avatar_url: string | null; email: string | null; }

function useProductProfiles(brs: BusinessRequest[]) {
  return useQuery({
    queryKey: ['product-allwork-profiles', brs.length],
    enabled: brs.length > 0,
    queryFn: async () => {
      const ids = new Set<string>();
      brs.forEach(r => {
        if ((r as any).project_manager_user_id) ids.add((r as any).project_manager_user_id);
        if ((r as any).po_user_id) ids.add((r as any).po_user_id);
      });
      if (ids.size === 0) return new Map<string, ProfileRow>();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', Array.from(ids));
      const map = new Map<string, ProfileRow>();
      (data ?? []).forEach(p => map.set(p.id, p as ProfileRow));
      return map;
    },
    staleTime: 60_000,
  });
}

// ─── Releases lookup (for planned_quarter filter labels) ──────────────────────

function useReleaseNames() {
  return useQuery({
    queryKey: ['product-allwork-releases'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name').order('name');
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Constants from canonical source ──────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'High',   label: 'High'   },
  { value: 'Normal', label: 'Normal' },
  { value: 'Low',    label: 'Low'    },
];

const CATEGORY_OPTIONS = [
  { value: 'Industrial',          label: 'Industrial' },
  { value: 'Ministry Website',    label: 'Ministry Website' },
  { value: 'Internal Services',   label: 'Internal Services' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
];

const TYPE_OPTIONS = REQUEST_TYPE_OPTIONS.map(t => ({ value: t.value, label: t.label }));
const THEME_FILTER_OPTIONS = THEME_OPTIONS.map(t => ({ value: t.value, label: t.labelEn ?? t.label }));
const STAKEHOLDER_FILTER_OPTIONS = STAKEHOLDER_OPTIONS.map(s => ({ value: s.value, label: s.label }));

const SPLIT_BREAKPOINT_PX = 1120;

// Status lozenge appearance from workflow category
function statusToLozengeAppearance(s: WorkflowStatus | undefined): 'success' | 'inprogress' | 'default' {
  if (!s) return 'default';
  if (s.category === 'done')        return 'success';
  if (s.category === 'in_progress') return 'inprogress';
  return 'default';
}

// ─── Filter state shape — exactly the canonical BR facets, nothing more ──────

interface BrFilterState {
  request_type: string[];           // Type
  process_step: string[];           // Status
  urgency:      string[];           // Priority
  category:     string[];           // Category
  theme:        string[];           // Strategic theme
  delivery_manager: string[];       // project_manager_user_id
  product_owner: string[];          // po_user_id
  stakeholders: string[];           // Stakeholders (multi)
  planned_quarter: string[];        // Planned release
  targeted_only: boolean;           // Targeted feature checkbox
}

const EMPTY_FILTERS: BrFilterState = {
  request_type: [], process_step: [], urgency: [], category: [], theme: [],
  delivery_manager: [], product_owner: [], stakeholders: [], planned_quarter: [],
  targeted_only: false,
};

function brPassesFilters(br: BusinessRequest, f: BrFilterState): boolean {
  const r = br as any;
  if (f.request_type.length  && !f.request_type.includes(r.request_type))   return false;
  if (f.process_step.length  && !f.process_step.includes(r.process_step))   return false;
  if (f.urgency.length       && !f.urgency.includes(r.urgency))             return false;
  if (f.category.length      && !f.category.includes(r.category))           return false;
  if (f.theme.length         && !f.theme.includes(r.theme))                 return false;
  if (f.delivery_manager.length && !f.delivery_manager.includes(r.project_manager_user_id)) return false;
  if (f.product_owner.length    && !f.product_owner.includes(r.po_user_id))                 return false;
  if (f.stakeholders.length) {
    const rs: string[] = Array.isArray(r.stakeholders) ? r.stakeholders : [];
    if (!f.stakeholders.some(s => rs.includes(s))) return false;
  }
  if (f.planned_quarter.length) {
    const rq: string[] = Array.isArray(r.planned_quarter) ? r.planned_quarter : (r.planned_quarter ? [r.planned_quarter] : []);
    if (!f.planned_quarter.some(q => rq.includes(q))) return false;
  }
  if (f.targeted_only && !r.targeted_feature) return false;
  return true;
}

function countActiveBrFilters(f: BrFilterState): number {
  let n = 0;
  (Object.keys(f) as (keyof BrFilterState)[]).forEach(k => {
    const v = f[k];
    if (typeof v === 'boolean') n += v ? 1 : 0;
    else                        n += v.length;
  });
  return n;
}

// ─── Tiny portal dropdown (Atlaskit Popup has known empty-portal bug on this surface) ─

function FilterChip({
  label, count, isOpen, onOpenChange, children,
}: {
  label: string; count: number; isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      onOpenChange(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [isOpen, onOpenChange]);

  const isActive = count > 0;

  return (
    <>
      <button
        ref={triggerRef} type="button"
        onClick={() => onOpenChange(!isOpen)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 32, padding: '0 8px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 3,
          background: isActive ? token('color.background.selected', '#E9F2FE') : token('color.elevation.surface', '#FFFFFF'),
          color: isActive ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
          fontSize: 14, fontFamily: 'var(--cp-font-body)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {label}{count > 0 ? ` (${count})` : ''}
        <AkChevronDownIcon label="" />
      </button>
      {isOpen && anchor && ReactDOM.createPortal(
        <div ref={menuRef} style={{
          position: 'fixed', top: anchor.top, left: anchor.left, zIndex: 9001,
          background: token('elevation.surface.overlay', '#FFFFFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 4,
          boxShadow: `0 4px 16px ${token('color.blanket', 'rgba(9,30,66,0.16)')}`,
          minWidth: 240, maxWidth: 320, padding: '4px 0',
          maxHeight: 360, overflowY: 'auto',
        }}>
          {children(() => onOpenChange(false))}
        </div>,
        document.body,
      )}
    </>
  );
}

function MultiCheckList({
  options, selected, onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) {
    return <div style={{
      padding: '12px 16px', fontSize: 13, color: token('color.text.subtlest', '#6B778C'),
      fontFamily: 'var(--cp-font-body)',
    }}>No options.</div>;
  }
  return (
    <>
      {options.map(o => {
        const isOn = selected.includes(o.value);
        return (
          <label
            key={o.value}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', cursor: 'pointer',
              fontFamily: 'var(--cp-font-body)', fontSize: 14,
              background: isOn ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)') : 'transparent',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
            onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.background = isOn ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)') : 'transparent'; }}
          >
            <Checkbox isChecked={isOn} onChange={() => onToggle(o.value)} label="" />
            <span style={{ color: token('color.text', '#172B4D') }}>{o.label}</span>
          </label>
        );
      })}
    </>
  );
}

// ─── BR row card (left navigator panel item) ─────────────────────────────────

function BrRowCard({
  br, isActive, profile, onSelect,
}: {
  br: BusinessRequest;
  isActive: boolean;
  profile: ProfileRow | undefined;
  onSelect: () => void;
}) {
  const r = br as any;
  const requestKey = r.request_key as string;
  const title      = br.title || '(Untitled)';
  const targetDate = r.end_date as string | null;
  const requestType = r.request_type as string | null;
  const typeLabel  = requestType
    ? (REQUEST_TYPE_OPTIONS.find(t => t.value === requestType)?.label ?? requestType)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 4,
        width: '100%', textAlign: 'left',
        padding: '10px 12px 10px 16px', border: 'none',
        background: isActive ? token('color.background.selected', '#E9F2FE') : token('color.elevation.surface', '#FFFFFF'),
        cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background =
            token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)');
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background =
          isActive ? token('color.background.selected', '#E9F2FE') : token('color.elevation.surface', '#FFFFFF');
      }}
    >
      {isActive && (
        <span style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
          background: token('color.border.selected', '#0C66E4'),
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <JiraIssueTypeIcon type="Business Request" size={20} />
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500,
          color: isActive ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 28 }}>
        <span style={{
          fontSize: 11, fontWeight: 500, fontFamily: 'var(--cp-font-mono)',
          color: token('color.text.subtle', '#44546F'),
        }}>{requestKey}</span>
        {typeLabel && (
          <span style={{
            fontSize: 11, color: token('color.text.subtlest', '#6B778C'),
          }}>· {typeLabel}</span>
        )}
        {targetDate && (
          <span style={{
            fontSize: 11, color: token('color.text.subtlest', '#6B778C'),
          }}>· {targetDate}</span>
        )}
        {profile && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Avatar
              size="xsmall"
              name={profile.full_name || profile.email || '?'}
              src={profile.avatar_url ?? undefined}
            />
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Product header band ──────────────────────────────────────────────────────

function ProductChromeBand({ product }: { product: ProductInfo | null }) {
  if (!product) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', flexShrink: 0,
      background: token('color.elevation.surface', '#FFFFFF'),
      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 4, flexShrink: 0,
        background: token('color.background.brand.bold', '#0052CC'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: token('color.text.inverse', '#FFFFFF'),
      }}>
        {product.code.slice(0, 2)}
      </div>
      <span style={{
        fontSize: 14, fontWeight: 500,
        color: token('color.text', '#172B4D'),
        fontFamily: 'var(--cp-font-body)',
      }}>{product.name}</span>
      <span style={{
        fontSize: 11, fontFamily: 'var(--cp-font-mono)',
        color: token('color.text.subtlest', '#626F86'), marginLeft: 2,
      }}>{product.code}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SortKey = 'updated' | 'created' | 'end_date';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'process_step' | 'request_type' | 'urgency' | 'category';

export default function ProductNativeAllWorkPage() {
  const { key } = useParams<{ key: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Data ────────────────────────────────────────────────────────────────────
  const { product, loading: productLoading } = useProductInfo(key);
  const { data: brs = [], isLoading: brsLoading } = useBusinessRequestsByProduct(product?.id ?? null);
  const { statuses: workflowStatuses = [] } = useCatalystWorkflow('Business Request');
  const { data: profileMap = new Map<string, ProfileRow>() } = useProductProfiles(brs as BusinessRequest[]);
  const { data: releases = [] } = useReleaseNames();

  const statusBySlug = useMemo(() => {
    const m = new Map<string, WorkflowStatus>();
    workflowStatuses.forEach(s => m.set(s.slug, s));
    return m;
  }, [workflowStatuses]);

  // Filter option lists (computed from canonical sources, not items)
  const profileOptions = useMemo(() => {
    const arr = Array.from(profileMap.values())
      .map(p => ({ value: p.id, label: p.full_name || p.email || p.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return arr;
  }, [profileMap]);

  const statusOptions = useMemo(
    () => workflowStatuses.map(s => ({ value: s.slug, label: s.name })),
    [workflowStatuses],
  );

  const releaseOptions = useMemo(
    () => releases.map((r: any) => ({ value: r.name, label: r.name })),
    [releases],
  );

  // ── Toolbar state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filters,     setFilters]     = useState<BrFilterState>(EMPTY_FILTERS);
  const [openChip,    setOpenChip]    = useState<string | null>(null);
  const [sortKey,     setSortKey]     = useState<SortKey>('updated');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [groupBy,     setGroupBy]     = useState<GroupBy>('none');

  const toggleFilter = useCallback(<K extends keyof BrFilterState>(
    facet: K, value: BrFilterState[K] extends string[] ? string : never,
  ) => {
    setFilters(prev => {
      const arr = prev[facet] as unknown as string[];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [facet]: next };
    });
  }, []);

  const setOpenChipForKey = useCallback((k: string, open: boolean) => {
    setOpenChip(open ? k : null);
  }, []);

  // ── Apply filters + sort ────────────────────────────────────────────────────
  const visibleBrs = useMemo(() => {
    let arr = (brs as BusinessRequest[]).filter(br => brPassesFilters(br, filters));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      arr = arr.filter(br => {
        const r = br as any;
        return (br.title || '').toLowerCase().includes(q)
            || (r.request_key || '').toLowerCase().includes(q)
            || (r.arabic_title || '').toLowerCase().includes(q);
      });
    }
    arr = [...arr].sort((a, b) => {
      const av = sortKey === 'end_date' ? ((a as any).end_date ?? '')
              : sortKey === 'created'   ? ((a as any).created_at ?? '')
              :                           ((a as any).updated_at ?? '');
      const bv = sortKey === 'end_date' ? ((b as any).end_date ?? '')
              : sortKey === 'created'   ? ((b as any).created_at ?? '')
              :                           ((b as any).updated_at ?? '');
      const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [brs, filters, searchQuery, sortKey, sortDir]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const urlBr = searchParams.get('br');
  const [selectedKey, setSelectedKey] = useState<string | null>(urlBr);

  // Hydrate / re-hydrate when URL changes externally
  useEffect(() => {
    if (urlBr && urlBr !== selectedKey) setSelectedKey(urlBr);
  }, [urlBr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first when nothing selected and list ready
  useEffect(() => {
    if (selectedKey) return;
    if (visibleBrs.length === 0) return;
    const first = (visibleBrs[0] as any).request_key as string | undefined;
    if (first) setSelectedKey(first);
  }, [selectedKey, visibleBrs]);

  // Mirror selection → URL
  useEffect(() => {
    const current = searchParams.get('br');
    if (selectedKey && selectedKey !== current) {
      setSearchParams(p => {
        const n = new URLSearchParams(p);
        n.set('br', selectedKey);
        return n;
      }, { replace: true });
    } else if (!selectedKey && current) {
      setSearchParams(p => {
        const n = new URLSearchParams(p);
        n.delete('br');
        return n;
      }, { replace: true });
    }
  }, [selectedKey, searchParams, setSearchParams]);

  // ── Narrow / overlay mode ───────────────────────────────────────────────────
  const splitRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const el = splitRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(w > 0 && w < SPLIT_BREAKPOINT_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [overlayKey, setOverlayKey] = useState<string | null>(null);

  // ── Keyboard nav (↑↓ Enter) ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (visibleBrs.length === 0) return;
      const idx = visibleBrs.findIndex(b => (b as any).request_key === selectedKey);
      const next = e.key === 'ArrowDown'
        ? Math.min(visibleBrs.length - 1, idx + 1)
        : Math.max(0, idx - 1);
      const nextKey = (visibleBrs[next] as any)?.request_key;
      if (nextKey) {
        e.preventDefault();
        if (isNarrow) setOverlayKey(nextKey); else setSelectedKey(nextKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visibleBrs, selectedKey, isNarrow]);

  // ── Groups (flat or grouped list) ───────────────────────────────────────────
  const groupedBrs = useMemo(() => {
    if (groupBy === 'none') return null;
    const buckets = new Map<string, BusinessRequest[]>();
    visibleBrs.forEach(br => {
      const r = br as any;
      const k = groupBy === 'process_step' ? (r.process_step ?? '')
             : groupBy === 'request_type' ? (r.request_type ?? '')
             : groupBy === 'urgency'       ? (r.urgency ?? '')
             :                               (r.category ?? '');
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(br);
    });
    return Array.from(buckets.entries()).map(([k, rows]) => {
      let label = k || 'None';
      if (groupBy === 'process_step') {
        label = statusBySlug.get(k)?.name ?? (k || 'No status');
      } else if (groupBy === 'request_type') {
        label = TYPE_OPTIONS.find(t => t.value === k)?.label ?? (k || 'No type');
      }
      return { id: k || '__none', label, rows };
    });
  }, [visibleBrs, groupBy, statusBySlug]);

  const handleSelect = useCallback((k: string) => {
    if (isNarrow) setOverlayKey(k); else setSelectedKey(k);
  }, [isNarrow]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (productLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', padding: 48, color: token('color.text.subtlest', '#626F86'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        <Spinner size="medium" />
      </div>
    );
  }
  if (!product && key) {
    return (
      <div style={{
        padding: 48, textAlign: 'center',
        color: token('color.text.subtlest', '#626F86'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        Product <strong>{key}</strong> not found.{' '}
        <a href="/product-hub/products" style={{ color: token('color.link', '#0052CC') }}>
          ← Back to products
        </a>
      </div>
    );
  }

  const totalFiltersActive = countActiveBrFilters(filters);
  const activeBr = (visibleBrs as any[]).find(b => b.request_key === selectedKey) as BusinessRequest | undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
      background: token('color.elevation.surface', '#FFFFFF'),
    }}>
      <ProductChromeBand product={product} />

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 12px', flexShrink: 0,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        background: token('color.elevation.surface', '#FFFFFF'),
      }}>
        {/* Search */}
        <div style={{ width: 280, maxWidth: '100%' }}>
          <Textfield
            isCompact
            placeholder="Search requests"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            elemBeforeInput={
              <span style={{ paddingInlineStart: 8, display: 'flex', alignItems: 'center', color: token('color.text.subtlest', '#6B778C') }}>
                <AkSearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={searchQuery ? (
              <button
                type="button" aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#6B778C'), padding: '0 8px 0 0' }}
              >
                <AkCloseIcon label="" size="small" />
              </button>
            ) : undefined}
          />
        </div>

        {/* Type */}
        <FilterChip label="Type" count={filters.request_type.length} isOpen={openChip === 'type'} onOpenChange={o => setOpenChipForKey('type', o)}>
          {() => <MultiCheckList options={TYPE_OPTIONS} selected={filters.request_type} onToggle={v => toggleFilter('request_type', v as any)} />}
        </FilterChip>

        {/* Status */}
        <FilterChip label="Status" count={filters.process_step.length} isOpen={openChip === 'status'} onOpenChange={o => setOpenChipForKey('status', o)}>
          {() => <MultiCheckList options={statusOptions} selected={filters.process_step} onToggle={v => toggleFilter('process_step', v as any)} />}
        </FilterChip>

        {/* Priority */}
        <FilterChip label="Priority" count={filters.urgency.length} isOpen={openChip === 'priority'} onOpenChange={o => setOpenChipForKey('priority', o)}>
          {() => <MultiCheckList options={PRIORITY_OPTIONS} selected={filters.urgency} onToggle={v => toggleFilter('urgency', v as any)} />}
        </FilterChip>

        {/* Category */}
        <FilterChip label="Category" count={filters.category.length} isOpen={openChip === 'category'} onOpenChange={o => setOpenChipForKey('category', o)}>
          {() => <MultiCheckList options={CATEGORY_OPTIONS} selected={filters.category} onToggle={v => toggleFilter('category', v as any)} />}
        </FilterChip>

        {/* Strategic theme */}
        <FilterChip label="Strategic theme" count={filters.theme.length} isOpen={openChip === 'theme'} onOpenChange={o => setOpenChipForKey('theme', o)}>
          {() => <MultiCheckList options={THEME_FILTER_OPTIONS} selected={filters.theme} onToggle={v => toggleFilter('theme', v as any)} />}
        </FilterChip>

        {/* Delivery Manager */}
        <FilterChip label="Delivery Manager" count={filters.delivery_manager.length} isOpen={openChip === 'dm'} onOpenChange={o => setOpenChipForKey('dm', o)}>
          {() => <MultiCheckList options={profileOptions} selected={filters.delivery_manager} onToggle={v => toggleFilter('delivery_manager', v as any)} />}
        </FilterChip>

        {/* Product Owner */}
        <FilterChip label="Product Owner" count={filters.product_owner.length} isOpen={openChip === 'po'} onOpenChange={o => setOpenChipForKey('po', o)}>
          {() => <MultiCheckList options={profileOptions} selected={filters.product_owner} onToggle={v => toggleFilter('product_owner', v as any)} />}
        </FilterChip>

        {/* Stakeholders */}
        <FilterChip label="Stakeholders" count={filters.stakeholders.length} isOpen={openChip === 'stk'} onOpenChange={o => setOpenChipForKey('stk', o)}>
          {() => <MultiCheckList options={STAKEHOLDER_FILTER_OPTIONS} selected={filters.stakeholders} onToggle={v => toggleFilter('stakeholders', v as any)} />}
        </FilterChip>

        {/* Planned release */}
        <FilterChip label="Planned release" count={filters.planned_quarter.length} isOpen={openChip === 'rel'} onOpenChange={o => setOpenChipForKey('rel', o)}>
          {() => <MultiCheckList options={releaseOptions} selected={filters.planned_quarter} onToggle={v => toggleFilter('planned_quarter', v as any)} />}
        </FilterChip>

        {/* Targeted only */}
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 32, padding: '0 8px', borderRadius: 3,
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: filters.targeted_only ? token('color.background.selected', '#E9F2FE') : token('color.elevation.surface', '#FFFFFF'),
          color: filters.targeted_only ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
          fontSize: 14, fontFamily: 'var(--cp-font-body)', cursor: 'pointer',
        }}>
          <Checkbox isChecked={filters.targeted_only} onChange={e => setFilters(p => ({ ...p, targeted_only: (e.target as HTMLInputElement).checked }))} label="" />
          Targeted only
        </label>

        {/* Clear filters */}
        {totalFiltersActive > 0 && (
          <Button appearance="subtle" spacing="compact" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        )}

        {/* Right cluster */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip content={`Sort: ${sortKey} ${sortDir.toUpperCase()}`}>
            <IconButton
              appearance="subtle"
              icon={sortDir === 'desc' ? AkSortDownIcon as any : AkSortIcon as any}
              label="Toggle sort direction"
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            />
          </Tooltip>
          <FilterChip label={`Sort: ${sortKey}`} count={0} isOpen={openChip === 'sort'} onOpenChange={o => setOpenChipForKey('sort', o)}>
            {(close) => (
              <>
                {(['updated', 'created', 'end_date'] as SortKey[]).map(k => (
                  <button
                    key={k} type="button"
                    onClick={() => { setSortKey(k); close(); }}
                    style={{
                      display: 'block', width: '100%', padding: '8px 16px', border: 'none',
                      background: sortKey === k ? token('color.background.selected', '#E9F2FE') : 'transparent',
                      color: sortKey === k ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
                      cursor: 'pointer', textAlign: 'left', fontSize: 14,
                      fontFamily: 'var(--cp-font-body)',
                    }}
                  >
                    {k === 'end_date' ? 'Target date' : k === 'created' ? 'Created' : 'Updated'}
                  </button>
                ))}
              </>
            )}
          </FilterChip>
          <FilterChip label={`Group: ${groupBy === 'none' ? 'None' : groupBy === 'process_step' ? 'Status' : groupBy === 'request_type' ? 'Type' : groupBy === 'urgency' ? 'Priority' : 'Category'}`} count={groupBy === 'none' ? 0 : 1} isOpen={openChip === 'group'} onOpenChange={o => setOpenChipForKey('group', o)}>
            {(close) => (
              <>
                {([
                  { key: 'none',         label: 'None' },
                  { key: 'process_step', label: 'Status' },
                  { key: 'request_type', label: 'Type' },
                  { key: 'urgency',      label: 'Priority' },
                  { key: 'category',     label: 'Category' },
                ] as { key: GroupBy; label: string }[]).map(o => (
                  <button
                    key={o.key} type="button"
                    onClick={() => { setGroupBy(o.key); close(); }}
                    style={{
                      display: 'block', width: '100%', padding: '8px 16px', border: 'none',
                      background: groupBy === o.key ? token('color.background.selected', '#E9F2FE') : 'transparent',
                      color: groupBy === o.key ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
                      cursor: 'pointer', textAlign: 'left', fontSize: 14,
                      fontFamily: 'var(--cp-font-body)',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </>
            )}
          </FilterChip>
        </div>
      </div>

      {/* Split region */}
      <div ref={splitRef} style={{
        flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden',
        gap: 0, padding: 0,
      }}>
        {/* LEFT: navigator panel */}
        <div style={{
          width: isNarrow ? '100%' : 360, flexShrink: 0,
          background: token('color.elevation.surface', '#FFFFFF'),
          borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
          display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          {/* Status lozenge bar (active filter chips summary) */}
          {totalFiltersActive > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 4,
              padding: '6px 12px',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              background: token('color.background.neutral.subtle', '#F7F8F9'),
            }}>
              <span style={{
                fontSize: 11, color: token('color.text.subtle', '#44546F'),
                fontFamily: 'var(--cp-font-body)',
              }}>
                {visibleBrs.length} of {brs.length} match
              </span>
            </div>
          )}

          {/* List */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {brsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                <Spinner size="medium" />
              </div>
            ) : visibleBrs.length === 0 ? (
              <div style={{
                padding: 32, textAlign: 'center', fontSize: 13,
                color: token('color.text.subtle', '#44546F'),
                fontFamily: 'var(--cp-font-body)',
              }}>
                No business requests match your filters.
              </div>
            ) : groupedBrs ? (
              groupedBrs.map(g => (
                <div key={g.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    background: token('color.background.neutral.subtle', '#F7F8F9'),
                    borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                    fontSize: 12, fontWeight: 600,
                    color: token('color.text.subtle', '#44546F'),
                    fontFamily: 'var(--cp-font-body)',
                  }}>
                    {groupBy === 'process_step' ? (
                      <Lozenge appearance={statusToLozengeAppearance(statusBySlug.get(g.id))}>{g.label}</Lozenge>
                    ) : (
                      <span>{g.label}</span>
                    )}
                    <span style={{ color: token('color.text.subtlest', '#6B778C') }}>({g.rows.length})</span>
                  </div>
                  {g.rows.map(br => {
                    const r = br as any;
                    const dm = r.project_manager_user_id ? profileMap.get(r.project_manager_user_id) : undefined;
                    return (
                      <BrRowCard
                        key={r.id}
                        br={br}
                        isActive={selectedKey === r.request_key}
                        profile={dm}
                        onSelect={() => handleSelect(r.request_key)}
                      />
                    );
                  })}
                </div>
              ))
            ) : (
              visibleBrs.map(br => {
                const r = br as any;
                const dm = r.project_manager_user_id ? profileMap.get(r.project_manager_user_id) : undefined;
                return (
                  <BrRowCard
                    key={r.id}
                    br={br}
                    isActive={selectedKey === r.request_key}
                    profile={dm}
                    onSelect={() => handleSelect(r.request_key)}
                  />
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            fontSize: 12, color: token('color.text.subtle', '#44546F'),
            fontFamily: 'var(--cp-font-body)',
          }}>
            <span>{visibleBrs.length} request{visibleBrs.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* RIGHT: detail panel */}
        {!isNarrow && (
          activeBr ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
              background: token('color.elevation.surface', '#FFFFFF'),
            }}>
              <Suspense fallback={
                <div style={{ padding: 24, fontSize: 14, color: token('color.text.subtlest', '#626F86') }}>
                  Loading…
                </div>
              }>
                <CatalystDetailRouter
                  isOpen={true}
                  onClose={() => setSelectedKey(null)}
                  itemId={(activeBr as any).request_key}
                  itemType="business_request"
                  projectId={product?.id}
                  projectKey={key ?? ''}
                  panelMode={true}
                  navigationItems={visibleBrs.map((b: any) => ({
                    id: b.request_key,
                    summary: b.title,
                    issue_key: b.request_key,
                  }))}
                  onNavigate={(id: string) => setSelectedKey(id)}
                />
              </Suspense>
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '0 32px', fontFamily: 'var(--cp-font-body)',
            }}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                <rect x="8" y="16" width="64" height="48" rx="6"
                  fill={token('color.background.neutral', '#F7F8F9')}
                  stroke={token('color.border', '#DFE1E6')} strokeWidth="1.5" />
                <rect x="16" y="28" width="24" height="4" rx="2" fill={token('color.background.neutral.pressed', '#C1C7D0')} />
                <rect x="16" y="38" width="36" height="4" rx="2" fill={token('color.background.neutral.pressed', '#C1C7D0')} />
                <rect x="16" y="48" width="20" height="4" rx="2" fill={token('color.background.neutral.pressed', '#C1C7D0')} />
                <circle cx="56" cy="52" r="14"
                  fill={token('color.background.information', '#E9F2FF')}
                  stroke={token('color.border.information', '#CCE0FF')} strokeWidth="1.5" />
                <path d="M56 46v6l4 2"
                  stroke={token('color.icon.information', '#1868DB')}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{
                margin: 0, fontSize: 16, fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}>
                Select a business request
              </p>
              <p style={{
                margin: 0, fontSize: 14, fontWeight: 400, textAlign: 'center',
                color: token('color.text.subtle', '#44546F'),
                maxWidth: 280, lineHeight: '20px',
              }}>
                Choose a request from the list to view its details, comments, and related work.
              </p>
            </div>
          )
        )}
      </div>

      {/* Narrow-mode overlay */}
      {overlayKey && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setOverlayKey(null)}
            itemId={overlayKey}
            itemType="business_request"
            projectId={product?.id ?? ''}
            projectKey={key ?? ''}
            navigationItems={visibleBrs.map((b: any) => ({
              id: b.request_key,
              summary: b.title,
              issue_key: b.request_key,
            }))}
            onNavigate={(id: string) => { setOverlayKey(id); setSelectedKey(id); }}
          />
        </Suspense>
      )}
    </div>
  );
}
