/**
 * ProductRoomSidebar — Product module sidebar using SidebarBase.
 *
 * DUAL MODE:
 *   - Global: renders the canonical Product Hub nav (All Products, Backlog,
 *     Kanban, Roadmap, Cards, Req Assist™). Active when URL is the hub root
 *     or any non-product-scoped page.
 *   - Per-product: when URL matches /product-hub/{CODE}/*, swaps to scoped nav
 *     (Dashboard / Backlog / Boards / All Work / Roadmap / Cards / Settings)
 *     with a product switcher in the header and a Recents section at the bottom.
 *     Mirrors SidebarProjectNav's UX pattern for Project Hub.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ClipboardList,
  Columns3,
  GanttChart,
  LayoutGrid,
  FileText,
  LayoutDashboard,
  Network,
  ArrowLeft,
  Settings,
  Clock,
  ChevronRight,
  ChevronDown,
  Search,
  X,
} from '@/lib/atlaskit-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { supabase } from '@/integrations/supabase/client';
import { useRecentProjectItems } from '@/hooks/useRecentProjectItems';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const RESERVED_HUB_PATHS = new Set([
  'products', 'backlog', 'kanban', 'table', 'dashboard', 'roadmap',
  'roadmaps', 'roadmaps-v1', 'reports', 'cards', 'ideation',
  'requirement-assist', 'req-assist',
]);

function extractProductCode(pathname: string): string | null {
  const m = pathname.match(/^\/product-hub\/([^/]+)(?:\/|$)/);
  if (!m) return null;
  const seg = m[1];
  if (RESERVED_HUB_PATHS.has(seg.toLowerCase())) return null;
  return seg.toUpperCase();
}

const GLOBAL_CONFIG: SidebarConfig = {
  badge: 'PH',
  label: 'Product Hub',
  sections: [
    {
      title: '',
      items: [
        { id: 'all-products',          title: 'All Products',    path: '/product-hub/products',            icon: LayoutGrid,    exact: true },
        { id: 'backlog',               title: 'Product Backlog', path: '/product-hub/backlog',             icon: ClipboardList, exact: true },
        { id: 'kanban',                title: 'Product Kanban',  path: '/product-hub/kanban',              icon: Columns3,      exact: true },
        { id: 'roadmap',               title: 'Product Roadmap', path: '/product-hub/roadmap',             icon: GanttChart,    exact: false },
        { id: 'cards',                 title: 'Product Cards',   path: '/product-hub/cards',               icon: LayoutGrid,    exact: true },
        { id: 'req-assist-pipeline',   title: 'Req Assist™',    path: '/product-hub/requirement-assist',  icon: FileText,      exact: false, textBadge: 'AI' },
      ],
    },
  ],
};

function buildPerProductConfig(product: { code: string; name: string }): SidebarConfig {
  const base = `/product-hub/${product.code}`;
  return {
    badge: product.code.slice(0, 2),
    label: product.name,
    sections: [
      {
        title: '',
        items: [
          { id: 'all-products', title: 'All Products', path: '/product-hub/products', icon: ArrowLeft, exact: true },
        ],
      },
      {
        title: 'Planning',
        items: [
          { id: 'dashboard', title: 'Dashboard', path: `${base}/dashboard`, icon: LayoutDashboard, exact: true },
          { id: 'backlog',   title: 'Backlog',   path: `${base}/backlog`,   icon: ClipboardList,   exact: true },
          { id: 'boards',    title: 'Boards',    path: `${base}/boards`,    icon: Columns3,        exact: false },
          { id: 'allwork',   title: 'All Work',  path: `${base}/allwork`,   icon: Network,         exact: true },
          { id: 'roadmap',   title: 'Roadmap',   path: `${base}/roadmap`,   icon: GanttChart,      exact: false },
          { id: 'cards',     title: 'Cards',     path: `${base}/cards`,     icon: LayoutGrid,      exact: true },
        ],
      },
    ],
    footerItem: {
      id: 'settings', title: 'Settings', path: `${base}/settings`, icon: Settings, exact: true,
    },
  };
}

// ─── ProductSwitcher ──────────────────────────────────────────────────────────

interface ProductEntry { id: string; code: string; name: string; color: string | null; }

interface ProductSwitcherProps {
  products: ProductEntry[];
  currentCode: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}

function ProductSwitcher({ products, currentCode, onClose, onSelect }: ProductSwitcherProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('mousedown', click);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('mousedown', click);
    };
  }, [onClose]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 9999,
        width: 260,
        borderRadius: 8,
        background: isDark ? 'var(--ds-surface-raised, #1A1A1A)' : '#fff',
        border: `1px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1, #2E2E2E))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))'}`,
        boxShadow: isDark
          ? '0 8px 24px rgba(0,0,0,0.60)'
          : '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
        fontFamily: 'var(--cp-font-body)',
        overflow: 'hidden',
      }}
    >
      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: `1px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1, #2E2E2E))' : 'var(--cp-border, var(--cp-bg-sunken, #E2E8F0))'}`,
        }}
      >
        <Search size={13} style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, #94A3B8))', flexShrink: 0 }} />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product lines..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 12,
            color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--ds-text, var(--cp-ink-1, #0F172A))',
          }}
        />
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
            No products found
          </div>
        ) : (
          filtered.map((p) => {
            const isCurrent = p.code === currentCode;
            return (
              <button
                key={p.code}
                onClick={() => { onSelect(p.code); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '7px 12px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isCurrent
                    ? isDark ? 'var(--ds-background-selected, #1C2B41)' : '#E9F2FF'
                    : 'transparent',
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 13,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent
                    ? 'var(--cp-text-link, var(--cp-primary-60, #0052CC))'
                    : isDark ? 'var(--ds-text, #EDEDED)' : 'var(--ds-text, var(--cp-text-primary, #172B4D))',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) (e.currentTarget as HTMLElement).style.background =
                    isDark ? 'var(--ds-background-neutral-subtle-hovered, #A1BDD914)' : '#F4F5F7';
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: p.color || 'var(--cp-blue, var(--cp-primary-60, #0052CC))',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {p.code.slice(0, 2)}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: isCurrent ? 600 : 500, fontSize: 13 }}>
                    {p.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--cp-font-mono)' }}>
                    {p.code}
                  </span>
                </span>
                {isCurrent && (
                  <span style={{ fontSize: 10, color: 'var(--cp-text-link, var(--cp-primary-60, #0052CC))', fontWeight: 600 }}>✓</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── RecentsSection ───────────────────────────────────────────────────────────

interface RecentsSectionProps {
  productId: string;
  expanded: boolean;
}

function RecentsSection({ productId, expanded }: RecentsSectionProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const { data: recentItems = [] } = useRecentProjectItems(productId);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  if (!expanded || recentItems.length === 0) return null;

  return (
    <>
      <div style={{ borderTop: `1px solid ${isDark ? 'var(--ds-border,var(--cp-ink-1, #2E2E2E))' : '#EBECF0'}`, margin: '8px 12px 4px' }} />

      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '6px 12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          gap: 4,
        }}
      >
        <ChevronRight
          size={12}
          style={{
            color: 'var(--ds-text-subtlest, #6B778C)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <Clock size={12} style={{ color: 'var(--ds-text-subtlest, #6B778C)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ds-text-subtlest, #6B778C)' }}>
          Recents
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--cp-text-muted, var(--cp-ink-4, #94A3B8))', fontFamily: 'var(--cp-font-mono)' }}>
          {recentItems.length}
        </span>
      </button>

      {open && (
        <div style={{ paddingBottom: 4 }}>
          {recentItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.nav_path)}
              title={item.display_summary}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '4px 12px 4px 28px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                gap: 8,
                fontSize: 12.5,
                color: isDark ? 'var(--ds-text-subtle, #B8C4D0)' : 'var(--ds-text-subtle, #42526E)',
                fontFamily: 'var(--cp-font-body)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  isDark ? 'var(--ds-background-neutral-subtle-hovered, #A1BDD914)' : '#F4F5F7';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {item.entity_key && (
                <span style={{ fontSize: 10, fontFamily: 'var(--cp-font-mono)', color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }}>
                  {item.entity_key}
                </span>
              )}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.display_summary}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── ProductRoomSidebar ───────────────────────────────────────────────────────

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const productCode = extractProductCode(location.pathname);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { data: scopedProduct } = useQuery({
    queryKey: ['product-hub', 'sidebar-product-by-code', productCode],
    enabled: !!productCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, code, name, color')
        .eq('code', productCode)
        .eq('is_active', true)
        .maybeSingle();
      if (error) { console.warn('ProductRoomSidebar product lookup error:', error.message); return null; }
      return data as { id: string; code: string; name: string; color: string | null } | null;
    },
    staleTime: 5 * 60_000,
  });

  // All products list for the switcher dropdown
  const { data: allProducts = [] } = useQuery({
    queryKey: ['product-hub', 'products-for-switcher'],
    enabled: !!productCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, code, name, color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return [];
      return (data ?? []) as ProductEntry[];
    },
    staleTime: 5 * 60_000,
  });

  const isScoped = !!scopedProduct && !!productCode;
  const config: SidebarConfig = isScoped
    ? buildPerProductConfig(scopedProduct!)
    : GLOBAL_CONFIG;

  return (
    <div style={{ position: 'relative' }}>
      <SidebarBase
        config={config}
        expanded={expanded}
        onToggle={onToggle}
        className={className}
        onHeaderClick={isScoped ? () => setSwitcherOpen((p) => !p) : undefined}
      >
        {/* Recents — only in per-product mode */}
        {isScoped && scopedProduct && (
          <RecentsSection productId={scopedProduct.id} expanded={expanded} />
        )}
      </SidebarBase>

      {/* Product switcher dropdown — anchored to the sidebar header */}
      {isScoped && switcherOpen && (
        <ProductSwitcher
          products={allProducts}
          currentCode={productCode!}
          onClose={() => setSwitcherOpen(false)}
          onSelect={(code) => {
            setSwitcherOpen(false);
            navigate(`/product-hub/${code}/dashboard`);
          }}
        />
      )}
    </div>
  );
}
