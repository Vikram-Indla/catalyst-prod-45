/**
 * ProductRoomSidebar — Product module sidebar using SidebarBase.
 *
 * Refactored to use the shared SidebarBase component for consistent
 * styling, density, text, font size, and contrast across all hubs.
 *
 * Phase 2 (2026-05-01) — DUAL MODE:
 *   - Global mode (default): renders the canonical Product Hub nav
 *     (Product Backlog, Product Kanban, Product Roadmap, Product Cards,
 *     Req Assist, Ideation group). Triggered when URL is /product-hub
 *     root, /product-hub/products, or any non-product-scoped page.
 *   - Per-product mode: when URL matches /product-hub/{CODE}/*, the
 *     sidebar swaps to per-product nav (Dashboard / Backlog / Boards /
 *     All Work / Roadmap / Cards / Settings) with the product's code
 *     in the badge slot and product name in the label slot.
 *
 * Mirrors how /project-hub's sidebar swaps when entering a project.
 */

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
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { supabase } from '@/integrations/supabase/client';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// Reserved path segments that immediately follow /product-hub/ but are
// NOT product codes. Anything else after /product-hub/ is treated as a
// product code (matches public.products.code).
const RESERVED_HUB_PATHS = new Set([
  'products',
  'backlog',
  'kanban',
  'table',
  'dashboard',
  'roadmap',
  'roadmaps',
  'roadmaps-v1',
  'reports',
  'cards',
  'ideation',
  'requirement-assist',
  'req-assist',
]);

/**
 * Extract product code from /product-hub/{CODE}/... if any.
 * Returns null when the URL is the global hub or a reserved sibling page.
 */
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
  // Design critique (2026-04-19) — see prior version for rationale.
  // Phase 6 (2026-05-02): Ideation section removed. Ideas are org-wide
  // intake and now live at the peer /ideation/* hub, accessed via the Hub
  // Switcher. Product Hub stays focused on product-line management.
  sections: [
    {
      title: '',
      items: [
        { id: 'all-products', title: 'All Products', path: '/product-hub/products', icon: LayoutGrid, exact: true },
        { id: 'backlog', title: 'Product Backlog', path: '/product-hub/backlog', icon: ClipboardList, exact: true },
        { id: 'kanban', title: 'Product Kanban', path: '/product-hub/kanban', icon: Columns3, exact: true },
        { id: 'roadmap', title: 'Product Roadmap', path: '/product-hub/roadmap', icon: GanttChart, exact: false },
        { id: 'cards', title: 'Product Cards', path: '/product-hub/cards', icon: LayoutGrid, exact: true },
        { id: 'req-assist-pipeline', title: 'Req Assist™', path: '/product-hub/requirement-assist', icon: FileText, exact: false, textBadge: 'AI' },
      ],
    },
  ],
  footerItem: undefined,
};

/**
 * Build the per-product SidebarConfig given a resolved product. Pattern
 * mirrors Project Hub's per-project sidebar (SidebarProjectNav):
 *   - Header shows the product's code as the badge and name as the label.
 *   - "All Products" back link as the first item.
 *   - Planning group: Dashboard / Backlog / Boards / All Work / Roadmap / Cards.
 *   - Settings pinned in footerItem.
 */
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
          { id: 'backlog', title: 'Backlog', path: `${base}/backlog`, icon: ClipboardList, exact: true },
          { id: 'boards', title: 'Boards', path: `${base}/boards`, icon: Columns3, exact: false },
          { id: 'allwork', title: 'All Work', path: `${base}/allwork`, icon: Network, exact: true },
          { id: 'roadmap', title: 'Roadmap', path: `${base}/roadmap`, icon: GanttChart, exact: false },
          { id: 'cards', title: 'Cards', path: `${base}/cards`, icon: LayoutGrid, exact: true },
        ],
      },
    ],
    footerItem: {
      id: 'settings',
      title: 'Settings',
      path: `${base}/settings`,
      icon: Settings,
      exact: true,
    },
  };
}

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {
  const location = useLocation();
  const productCode = extractProductCode(location.pathname);

  // Resolve product from public.products only when in scoped mode. Cached
  // 5 min — products are slowly-changing master data.
  const { data: scopedProduct } = useQuery({
    queryKey: ['product-hub', 'sidebar-product-by-code', productCode],
    enabled: !!productCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, code, name')
        .eq('code', productCode)
        .eq('is_active', true)
        .maybeSingle();
      if (error) {
        console.warn('ProductRoomSidebar product lookup error:', error.message);
        return null;
      }
      return data as { id: string; code: string; name: string } | null;
    },
    staleTime: 5 * 60_000,
  });

  // Pick config: per-product if we resolved a product, else global.
  const config: SidebarConfig =
    scopedProduct && productCode
      ? buildPerProductConfig(scopedProduct)
      : GLOBAL_CONFIG;

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
