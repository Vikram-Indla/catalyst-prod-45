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

import { token } from '@atlaskit/tokens';
import {
  LayoutGrid,
  LayoutDashboard,
  ClipboardList,
  Columns3,
  Network,
  ArrowLeft,
  Settings,
  Filter,
} from '@/lib/atlaskit-icons';
import { useLocation } from 'react-router-dom';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
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

export function ProductHubSidebar({ expanded, onToggle, className }: ProductHubSidebarProps) {
  const { pathname } = useLocation();

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

  const config: SidebarConfig = isScoped ? buildPerProductConfig(scopedProduct!) : GLOBAL_CONFIG;

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
