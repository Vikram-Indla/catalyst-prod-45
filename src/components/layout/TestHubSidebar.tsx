/**
 * TestHubSidebar — Test Management sidebar
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CheckSquare,
  FileText,
  AlertTriangle,
  GitMerge,
  RefreshCw,
  FolderOpen,
  Layers,
} from '@/lib/atlaskit-icons';
import {
  NavDashboardIcon,
} from '@/lib/nav-icons';
import { HUB_ICON_REGISTRY } from '@/components/icons';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface TestHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

// Old flat-path segments that appear after /testhub/ — not a projectKey
const TESTHUB_SECTION_SEGMENTS = new Set([
  'dashboard', 'my-work', 'repository', 'cycles', 'sets',
  'defects', 'traceability', 'reports',
]);

function extractTestHubProjectKey(pathname: string): string {
  const match = pathname.match(/^\/testhub\/([^/]+)/);
  if (match && !TESTHUB_SECTION_SEGMENTS.has(match[1])) return match[1];
  return 'BAU';
}

export function TestHubSidebar({ expanded, onToggle, className }: TestHubSidebarProps) {
  const { pathname } = useLocation();
  const pk = extractTestHubProjectKey(pathname);

  const sections: SidebarSection[] = useMemo(() => [{
    title: '',
    items: [
      { id: 'dashboard',    title: 'Dashboard',    path: `/testhub/${pk}/dashboard`,     icon: NavDashboardIcon, exact: false },
      { id: 'my-work',      title: 'My Work',      path: `/testhub/${pk}/my-work`,       icon: CheckSquare,      exact: false },
      { id: 'repository',   title: 'Repository',   path: `/testhub/${pk}/repository`,    icon: FolderOpen,       exact: false },
      { id: 'sets',         title: 'Test Sets',    path: `/testhub/${pk}/sets`,          icon: Layers,           exact: false },
      { id: 'cycles',       title: 'Cycles',       path: `/testhub/${pk}/cycles`,        icon: RefreshCw,        exact: false },
      { id: 'defects',      title: 'Defects',      path: `/testhub/${pk}/defects`,       icon: AlertTriangle,    exact: false },
      { id: 'traceability', title: 'Traceability', path: `/testhub/${pk}/traceability`,  icon: GitMerge,         exact: false },
      { id: 'reports',      title: 'Reports',      path: `/testhub/${pk}/reports`,       icon: FileText,         exact: false },
    ],
  }], [pk]);

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
