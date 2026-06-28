/**
 * AllProductsPage — /product-hub/products
 *
 * jira-compare cycle 1 (2026-05-02) — column shape, header order, and toolbar
 * mirror Jira's /jira/projects (tenant: digital-transformation) probed Lane A:
 *
 *   Headers:  [star] Name (icon+anchor) Key  Type  Lead (avatar+name)  ⋯
 *   Toolbar:  search input above the table, "+ Create product" top-right
 *
 * Atlaskit primitives (Atlaskit-only inside scope):
 *   @atlaskit/dynamic-table   table
 *   @atlaskit/textfield       search
 *   @atlaskit/avatar          name icon + lead avatar
 *   @atlaskit/lozenge         type
 *   @atlaskit/dropdown-menu   row actions (⋯)
 *   @atlaskit/icon/glyph/star{,-filled}   favorite toggle
 *
 * Data source: public.products (visible MINI/SEN/ENT/UNA/INV depending on
 * RLS / cleanup state). Frontend-only audit: data shape concerns are
 * out of scope for this cycle.
 */

import { useMemo, useState, useCallback, useEffect, lazy, Suspense, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import { Plus, Star, MoreHorizontal, Search } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';
import Avatar from '@atlaskit/avatar';
import Textfield from '@atlaskit/textfield';
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { ProductAvatar } from '@/components/icons';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import '@/styles/product-backlog.css';

const CreateProductModal = lazy(() =>
  import('@/components/product-hub/CreateProductModal').then((m) => ({
    default: m.CreateProductModal,
  })),
);

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  owner_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const FAV_STORAGE_KEY = 'product-hub.favorites';

// Utility: handle clicks outside a popover — close it when user clicks elsewhere
function useClickOutside(
  isOpen: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside = refs.some(r => r.current?.contains(target));
      if (!inside) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, refs, onOutside]);
}

// Utility: position a popover using fixed positioning (not absolute) to avoid
// containing-block weirdness from transformed ancestors or sticky headers.
function useFixedPopupPosition(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  popupWidth: number,
): { top: number; left: number } | null {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const recompute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Default: anchor below the trigger, left-aligned. If popup would overflow
    // the right edge, right-align it to the trigger instead.
    let left = r.left;
    if (left + popupWidth > window.innerWidth - 8) {
      left = Math.max(8, r.right - popupWidth);
    }
    setPos({ top: r.bottom + 4, left });
  }, [triggerRef, popupWidth]);

  useEffect(() => {
    if (!isOpen) { setPos(null); return; }
    recompute();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [isOpen, recompute]);

  return pos;
}

// Hook: fetch all profiles from the profiles table for use in pickers
function useAllProfiles() {
  return useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .order('full_name');

      const rows = (profiles || []).map(p => ({ ...p, display_name: p.full_name || '' }));

      // Avatar fallback: if profiles.avatar_url is null, look up resource_inventory.avatar_url
      const needsFallback = rows.filter(r => !r.avatar_url).map(r => r.id);
      if (needsFallback.length > 0) {
        const { data: resources } = await (supabase as any)
          .from('resource_inventory')
          .select('profile_id, avatar_url')
          .in('profile_id', needsFallback)
          .not('avatar_url', 'is', null);
        const fallbackMap = new Map<string, string>(
          (resources ?? []).map((r: { profile_id: string; avatar_url: string }) => [r.profile_id, r.avatar_url]),
        );
        rows.forEach(r => {
          if (!r.avatar_url) {
            const fb = fallbackMap.get(r.id);
            if (fb) r.avatar_url = fb;
          }
        });
      }

      return rows;
    },
    staleTime: 60_000,
  });
}

/**
 * Column shape mirrors Jira /jira/projects probe (Lane A) and AllProjectsTable:
 *   col 1 — star (no header text, locked)
 *   col 2 — Name
 *   col 3 — Key
 *   col 4 — Type
 *   col 5 — Lead
 *   col 6 — ⋯ actions (no header text, locked)
 *
 * Uses ResizableTableHeader + useTableColumns to match AllProjectsTable
 * drag-and-resize behaviour (design-critique 2026-05-16).
 */
const PRODUCT_COLUMNS: TColDef[] = [
  { key: 'star',     label: '',         defaultWidth: 36,  minWidth: 36,  locked: true },
  { key: 'name',     label: 'Name',     defaultWidth: 280, minWidth: 160 },
  { key: 'code',     label: 'Key',      defaultWidth: 90,  minWidth: 60 },
  { key: 'type',     label: 'Type',     defaultWidth: 160, minWidth: 100 },
  { key: 'lead',     label: 'Lead',     defaultWidth: 180, minWidth: 120 },
  { key: 'actions',  label: '',         defaultWidth: 40,  minWidth: 40,  locked: true },
];

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>): void {
  try {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(Array.from(favs)));
  } catch {
    /* localStorage may be blocked — degrade silently */
  }
}

// Lead owner picker popover — single-select to assign a product owner
function LeadOwnerPopover({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [updating, setUpdating] = useState(false);
  const { data: profiles = [] } = useAllProfiles();
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useClickOutside(open, [triggerRef, popupRef], () => { setOpen(false); setSearch(''); });
  const popupPos = useFixedPopupPosition(open, triggerRef, 300);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 150);
  }, []);

  // Filter profiles by search, exclude current owner from the list of alternatives
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return profiles
      .filter(p => !q || p.display_name?.toLowerCase().includes(q))
      .sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
  }, [profiles, debouncedSearch]);

  const currentOwner = useMemo(
    () => profiles.find(p => p.id === product.owner_id),
    [profiles, product.owner_id],
  );

  const handleSelectOwner = useCallback(async (userId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ owner_id: userId })
        .eq('id', product.id);
      if (error) throw error;

      const newOwner = profiles.find(p => p.id === userId);
      catalystToast.success(`Lead changed to ${newOwner?.display_name || 'Unknown'}`);
      setOpen(false);
      setSearch('');
      await queryClient.invalidateQueries({ queryKey: ['product-hub', 'products'] });
    } catch (e) {
      catalystToast.error('Failed to update lead');
    } finally {
      setUpdating(false);
    }
  }, [product.id, profiles, queryClient]);

  const handleClearOwner = useCallback(async () => {
    if (!product.owner_id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ owner_id: null })
        .eq('id', product.id);
      if (error) throw error;

      catalystToast.success('Lead cleared');
      setOpen(false);
      setSearch('');
      await queryClient.invalidateQueries({ queryKey: ['product-hub', 'products'] });
    } catch (e) {
      catalystToast.error('Failed to clear lead');
    } finally {
      setUpdating(false);
    }
  }, [product.id, queryClient]);

  const popupContent = () => (
    <div
      ref={popupRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 300,
        background: token('elevation.surface.overlay'),
        border: `1px solid ${token('color.border')}`,
        borderRadius: 4,
        boxShadow: token('elevation.shadow.overlay'),
        overflow: 'hidden',
        position: 'fixed',
        ...(popupPos ? { top: popupPos.top, left: popupPos.left } : {}),
        zIndex: 1000,
      }}
    >
      <div style={{ padding: '10px 12px 6px' }}>
        <Textfield
          value={search}
          onChange={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
          placeholder="Search people..."
          autoFocus
          elemBeforeInput={
            <span style={{ paddingLeft: 8, display: 'inline-flex', alignItems: 'center', color: token('color.text.subtlest') }}>
              <Search size={12} />
            </span>
          }
        />
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto', paddingBottom: 6 }}>
        {currentOwner && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleClearOwner()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClearOwner(); }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              color: token('color.text'),
              outline: 'none',
              opacity: updating ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label={`Remove ${currentOwner.display_name} as lead`}
          >
            <Avatar src={currentOwner.avatar_url || undefined} name={currentOwner.display_name || '?'} size="small" />
            <span style={{ fontSize: 'var(--ds-font-size-300)', flex: 1, fontFamily: 'var(--cp-font-body)' }}>
              {currentOwner.display_name}
            </span>
            <Lozenge appearance="success" isBold={false}>Current</Lozenge>
          </div>
        )}
        {filtered.filter(p => p.id !== product.owner_id).map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelectOwner(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectOwner(p.id); }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              color: token('color.text'),
              outline: 'none',
              opacity: updating ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label={`Set ${p.display_name} as lead`}
          >
            <Avatar src={p.avatar_url || undefined} name={p.display_name || '?'} size="small" />
            <span style={{ fontSize: 'var(--ds-font-size-300)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--cp-font-body)' }}>
              {p.display_name}
            </span>
          </div>
        ))}
        {filtered.filter(p => p.id !== product.owner_id).length === 0 && !currentOwner && (
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest'), textAlign: 'center', padding: '12px 0' }}>
            No results
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); } }}
        aria-label={currentOwner ? `Lead: ${currentOwner.display_name}. Click to change.` : 'No lead assigned. Click to assign.'}
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <Avatar src={currentOwner?.avatar_url || undefined} name={currentOwner?.display_name || '?'} size="small" />
        {currentOwner ? (
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text'), fontFamily: 'var(--cp-font-body)' }}>
            {currentOwner.display_name}
          </span>
        ) : (
          <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtlest'), fontFamily: 'var(--cp-font-body)' }}>
            Assign lead
          </span>
        )}
      </div>
      {open && popupContent()}
    </>
  );
}

export default function AllProductsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  // Deep-link: /product-hub/products?create=1 opens the create modal directly
  // (switcher "+ New product" footer, 2026-06-16). Consume + clear the param.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterLead, setFilterLead] = useState<string | null>(null);

  const trackRecent = useTrackRecentItem();

  const recordProductView = useCallback((p: Product) => {
    trackRecent.mutate({
      entityType: 'product',
      entityId: p.id,
      entityKey: p.code,
      displaySummary: p.name,
      navPath: `/product-hub/${p.code}/backlog`,
    });
  }, [trackRecent]);

  // Resizable / drag-reorder columns — matches AllProjectsTable pattern
  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('products', PRODUCT_COLUMNS);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['product-hub', 'products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select(
          'id, code, name, description, color, owner_id, is_active, sort_order, created_at',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as Product[]) ?? [];
    },
    staleTime: 60_000,
  });

  const hasActiveFilters = filterType !== null || filterLead !== null;

  function clearFilters() {
    setFilterType(null);
    setFilterLead(null);
  }

  /** Apply search + filter + sort favorites first (matches Jira behaviour). */
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = searchQuery.trim().toLowerCase();
    let out = products;
    if (q) {
      out = out.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          adfToPlainText(p.description ?? '').toLowerCase().includes(q),
      );
    }
    if (filterLead === 'assigned') out = out.filter((p) => !!p.owner_id);
    if (filterLead === 'unassigned') out = out.filter((p) => !p.owner_id);
    return out.slice().sort((a, b) => {
      const af = favorites.has(a.id) ? 0 : 1;
      const bf = favorites.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.sort_order - b.sort_order;
    });
  }, [products, searchQuery, favorites, filterLead, filterType]);

  // Cell renderer — one function per column key, returns <td> content
  const renderCell = useCallback((colKey: string, p: Product) => {
    const isFav = favorites.has(p.id);
    switch (colKey) {
      case 'star':
        return (
          <td key={colKey} style={{ width: columnWidths['star'] || 36, overflow: 'visible', textOverflow: 'clip' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                aria-label={isFav ? 'Unstar product' : 'Star product'}
                aria-pressed={isFav}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  color: isFav ? token('color.icon.warning') : token('color.icon.subtle'),
                  outline: 'none',
                }}
              >
                {isFav ? (
                  <StarFilledIcon label="" size="small" />
                ) : (
                  <Star size={14} fill="none" />
                )}
              </button>
            </div>
          </td>
        );

      case 'name':
        return (
          <td key={colKey}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <ProductAvatar code={p.code} size={24} />
              <RouterLink
                to={`/product-hub/${p.code}/backlog`}
                title={p.name}
                style={{
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 400,
                  color: token('color.link'),
                  fontFamily: 'var(--cp-font-body)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                onClick={() => recordProductView(p)}
              >
                {p.name}
              </RouterLink>
            </div>
          </td>
        );

      case 'code':
        return (
          <td key={colKey}>
            <span
              style={{
                fontFamily: 'var(--cp-font-mono)',
                fontSize: 'var(--ds-font-size-200)',
                fontWeight: 500,
                color: token('color.text.subtle'),
                letterSpacing: '0.02em',
              }}
            >
              {p.code}
            </span>
          </td>
        );

      case 'type':
        return (
          <td key={colKey}>
            <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
              Product line
            </span>
          </td>
        );

      case 'lead':
        return (
          <td key={colKey}>
            <LeadOwnerPopover product={p} />
          </td>
        );

      case 'actions':
        return (
          <td key={colKey} style={{ textAlign: 'center' }}>
            <DropdownMenu
              trigger={({ triggerRef, ...triggerProps }) => (
                <button
                  {...triggerProps}
                  ref={triggerRef}
                  type="button"
                  aria-label={`More actions for ${p.name}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    borderRadius: 3,
                    color: token('color.icon.subtle'),
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
              )}
              placement="bottom-end"
            >
              <DropdownItemGroup>
                <DropdownItem href={`/product-hub/${p.code}/backlog`}>Open backlog</DropdownItem>
                <DropdownItem href={`/product-hub/${p.code}/dashboard`}>Open dashboard</DropdownItem>
                <DropdownItem href={`/product-hub/${p.code}/settings`}>Settings</DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          </td>
        );

      default:
        return <td key={colKey} />;
    }
  }, [favorites, toggleFavorite, columnWidths]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
      {/* Header row: title + Create button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <CatalystPageHeader title="Products" />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 500,
            borderRadius: 3,
            border: 'none',
            background: token('color.background.brand.bold'),
            color: token('color.text.inverse'),
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={16} />
          Create product line
        </button>
      </div>

      {/* Toolbar: search + filter — mirrors Jira /jira/projects toolbar pattern */}
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ width: 280 }}>
          <Textfield
            name="product-search"
            placeholder="Search products"
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
        </div>

        {/* Filter ▼ — Type */}
        <DropdownMenu
          trigger={({ triggerRef, ...triggerProps }) => (
            <button
              {...triggerProps}
              ref={triggerRef}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: filterType ? 600 : 400,
                borderRadius: 3,
                border: `2px solid ${filterType ? token('color.border.selected') : token('color.border')}`,
                background: filterType
                  ? token('color.background.selected')
                  : token('color.background.input'),
                color: filterType ? token('color.text.selected') : token('color.text'),
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {filterType ? `Type: ${filterType}` : 'Type'}
              <ChevronDownIcon label="" size="small" />
            </button>
          )}
          placement="bottom-start"
        >
          <DropdownItemGroup>
            <DropdownItem
              isSelected={filterType === null}
              onClick={() => setFilterType(null)}
            >
              All types
            </DropdownItem>
            <DropdownItem
              isSelected={filterType === 'Product line'}
              onClick={() => setFilterType('Product line')}
            >
              Product line
            </DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        {/* Filter ▼ — Lead */}
        <DropdownMenu
          trigger={({ triggerRef, ...triggerProps }) => (
            <button
              {...triggerProps}
              ref={triggerRef}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: filterLead ? 600 : 400,
                borderRadius: 3,
                border: `2px solid ${filterLead ? token('color.border.selected') : token('color.border')}`,
                background: filterLead
                  ? token('color.background.selected')
                  : token('color.background.input'),
                color: filterLead ? token('color.text.selected') : token('color.text'),
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {filterLead === 'assigned'
                ? 'Lead: Assigned'
                : filterLead === 'unassigned'
                  ? 'Lead: Unassigned'
                  : 'Lead'}
              <ChevronDownIcon label="" size="small" />
            </button>
          )}
          placement="bottom-start"
        >
          <DropdownItemGroup>
            <DropdownItem
              isSelected={filterLead === null}
              onClick={() => setFilterLead(null)}
            >
              All leads
            </DropdownItem>
            <DropdownItem
              isSelected={filterLead === 'assigned'}
              onClick={() => setFilterLead('assigned')}
            >
              Assigned
            </DropdownItem>
            <DropdownItem
              isSelected={filterLead === 'unassigned'}
              onClick={() => setFilterLead('unassigned')}
            >
              Unassigned
            </DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              fontSize: 'var(--ds-font-size-300)',
              color: token('color.link'),
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table — ResizableTableHeader + useTableColumns matching AllProjectsTable */}
      <div style={{ marginTop: 12 }}>
        {error ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.danger') }}>
              Could not load products — check browser console for the Supabase error.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-10 bg-white dark:!bg-[var(--ds-surface,#0A0A0A)]">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="animate-pulse">
                  <div style={{ width: 24, height: 24, borderRadius: 3, background: 'var(--ds-background-neutral, var(--cp-bg-sunken, #F4F5F7))' }} />
                  <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--ds-background-neutral, var(--cp-bg-sunken, #F4F5F7))', maxWidth: '60%' }} />
                </div>
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtlest') }}>
              {searchQuery ? `No products match "${searchQuery}"` : 'No products yet. Create one to get started.'}
            </p>
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            style={{
              borderRadius: 8,
              border: `1px solid ${token('color.border')}`,
              background: token('elevation.surface'),
            }}
          >
            <table className="pb-table" style={{ minWidth: 760, tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                {orderedColumns.map(c => (
                  <col key={c.key} style={{ width: columnWidths[c.key] || c.defaultWidth }} />
                ))}
              </colgroup>
              <thead>
                <tr className="group/thead">
                  {orderedColumns.map(c => (
                    <ResizableTableHeader
                      key={c.key}
                      colKey={c.key}
                      label={c.label}
                      width={columnWidths[c.key] || c.defaultWidth}
                      locked={c.locked}
                      isDragging={dragKey === c.key}
                      isDragOver={dragOverKey === c.key}
                      onResizeStart={onResizeStart}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      sortDirection={null}
                      onSort={undefined}
                      hideDragHandle
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr
                    key={p.id}
                    className="group"
                    style={{ height: 48, cursor: 'default' }}
                  >
                    {orderedColumns.map(c => renderCell(c.key, p))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {createOpen && (
          <CreateProductModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
