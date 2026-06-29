/**
 * ProductHubSidebar — renders only on per-product routes (/product-hub/{CODE}/*).
 * Global /product-hub/products returns null — top-nav context switcher owns that.
 */

import {
  Settings,
  Link2,
  List,
} from '@/lib/atlaskit-icons';
import { getProductAvatarUrl } from '@/components/icons';
import { ContextSwitcher } from './ContextSwitcher';
import {
  NavDashboardIcon,
  NavKanbanIcon,
  NavBacklogIcon,
  NavWorkIcon,
  NavFiltersIcon,
  NavTimelineIcon,
} from '@/lib/nav-icons';
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
    badge: product.code,
    label: product.name,
    badgeProjectKey: product.code,
    badgeProjectAvatarUrl: getProductAvatarUrl(product.code),
    badgeProjectColor: product.color,
    sections: [
      {
        title: '',
        items: [
          { id: 'dashboard', title: 'Dashboard', path: `${base}/dashboard`, icon: NavDashboardIcon, exact: false },
          { id: 'boards',    title: 'Board',     path: `${base}/boards`,    icon: NavKanbanIcon,    exact: false },
          { id: 'backlog',   title: 'Backlog',   path: `${base}/backlog`,   icon: NavBacklogIcon,   exact: false },
          { id: 'allwork',   title: 'Work',      path: `${base}/allwork`,   icon: NavWorkIcon,      exact: false },
          { id: 'filters',   title: 'Filters',   path: `${base}/filters`,   icon: NavFiltersIcon,   exact: false },
          { id: 'timeline',  title: 'Timeline',  path: `${base}/timeline`,  icon: NavTimelineIcon,  exact: false },
          { id: 'dependencies', title: 'Dependencies', path: `${base}/dependencies`, icon: Link2, exact: false },
          { id: 'milestones', title: 'Milestones', path: `${base}/milestones`, icon: List, exact: false },
          /* 2026-06-15: Standups sidebar item retired. Reachable from the
             board's kebab menu → "Standup history". */
        ],
      },
    ],
    footerItem: {
      id: 'settings', title: 'Settings', path: `${base}/settings`, icon: Settings, exact: true,
    },
  };
}


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

  // Global /product-hub/products page: no sidebar — navigation handled by
  // the top-nav context switcher. Only render for per-product routes.
  if (!productCode) return null;

  // While per-product query is still loading, render nothing (avoids
  // flashing the generic "All Products" config before the real nav appears).
  if (!scopedProduct) return null;

  const config: SidebarConfig = buildPerProductConfig(scopedProduct);
  const isScoped = !!productCode && !!scopedProduct;

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      renderHeaderSwitcher={isScoped ? (exp) => <ContextSwitcher variant="sidebar" expanded={exp} /> : undefined}
    />
  );
}
