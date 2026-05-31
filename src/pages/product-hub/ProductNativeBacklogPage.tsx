/**
 * ProductNativeBacklogPage — /product-hub/:key/backlog
 *
 * Visual parity with BacklogPage.atlaskit.tsx — identical toolbar, column
 * picker, bulk-select, inline create, group by, URL sync.
 * Data source: business_requests (product fields). Statuses from demand_process_steps.
 */

import React, {
  useState, useCallback, useEffect, useMemo,
  useRef, useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import AkMoreIcon from '@atlaskit/icon/glyph/more';
import AkRefreshIcon from '@atlaskit/icon/core/refresh';
import AkDownloadIcon from '@atlaskit/icon/core/download';
import AkLinkIcon from '@atlaskit/icon/core/link';
import AkCopyIcon from '@atlaskit/icon/core/copy';
import AkTrashIcon from '@atlaskit/icon/core/delete';

import { AtlaskitPageShell } from '@/components/ads';
import {
  JiraTable, FlagsHost, flag, BulkFooterBar,
  makeKeyCell, makeDateCell, makePriorityCell, makeRowMenuCell,
  type LozengeAppearance,
} from '@/components/shared/JiraTable';
import {
  JiraFilterAtlaskit, emptyFilterValue, countActiveFilters,
  type JiraFilterValue, type StatusFilterOption, type WorkTypeOption,
} from '@/components/shared/JiraFilterAtlaskit';
import type { Column, RowGroup } from '@/components/shared/JiraTable/types';
import { supabase } from '@/integrations/supabase/client';
import {
  useBusinessRequestsByProduct,
  useCreateBusinessRequest,
  useDeleteBusinessRequest,
} from '@/hooks/useBusinessRequests';
import {
  useActiveDemandProcessSteps,
  stepToLozengeAppearance,
  type DemandProcessStep,
} from '@/hooks/useDemandProcessSteps';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import type { BusinessRequest } from '@/types/business-request';

// ─── Product resolution ──────────────────────────────────────────────────────

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

// ─── Profile name lookup ──────────────────────────────────────────────────────

function useProfileNames(rows: BusinessRequest[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = new Set<string>();
    rows.forEach(r => {
      if ((r as any).project_manager_user_id) ids.add((r as any).project_manager_user_id);
      if ((r as any).po_user_id) ids.add((r as any).po_user_id);
    });
    if (!ids.size) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(ids));
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: any) => { map[p.id] = p.full_name || '—'; });
        setNames(map);
      }
    })();
  }, [rows]);
  return names;
}

// ─── ToolbarMenuButton (mirrors BacklogPage pattern — @atlaskit/dropdown-menu
//     has an empty-portal bug on this surface; bespoke createPortal required) ──

type ToolbarMenuItem = {
  id: string; label: string; icon?: React.ReactNode;
  isDisabled?: boolean; onClick?: () => void; opensModal?: boolean;
};
type ToolbarMenuGroup = { title?: string; items: ToolbarMenuItem[] };

function ToolbarMenuButton({
  icon, ariaLabel, tooltipContent, groups,
}: {
  icon: React.ReactNode; ariaLabel: string;
  tooltipContent: string; groups: ToolbarMenuGroup[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [isOpen]);

  const BTN_STYLE: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, border: 'none', borderRadius: 3,
    background: isOpen ? token('color.background.neutral.hovered', '#DCDFE4') : 'transparent',
    color: token('color.text.subtle', '#42526E'), cursor: 'pointer', padding: 0,
  };

  return (
    <>
      <Tooltip content={tooltipContent}>
        <button
          ref={triggerRef} type="button" aria-label={ariaLabel}
          aria-haspopup="menu" aria-expanded={isOpen}
          style={BTN_STYLE}
          onClick={() => setIsOpen(v => !v)}
          onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
          onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          {icon}
        </button>
      </Tooltip>
      {isOpen && anchor && ReactDOM.createPortal(
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
          <div
            ref={menuRef} role="menu"
            style={{
              position: 'fixed', top: anchor.top, right: anchor.right, zIndex: 9001,
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 4, boxShadow: `0 4px 16px ${token('color.blanket', 'rgba(9,30,66,0.16)')}`,
              minWidth: 220, padding: '4px 0',
            }}
          >
            {groups.map((g, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <div style={{ height: 1, background: token('color.border', '#DFE1E6'), margin: '4px 0' }} />}
                {g.items.map(item => (
                  <button
                    key={item.id} role="menuitem" type="button"
                    disabled={item.isDisabled}
                    onClick={() => { if (!item.isDisabled) { item.onClick?.(); if (!item.opensModal) setIsOpen(false); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 16px', border: 'none',
                      background: 'transparent', textAlign: 'left',
                      fontSize: 14, fontWeight: 400, fontFamily: 'var(--cp-font-body)',
                      color: item.isDisabled ? token('color.text.disabled', '#8590A2') : token('color.text', '#172B4D'),
                      cursor: item.isDisabled ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!item.isDisabled) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {item.icon && <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>}
                    {item.label}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// ─── Group by control ─────────────────────────────────────────────────────────

type GroupByKey = 'none' | 'status' | 'type' | 'priority';
const GROUP_BY_LABELS: Record<GroupByKey, string> = {
  none: 'None', status: 'Status', type: 'Type', priority: 'Priority',
};
const GROUP_BY_OPTIONS: GroupByKey[] = ['none', 'status', 'type', 'priority'];

function GroupByControl({ value, onChange }: { value: GroupByKey; onChange: (v: GroupByKey) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={isOpen}
        onClick={() => setIsOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 32, padding: '0 8px',
          border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3,
          background: value !== 'none' ? token('color.background.selected', '#E9F2FE') : token('color.elevation.surface', '#FFFFFF'),
          color: value !== 'none' ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
          fontSize: 14, fontWeight: 400, cursor: 'pointer', fontFamily: 'var(--cp-font-body)', whiteSpace: 'nowrap',
        }}
      >
        {value === 'none' ? 'Group' : `Group: ${GROUP_BY_LABELS[value]}`}
        <AkChevronDownIcon label="" />
      </button>
      {isOpen && anchor && ReactDOM.createPortal(
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
          <div ref={menuRef} role="listbox" style={{
            position: 'fixed', top: anchor.top, left: anchor.left, zIndex: 9001,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4, boxShadow: `0 4px 16px ${token('color.blanket', 'rgba(9,30,66,0.16)')}`,
            minWidth: 180, padding: '4px 0',
          }}>
            {GROUP_BY_OPTIONS.map(opt => (
              <button
                key={opt} role="option" aria-selected={value === opt} type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                style={{
                  display: 'block', width: '100%', padding: '8px 16px', border: 'none',
                  background: value === opt ? token('color.background.selected', '#E9F2FE') : 'transparent',
                  textAlign: 'left', fontSize: 14,
                  fontWeight: value === opt ? 500 : 400,
                  color: value === opt ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
                onMouseLeave={e => { e.currentTarget.style.background = value === opt ? token('color.background.selected', '#E9F2FE') : 'transparent'; }}
              >
                {GROUP_BY_LABELS[opt]}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// ─── Inline create footer row ─────────────────────────────────────────────────

function InlineCreateRow({
  productId,
  firstStepValue,
  onCreated,
  onCancel,
}: {
  productId: string;
  firstStepValue: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const createMutation = useCreateBusinessRequest();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) { onCancel(); return; }
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        title: trimmed,
        product_id: productId,
        process_step: firstStepValue,
      } as any);
      flag.success('Created', trimmed.slice(0, 60));
      setTitle('');
      onCreated();
    } catch (e: any) {
      flag.error('Create failed', e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
      background: token('color.background.selected', '#E9F2FE'),
    }}>
      <div style={{ flex: 1 }}>
        <Textfield
          ref={inputRef}
          isCompact
          value={title}
          placeholder="What needs to be done?"
          onChange={e => setTitle((e.target as HTMLInputElement).value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
        />
      </div>
      <Button appearance="primary" spacing="compact" isDisabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Creating…' : 'Create'}
      </Button>
      <Button appearance="subtle" spacing="compact" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ─── Cell components ──────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature', gap: 'Business gap',
  integration: 'Integration', data_request: 'Data request',
};

function StatusCell({ row, stepMap }: { row: BusinessRequest; stepMap: Map<string, DemandProcessStep> }) {
  const value = (row as any).process_step ?? null;
  const step = value ? stepMap.get(value) : undefined;
  const label = step?.label ?? (value ? value.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) : '—');
  const appearance: LozengeAppearance = step ? stepToLozengeAppearance(step) : 'default';
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}

function AvatarCell({ name }: { name?: string | null }) {
  if (!name) return <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: 12 }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Avatar size="xsmall" name={name} />
      <span style={{ fontSize: 12, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </span>
  );
}

function QuarterCell({ row }: { row: BusinessRequest }) {
  const q = ((row as any).planned_quarter as string[] | null);
  if (!q?.length) return <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: 12 }}>—</span>;
  return <span style={{ fontSize: 12, color: token('color.text', '#172B4D') }}>{q.join(', ')}</span>;
}

function ScoreCell({ row }: { row: BusinessRequest }) {
  const s = (row as any).business_score ?? null;
  if (s === null) return <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: 12 }}>—</span>;
  return <span style={{ fontSize: 12, fontWeight: 500, color: token('color.text', '#172B4D'), fontFamily: 'var(--cp-font-mono)' }}>{s}</span>;
}

// ─── Column schema ────────────────────────────────────────────────────────────

const DEFAULT_VISIBLE: ReadonlySet<string> = new Set([
  'request_key', 'title', 'request_type', 'process_step', 'urgency',
  'project_manager_user_id', 'po_user_id', 'end_date', '__actions',
]);

function buildColumns(
  profileNames: Record<string, string>,
  stepMap: Map<string, DemandProcessStep>,
  onOpen: (row: BusinessRequest) => void,
  onDelete: (row: BusinessRequest) => void,
): Column<BusinessRequest>[] {
  return [
    {
      id: 'request_key', label: 'Key', width: 9, sortable: true, alwaysVisible: true, defaultVisible: true,
      accessor: r => (r as any).request_key ?? '',
      cell: makeKeyCell(r => (r as any).request_key ?? '', () => {}),
    },
    {
      id: 'title', label: 'Title', width: 24, sortable: true, alwaysVisible: true, defaultVisible: true,
      accessor: r => r.title ?? '',
      cell: ({ row }) => (
        <span style={{ fontSize: 13, color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {row.title || '—'}
        </span>
      ),
    },
    {
      id: 'request_type', label: 'Type', width: 10, sortable: true, defaultVisible: true,
      accessor: r => (r as any).request_type ?? '',
      cell: ({ row }) => (
        <span style={{ fontSize: 12, fontWeight: 500, color: token('color.text.subtle', '#42526E') }}>
          {TYPE_LABEL[(row as any).request_type?.toLowerCase()] ?? (row as any).request_type ?? '—'}
        </span>
      ),
    },
    {
      id: 'process_step', label: 'Status', width: 11, sortable: true, defaultVisible: true,
      accessor: r => (r as any).process_step ?? '',
      cell: ({ row }) => <StatusCell row={row} stepMap={stepMap} />,
    },
    {
      id: 'urgency', label: 'Priority', width: 8, sortable: true, defaultVisible: true,
      accessor: r => (r as any).urgency ?? '',
      cell: makePriorityCell(r => (r as any).urgency ?? null),
    },
    {
      id: 'project_manager_user_id', label: 'Delivery manager', width: 13, sortable: false, defaultVisible: true,
      accessor: r => profileNames[(r as any).project_manager_user_id] ?? '',
      cell: ({ row }) => <AvatarCell name={profileNames[(row as any).project_manager_user_id]} />,
    },
    {
      id: 'po_user_id', label: 'Product owner', width: 13, sortable: false, defaultVisible: true,
      accessor: r => profileNames[(r as any).po_user_id] ?? '',
      cell: ({ row }) => <AvatarCell name={profileNames[(row as any).po_user_id]} />,
    },
    {
      id: 'end_date', label: 'Target date', width: 9, sortable: true, defaultVisible: true,
      accessor: r => (r as any).end_date ?? '',
      cell: makeDateCell(r => (r as any).end_date ?? null),
    },
    {
      id: 'category', label: 'Category', width: 10, sortable: true, defaultVisible: false,
      accessor: r => (r as any).category ?? '',
      cell: ({ row }) => <span style={{ fontSize: 12, color: token('color.text.subtle', '#42526E') }}>{(row as any).category || '—'}</span>,
    },
    {
      id: 'theme', label: 'Theme', width: 12, sortable: true, defaultVisible: false,
      accessor: r => (r as any).theme ?? '',
      cell: ({ row }) => <span style={{ fontSize: 12, color: token('color.text.subtle', '#42526E') }}>{(row as any).theme || '—'}</span>,
    },
    {
      id: 'planned_quarter', label: 'Planned release', width: 11, sortable: false, defaultVisible: false,
      accessor: r => ((r as any).planned_quarter ?? []).join(','),
      cell: ({ row }) => <QuarterCell row={row} />,
    },
    {
      id: 'business_score', label: 'Score', width: 6, sortable: true, defaultVisible: false,
      accessor: r => String((r as any).business_score ?? ''),
      cell: ({ row }) => <ScoreCell row={row} />,
    },
    {
      id: 'targeted_feature', label: 'Targeted', width: 7, sortable: true, defaultVisible: false,
      accessor: r => String((r as any).targeted_feature ?? false),
      cell: ({ row }) => (
        (row as any).targeted_feature
          ? <span style={{ color: token('color.text.success', '#006644'), fontSize: 11, fontWeight: 600 }}>Priority</span>
          : <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: 12 }}>—</span>
      ),
    },
    {
      id: 'arabic_title', label: 'Arabic title', width: 14, sortable: false, defaultVisible: false,
      accessor: r => (r as any).arabic_title ?? '',
      cell: ({ row }) => {
        const t = (row as any).arabic_title as string | null;
        return t
          ? <span style={{ fontSize: 12, color: token('color.text', '#172B4D'), direction: 'rtl', display: 'block', textAlign: 'right' }}>{t}</span>
          : <span style={{ color: token('color.text.subtlest', '#6B778C'), fontSize: 12 }}>—</span>;
      },
    },
    {
      id: '__actions', label: '', width: 4, sortable: false, alwaysVisible: true, defaultVisible: true,
      accessor: () => '',
      cell: makeRowMenuCell({
        onOpen,
        onDelete,
      }),
    },
  ];
}

// ─── Group builders ───────────────────────────────────────────────────────────

function buildGroups(
  rows: BusinessRequest[],
  groupBy: GroupByKey,
  stepMap: Map<string, DemandProcessStep>,
): RowGroup<BusinessRequest>[] | null {
  if (groupBy === 'none') return null;
  const buckets = new Map<string, BusinessRequest[]>();
  rows.forEach(r => {
    const key = groupBy === 'status' ? ((r as any).process_step ?? '')
              : groupBy === 'type'   ? ((r as any).request_type ?? '')
              : ((r as any).urgency ?? '');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  });
  const groups: RowGroup<BusinessRequest>[] = [];
  for (const [key, groupRows] of buckets) {
    let label = key;
    let labelNode: React.ReactNode | undefined;
    if (groupBy === 'status') {
      const step = stepMap.get(key);
      label = (step?.label ?? (key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()))) || 'No status';
      const appearance: LozengeAppearance = step ? stepToLozengeAppearance(step) : 'default';
      labelNode = <Lozenge appearance={appearance}>{label}</Lozenge>;
    } else if (groupBy === 'type') {
      label = TYPE_LABEL[key?.toLowerCase()] ?? key ?? 'No type';
    } else {
      label = key ? key.charAt(0).toUpperCase() + key.slice(1) : 'No priority';
    }
    groups.push({ id: key || '__none', label, labelNode, rows: groupRows });
  }
  if (groupBy === 'status') {
    groups.sort((a, b) => {
      const ao = stepMap.get(a.id)?.sort_order ?? 999;
      const bo = stepMap.get(b.id)?.sort_order ?? 999;
      return ao - bo;
    });
  }
  return groups;
}

// ─── Product chrome band ──────────────────────────────────────────────────────

function ProductChromeBand({ product }: { product: ProductInfo | null }) {
  if (!product) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <div style={{
        width: 24, height: 24, borderRadius: 4, flexShrink: 0,
        background: token('color.background.brand.bold', '#0052CC'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: token('color.text.inverse', '#FFFFFF'),
      }}>
        {product.code.slice(0, 2)}
      </div>
      <span style={{ fontSize: 20, fontWeight: 500, color: token('color.text', '#172B4D'), lineHeight: '24px' }}>
        {product.name}
      </span>
      <span style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86'), fontFamily: 'var(--cp-font-mono)', marginLeft: 4 }}>
        {product.code}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductNativeBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { product, loading: productLoading } = useProductInfo(key);
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading: rowsLoading } = useBusinessRequestsByProduct(product?.id ?? null);
  const { data: processSteps = [] } = useActiveDemandProcessSteps();
  const deleteMutation = useDeleteBusinessRequest();
  const stepMap = useMemo(() => new Map(processSteps.map(s => [s.value, s])), [processSteps]);
  const profileNames = useProfileNames(rows);
  const openDetail = useGlobalSearchStore(s => s.openDetail);

  // ── URL-synced state (mirrors BacklogPage pattern) ──
  const [search,   setSearch]   = useState(() => searchParams.get('q') || '');
  const [groupBy,  setGroupBy]  = useState<GroupByKey>(() => (searchParams.get('groupBy') || 'none') as GroupByKey);
  const [sortKey,  setSortKey]  = useState<string | null>(() => searchParams.get('sort') || null);
  const [sortDir,  setSortDir]  = useState<'ASC'|'DESC'>(() => (searchParams.get('dir') as 'ASC'|'DESC') || 'ASC');
  const [filterValue, setFilterValue] = useState<JiraFilterValue>(emptyFilterValue);
  const [visibleColumns, setVisibleColumns] = useState<ReadonlySet<string>>(DEFAULT_VISIBLE);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen,    setCreateOpen]    = useState(false);
  const [footerActive,  setFooterActive]  = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<BusinessRequest | null>(null);
  const [syncing,       setSyncing]       = useState(false);

  // sync state → URL
  useEffect(() => {
    setSearchParams(p => {
      const next = new URLSearchParams(p);
      search    ? next.set('q', search)          : next.delete('q');
      groupBy !== 'none' ? next.set('groupBy', groupBy) : next.delete('groupBy');
      sortKey   ? next.set('sort', sortKey)      : next.delete('sort');
      sortKey   ? next.set('dir', sortDir)       : next.delete('dir');
      return next;
    }, { replace: true });
  }, [search, groupBy, sortKey, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter + sort pipeline ──
  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        (r as any).request_key?.toLowerCase().includes(q) ||
        (r as any).arabic_title?.toLowerCase().includes(q)
      );
    }
    // Filter panel — work type
    if (filterValue.workType.length > 0) {
      result = result.filter(r => filterValue.workType.includes((r as any).request_type ?? ''));
    }
    // Filter panel — statuses
    if (filterValue.status.length > 0) {
      result = result.filter(r => filterValue.status.includes((r as any).process_step ?? ''));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String((a as any)[sortKey] ?? '');
        const bv = String((b as any)[sortKey] ?? '');
        const cmp = av.localeCompare(bv);
        return sortDir === 'ASC' ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, filterValue, sortKey, sortDir]);

  const groups = useMemo(() => buildGroups(filtered, groupBy, stepMap), [filtered, groupBy, stepMap]);

  // ── Row actions ──
  const handleRowClick = useCallback((row: BusinessRequest) => {
    const rKey = (row as any).request_key;
    if (rKey) openDetail({ id: rKey, itemType: 'business_request' });
  }, [openDetail]);

  const handleOpen   = useCallback((row: BusinessRequest) => handleRowClick(row), [handleRowClick]);
  const handleDelete = useCallback((row: BusinessRequest) => setDeleteTarget(row), []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync((deleteTarget as any).id);
      setDeleteTarget(null);
      flag.success('Deleted', (deleteTarget.title ?? '').slice(0, 60));
    } catch (e: any) {
      flag.error('Delete failed', e?.message ?? String(e));
    }
  }, [deleteTarget, deleteMutation]);

  // ── Column schema (memoised with deps) ──
  const columns = useMemo(
    () => buildColumns(profileNames, stepMap, handleOpen, handleDelete),
    [profileNames, stepMap, handleOpen, handleDelete],
  );

  // ── Status options for filter panel ──
  const statusFilterOptions = useMemo<StatusFilterOption[]>(
    () => processSteps.map(s => ({ value: s.value, label: s.label, appearance: stepToLozengeAppearance(s) })),
    [processSteps],
  );

  // ── Work type options for filter panel ──
  const workTypeOptions = useMemo<WorkTypeOption[]>(() => [
    { id: 'feature',      label: 'Feature' },
    { id: 'gap',          label: 'Business gap' },
    { id: 'integration',  label: 'Integration' },
    { id: 'data_request', label: 'Data request' },
  ], []);

  const firstStepValue = processSteps[0]?.value ?? 'new_request';
  const activeFilterCount = countActiveFilters(filterValue);

  if (productLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!product && key) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: token('color.text.subtlest', '#6B778C'), fontFamily: 'var(--cp-font-body)' }}>
        Product <strong>{key}</strong> not found.{' '}
        <a href="/product-hub/products" style={{ color: token('color.link', '#0052CC') }}>← Back to products</a>
      </div>
    );
  }

  return (
    <AtlaskitPageShell
      flush
      cardPadding={{ x: 24, y: 16 }}
      cardBorder={`1px solid ${token('color.border', '#DFE1E6')}`}
      chromeBand={<ProductChromeBand product={product} />}
    >
      {/* ── Toolbar ── two-cluster layout matching BacklogPage exactly */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 24px',
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        flexShrink: 0, minHeight: 48,
        background: token('color.elevation.surface', '#FFFFFF'),
      }}>
        {/* LEFT cluster */}
        <div style={{ flex: 1, minWidth: 240, maxWidth: 560 }}>
          <Textfield
            isCompact
            placeholder="Search requests"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            elemBeforeInput={
              <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                <AkSearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={search ? (
              <button
                type="button" aria-label="Clear search"
                onClick={() => setSearch('')}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#6B778C'), padding: '0 8px 0 0' }}
              >
                <AkCloseIcon label="" size="small" />
              </button>
            ) : undefined}
          />
        </div>

        {/* F1 — JiraFilterAtlaskit */}
        <div style={{ position: 'relative' }}>
          <JiraFilterAtlaskit
            value={filterValue}
            onChange={setFilterValue}
            statuses={statusFilterOptions}
            workTypes={workTypeOptions}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* RIGHT cluster */}
        <GroupByControl value={groupBy} onChange={v => { setGroupBy(v); setCollapsedGroups(new Set()); }} />

        {/* F7 — View options */}
        <ToolbarMenuButton
          icon={<AkFilterIcon label="" size="small" />}
          ariaLabel="View options"
          tooltipContent="View options"
          groups={[
            { items: [
              { id: 'reset-filters', label: 'Reset all filters', onClick: () => { setFilterValue(emptyFilterValue); setSearch(''); } },
              { id: 'refresh', label: 'Refresh', icon: <AkRefreshIcon label="" size="small" />,
                onClick: () => queryClient.invalidateQueries({ queryKey: ['business-requests-by-product', product?.id] }) },
            ]},
          ]}
        />

        {/* F7 — More actions */}
        <ToolbarMenuButton
          icon={<AkMoreIcon label="" size="small" />}
          ariaLabel="More actions"
          tooltipContent="More actions"
          groups={[
            { items: [
              { id: 'sync-jira', label: syncing ? 'Syncing from Jira…' : 'Sync from Jira (MDT → 2026)',
                isDisabled: syncing,
                icon: <AkRefreshIcon label="" size="small" />,
                onClick: async () => {
                  setSyncing(true);
                  try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    const res = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-mdt-to-business-requests`,
                      { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' } },
                    );
                    const result = await res.json();
                    if (result.ok) {
                      queryClient.invalidateQueries({ queryKey: ['business-requests-by-product', product?.id] });
                      flag.success('Jira sync complete', `${result.inserted} inserted · ${result.updated} updated · ${result.rejected} rejected`);
                    } else {
                      flag.error('Sync failed', result.error ?? 'Unknown error');
                    }
                  } catch (e: any) {
                    flag.error('Sync failed', e?.message ?? String(e));
                  } finally {
                    setSyncing(false);
                  }
                },
              },
            ]},
            { items: [
              { id: 'export', label: 'Export to CSV', icon: <AkDownloadIcon label="" size="small" />,
                onClick: () => {
                  const headers = ['Key','Title','Type','Status','Priority','Delivery manager','Product owner','Target date'];
                  const csvRows = filtered.map(r => [
                    (r as any).request_key ?? '',
                    `"${(r.title ?? '').replace(/"/g, '""')}"`,
                    (r as any).request_type ?? '',
                    (r as any).process_step ?? '',
                    (r as any).urgency ?? '',
                    profileNames[(r as any).project_manager_user_id] ?? '',
                    profileNames[(r as any).po_user_id] ?? '',
                    (r as any).end_date ?? '',
                  ].join(','));
                  const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                  a.download = `${key}-backlog.csv`; a.click();
                },
              },
              { id: 'bulk-change', label: 'Select all for bulk action', opensModal: true,
                onClick: () => setSelectedIds(new Set(filtered.map(r => (r as any).id))),
              },
            ]},
            { items: [
              { id: 'copy-link', label: 'Copy backlog link', icon: <AkLinkIcon label="" size="small" />,
                onClick: () => { navigator.clipboard.writeText(window.location.href).then(() => flag.success('Link copied')); },
              },
            ]},
          ]}
        />

        {/* Item count */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 8px',
          color: token('color.text.subtlest', '#626F86'), fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          {filtered.length} item{filtered.length === 1 ? '' : 's'}
        </div>

        <Button appearance="primary" onClick={() => setCreateOpen(true)}>+ Create</Button>
      </div>

      {/* F4 — Bulk-select footer */}
      {selectedIds.size > 0 && (
        <BulkFooterBar
          selectedCount={selectedIds.size}
          onSelectAll={() => setSelectedIds(new Set(filtered.map(r => (r as any).id)))}
          onDeselectAll={() => setSelectedIds(new Set())}
          onDelete={() => {
            if (window.confirm(`Delete ${selectedIds.size} request(s)?`)) {
              Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)))
                .then(() => { setSelectedIds(new Set()); flag.success('Deleted', `${selectedIds.size} requests removed`); })
                .catch(e => flag.error('Delete failed', e?.message));
            }
          }}
        />
      )}

      {/* ── Table ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, padding: '4px 24px 0' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {rowsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                <Spinner size="large" />
              </div>
            ) : (
              <JiraTable<BusinessRequest>
                columns={columns}
                data={groups ? undefined : filtered}
                groups={groups ?? undefined}
                getRowId={r => (r as any).id}
                onRowClick={handleRowClick}
                collapsedGroups={collapsedGroups}
                onToggleGroup={id => setCollapsedGroups(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                })}
                sortKey={sortKey ?? undefined}
                sortOrder={sortDir}
                onSortChange={(k, d) => { setSortKey(k); setSortDir(d); }}
                selectable
                selection={selectedIds}
                onSelectionChange={setSelectedIds}
                columnVisibility={visibleColumns}
                onColumnVisibilityChange={setVisibleColumns}
                enableStickyCreateFooter
                stickyCreateFooter={{
                  placeholder: '+ Create request',
                  onActivate: () => setFooterActive(true),
                  active: footerActive && product ? (
                    <InlineCreateRow
                      productId={product.id}
                      firstStepValue={firstStepValue}
                      onCreated={() => setFooterActive(false)}
                      onCancel={() => setFooterActive(false)}
                    />
                  ) : null,
                }}
                emptyState={
                  <div style={{ padding: '48px 0', textAlign: 'center', color: token('color.text.subtlest', '#6B778C'), fontFamily: 'var(--cp-font-body)' }}>
                    {activeFilterCount > 0 || search
                      ? 'No requests match your filters.'
                      : 'No business requests yet — click "+ Create" to add the first one.'}
                  </div>
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Create modal ── */}
      <CreateBusinessRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        productId={product?.id}
      />

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: token('color.blanket', 'rgba(9,30,66,0.54)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{ background: token('elevation.surface.overlay', '#FFFFFF'), borderRadius: 8, padding: 32, maxWidth: 400, width: '100%', margin: '0 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: token('color.text', '#172B4D') }}>Delete request?</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: token('color.text.subtle', '#42526E') }}>
              "{deleteTarget.title?.slice(0, 80)}" will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button appearance="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button appearance="danger" isLoading={deleteMutation.isPending} onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <FlagsHost />
    </AtlaskitPageShell>
  );
}
