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
    sections: [
      {
        title: 'Product Hub',
        items: [
          { id: 'backlog', title: 'Product Backlog', path: '/producthub/backlog', icon: ClipboardList, exact: true },
          { id: 'kanban', title: 'Product Kanban', path: '/producthub/kanban', icon: Columns3, exact: true },
          { id: 'roadmap', title: 'Product Roadmap', path: '/producthub/roadmaps', icon: GanttChart, exact: false },
          { id: 'cards', title: 'Product Cards', path: '/producthub/cards', icon: LayoutGrid, exact: true },
        ],
      },
      {
        title: 'Ideation',
        items: [
          { id: 'idea-backlog', title: 'Ideas Backlog', path: '/producthub/ideation', icon: Lightbulb, exact: true, badge: 15 },
          { id: 'idea-board', title: 'Ideas Board', path: '/producthub/ideation?view=board', icon: Columns, exact: true },
          { id: 'ideas-roadmap', title: 'Ideas Roadmap', path: '/product/ideas/roadmap', icon: LayoutPanelLeft, exact: true },
          { id: 'innovation-drives', title: 'Ideas Themes', path: '/producthub/ideation?view=drives', icon: Rocket, exact: true },
          { id: 'ideation-analytics', title: 'Ideas Analytics', path: '/producthub/ideation?view=analytics', icon: BarChart3, exact: true },
        ],
      },
      {
        title: 'Intelligence',
        items: [
          { id: 'req-assist-pipeline', title: 'Req Assist™', path: '/product/req-assist', icon: FileText, exact: false, textBadge: 'AI' },
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
