/**
 * ProductHubSidebar — /product-hub sidebar
 *
 * DUAL MODE (mirrors SidebarProjectNav / ProductRoomSidebar pattern):
 *   - Global (/product-hub/products, /product-hub/backlog, etc.):
 *       Shows "All Products" nav link + Recent BRs section.
 *   - Per-product (/product-hub/{CODE}/*):
 *       Shows product name header + Dashboard / Backlog / Boards / Product Filters nav
 *       + "← All Products" back link.
 *
 * Added 2026-05-16 for /product-hub/products.
 * Dual-mode added 2026-05-16 so /product-hub/INV/* shows per-product nav.
 */

import { useState } from 'react';
import { token } from '@atlaskit/tokens';
import {
  LayoutGrid,
  ChevronRight,
  Clock,
  LayoutDashboard,
  ClipboardList,
  Columns3,
  Network,
  ArrowLeft,
  Settings,
  Filter,
} from '@/lib/atlaskit-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';

interface ProductHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

interface RecentProductRow {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_key: string | null;
  display_summary: string | null;
  nav_path: string;
  visited_at: string;
}

interface ProductRow {
  id: string;
  code: string;
  name: string;
  color: string | null;
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

function buildPerProductConfig(product: ProductRow): SidebarConfig {
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
          { id: 'dashboard', title: 'Product Dashboard', path: `${base}/dashboard`, icon: LayoutDashboard, exact: true  },
          { id: 'backlog',   title: 'Product Backlog',   path: `${base}/backlog`,   icon: ClipboardList,   exact: true  },
          { id: 'allwork',   title: 'Product Work',      path: `${base}/allwork`,   icon: Network,         exact: false },
          { id: 'boards',    title: 'Product Board',     path: `${base}/boards`,    icon: Columns3,        exact: false },
          { id: 'filters',   title: 'Product Filters',   path: `${base}/filters`,   icon: Filter,          exact: false },
        ],
      },
    ],
    footerItem: {
      id: 'settings', title: 'Settings', path: `${base}/settings`, icon: Settings, exact: true,
    },
  };
}

const GLOBAL_CONFIG: SidebarConfig = {
  badge: 'PH',
  label: 'Products',
  showFavorites: false,
  sections: [
    {
      title: '',
      items: [
        {
          id: 'all-products',
          title: 'All Products',
          path: '/product-hub/products',
          icon: LayoutGrid,
          exact: false,
        },
        // Product Filters intentionally NOT mounted in GLOBAL_CONFIG —
        // filters are a per-product concept and live in the per-product
        // sidebar (PRODUCT_CONFIG above). A global "Product Filters" entry
        // duplicated the per-product link and produced an "any-product"
        // surface that doesn't exist. Removed 2026-06-01 (design-critique).
      ],
    },
  ],
};

function daysAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}


export function ProductHubSidebar({ expanded, onToggle, className }: ProductHubSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [recentsExpanded, setRecentsExpanded] = useState(true);

  const productCode = extractProductCode(pathname);

  const { data: scopedProduct } = useQuery<ProductRow | null>({
    queryKey: ['product-hub', 'sidebar-product-by-code', productCode],
    enabled: !!productCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, code, name, color')
        .eq('code', productCode)
        .eq('is_active', true)
        .maybeSingle();
      if (error) { console.warn('[ProductHubSidebar] product lookup error:', error.message); return null; }
      return data as ProductRow | null;
    },
    staleTime: 5 * 60_000,
  });

  const isScoped = !!scopedProduct && !!productCode;

  // Recently visited products — architecture change 2026-06-02.
  // Shows recently accessed products instead of individual BR tickets.
  const { data: recentProducts = [] } = useQuery<RecentProductRow[]>({
    queryKey: ['product-hub-recent-products'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_recent_items')
        .select('id, entity_type, entity_id, entity_key, display_summary, nav_path, visited_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'product')
        .order('visited_at', { ascending: false })
        .limit(40);
      if (error) { console.warn('[ProductHubSidebar] recent products error:', error.message); return []; }
      // Deduplicate by entity_key (product code) — newest-first, cap at 10.
      const seen = new Set<string>();
      const deduped: RecentProductRow[] = [];
      for (const item of (data ?? []) as RecentProductRow[]) {
        const key = item.entity_key ?? item.entity_id;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
          if (deduped.length === 10) break;
        }
      }
      return deduped;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const config: SidebarConfig = isScoped ? buildPerProductConfig(scopedProduct!) : GLOBAL_CONFIG;

  const recentsSection = expanded && recentProducts.length > 0 ? (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 1, background: token('color.border'), margin: '4px 12px 8px' }} />

      <button
        onClick={() => setRecentsExpanded(p => !p)}
        className="flex items-center w-full"
        style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', gap: 4 }}
        aria-expanded={recentsExpanded}
      >
        <ChevronRight
          size={12}
          style={{
            color: token('color.text.subtlest'),
            transform: recentsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
        <Clock size={12} style={{ color: token('color.text.subtlest') }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: token('color.text.subtlest'), fontFamily: 'var(--cp-font-body)' }}>
          Recent
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: token('color.text.subtlest'), fontFamily: 'var(--cp-font-mono)' }}>
          {recentProducts.length}
        </span>
      </button>

      {recentsExpanded && (
        <div style={{ padding: '2px 0' }}>
          {recentProducts.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(item.nav_path)}
              className="group"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 28px', cursor: 'pointer', borderRadius: 3, margin: '0 4px', transition: 'background 80ms ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered'); }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Color dot as product identifier — products have no icon registry */}
              <span style={{
                flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
                background: token('color.background.brand.bold', '#0052CC'),
              }} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: token('color.text'), fontFamily: 'var(--cp-font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.display_summary ?? undefined}>
                  {item.display_summary || item.entity_key || '—'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: token('color.text.subtlest'), fontFamily: 'var(--cp-font-mono)', letterSpacing: '0.01em' }}>
                  {item.entity_key}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    >
      {recentsSection}
    </SidebarBase>
  );
}
