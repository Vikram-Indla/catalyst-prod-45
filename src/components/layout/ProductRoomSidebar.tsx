/**
 * ProductRoomSidebar — Product module sidebar using SidebarBase
 * 
 * Refactored to use the shared SidebarBase component for consistent
 * styling, density, text, font size, and contrast across all hubs.
 */

import { 
  ClipboardList,
  Columns3,
  GanttChart,
  LayoutGrid,
  Zap,
  Lightbulb,
  Columns,
  ScatterChart,
  BarChart3,
  Rocket,
  FileText,
  LayoutPanelLeft,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface ProductRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ProductRoomSidebar({ expanded, onToggle, className }: ProductRoomSidebarProps) {

  const productSidebarConfig: SidebarConfig = {
    badge: 'PH',
    label: 'Product Hub',
    // Design critique (2026-04-19):
    //   - Dropped "Product Hub" section label — tautological with the hub
    //     badge ("PH / Product Hub") already shown above it.
    //   - Collapsed single-item "Intelligence" group; Req Assist™ moves into
    //     the top list as the last item, keeping its AI textBadge so it's
    //     still visually distinct.
    //   - "Ideas Theme" → "Ideas Themes" (naming parallel with peers:
    //     Backlog, Board, Roadmap, Analytics — all plural/abstract).
    //   - Prefixes retained on both groups because the top group is
    //     unlabeled and collides with Ideation's "Backlog/Board/Roadmap"
    //     otherwise. When the top group gets a non-tautological label in a
    //     future pass, strip the prefixes then.
    sections: [
      {
        title: '',
        items: [
          { id: 'backlog', title: 'Product Backlog', path: '/producthub/backlog', icon: ClipboardList, exact: true },
          { id: 'kanban', title: 'Product Kanban', path: '/producthub/kanban', icon: Columns3, exact: true },
          { id: 'roadmap', title: 'Product Roadmap', path: '/producthub/roadmaps', icon: GanttChart, exact: false },
          { id: 'cards', title: 'Product Cards', path: '/producthub/cards', icon: LayoutGrid, exact: true },
          { id: 'req-assist-pipeline', title: 'Req Assist™', path: '/product/req-assist', icon: FileText, exact: false, textBadge: 'AI' },
        ],
      },
      {
        title: 'Ideation',
        items: [
          { id: 'idea-backlog', title: 'Ideas Backlog', path: '/product/ideas/backlog', icon: Lightbulb, exact: true },
          { id: 'idea-board', title: 'Ideas Board', path: '/product/ideas/board', icon: Columns, exact: true },
          { id: 'ideas-roadmap', title: 'Ideas Roadmap', path: '/product/ideas/roadmap-new', icon: LayoutPanelLeft, exact: true },
          { id: 'ideas-themes', title: 'Ideas Themes', path: '/product/ideas/themes', icon: Rocket, exact: true },
          { id: 'ideation-analytics', title: 'Ideas Analytics', path: '/product/ideas/analytics', icon: BarChart3, exact: true },
        ],
      },
    ],
    footerItem: undefined,
  };

  return (
    <SidebarBase
      config={productSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
