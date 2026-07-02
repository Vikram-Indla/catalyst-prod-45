/**
 * TestHubSidebar — Test Management sidebar
 */

import {
  CheckSquare,
  FileText,
  AlertTriangle,
  GitMerge,
  RefreshCw,
  FolderOpen,
  Layers,
  Link2,
} from '@/lib/atlaskit-icons';
import {
  NavDashboardIcon,
  NavKanbanIcon,
  NavFiltersIcon,
  NavTimelineIcon,
} from '@/lib/nav-icons';
import { HUB_ICON_REGISTRY } from '@/components/icons';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface TestHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const sections: SidebarSection[] = [
  {
    title: '',
    items: [
      { id: 'dashboard',    title: 'Dashboard',    path: '/testhub/dashboard',     icon: NavDashboardIcon, exact: false },
      { id: 'board',        title: 'Board',        path: '/testhub/board',         icon: NavKanbanIcon,    exact: false },
      { id: 'my-work',      title: 'My Work',      path: '/testhub/my-work',       icon: CheckSquare,      exact: false },
      { id: 'filters',      title: 'Filters',      path: '/testhub/filters',       icon: NavFiltersIcon,   exact: false },
      { id: 'repository',   title: 'Repository',   path: '/testhub/repository',    icon: FolderOpen,       exact: false },
      { id: 'sets',         title: 'Test Sets',    path: '/testhub/sets',          icon: Layers,           exact: false },
      { id: 'cycles',       title: 'Cycles',       path: '/testhub/cycles',        icon: RefreshCw,        exact: false },
      { id: 'timeline',     title: 'Timeline',     path: '/testhub/timeline',      icon: NavTimelineIcon,  exact: false },
      { id: 'dependencies', title: 'Dependencies', path: '/testhub/dependencies',  icon: Link2,            exact: false },
      { id: 'defects',      title: 'Defects',      path: '/testhub/defects',       icon: AlertTriangle,    exact: false },
      { id: 'traceability', title: 'Traceability', path: '/testhub/traceability',  icon: GitMerge,         exact: false },
      { id: 'reports-lab',  title: 'Reports Lab',  path: '/testhub/reports-lab',  icon: FileText,         exact: false },
    ],
  },
];

export function TestHubSidebar({ expanded, onToggle, className }: TestHubSidebarProps) {
  const config: SidebarConfig = {
    badge: 'TH',
    label: 'Test Hub',
    badgeHubIconUrl: HUB_ICON_REGISTRY['test'],
    sections,
  };

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
